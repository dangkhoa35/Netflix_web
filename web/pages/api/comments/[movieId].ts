import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../libs/prismadb';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:5000';

const getPrisma = () => {
  if (!prisma) {
    throw new Error('Prisma client not initialized');
  }
  return prisma as any;
};

const normalizeBackendComment = (raw: any) => ({
  ...raw,
  id: String(raw?.id ?? raw?._id ?? ''),
  likes: Number(raw?.likes ?? 0),
  dislikes: Number(raw?.dislikes ?? 0),
  likedBy: Array.isArray(raw?.likedBy) ? raw.likedBy : [],
  dislikedBy: Array.isArray(raw?.dislikedBy) ? raw.dislikedBy : [],
  replies: [],
  replyCount: 0,
});

const normalizeCommentRecord = (raw: any) => ({
  ...raw,
  id: String(raw?.id ?? raw?._id ?? ''),
  likes: Number(raw?.likes ?? 0),
  dislikes: Number(raw?.dislikes ?? 0),
  likedBy: Array.isArray(raw?.likedBy) ? raw.likedBy : [],
  dislikedBy: Array.isArray(raw?.dislikedBy) ? raw.dislikedBy : [],
});

const sortComments = (comments: any[], sort: unknown) => {
  if (sort === 'oldest') {
    return [...comments].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }
  if (sort === 'top') {
    return [...comments].sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0));
  }
  return [...comments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

const fetchCommentsFromBackend = async (
  movieId: string,
  page: number,
  limit: number,
  sort: unknown
) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const response = await fetch(
    `${BACKEND_API_URL}/api/comments/movie/${encodeURIComponent(movieId)}?${params.toString()}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );
  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const commentsRaw = Array.isArray(payload?.comments) ? payload.comments : [];
  const normalized = sortComments(commentsRaw.map(normalizeBackendComment), sort);

  return {
    comments: normalized,
    total: Number(payload?.total ?? normalized.length),
    page: Number(payload?.page ?? page),
    totalPages: Number(payload?.totalPages ?? Math.ceil(normalized.length / Math.max(limit, 1))),
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { movieId, sort } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    if (!movieId || typeof movieId !== 'string') {
      return res.status(200).json({ comments: [], total: 0, page: 1, totalPages: 1 });
    }

    const db = getPrisma();

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'top') {
      orderBy = { likes: 'desc' };
    } else if (sort === 'oldest') {
      orderBy = { createdAt: 'asc' };
    }

    // Only show approved comments on web (pending comments hidden until admin approves).
    const approvedStatusWhere = { status: 'approved' };
    const whereTopLevel = {
      movieId: String(movieId),
      OR: [
        { parentId: null },
        { parentId: { isSet: false } },
      ],
      AND: [approvedStatusWhere],
    };

    const [comments, total] = await Promise.all([
      db.comment.findMany({
        where: whereTopLevel,
        orderBy,
        skip,
        take: limit,
      }),
      db.comment.count({ where: whereTopLevel }),
    ]);

    const commentsWithReplies = await Promise.all(
      comments.map(async (comment: any) => {
        const replies = await db.comment.findMany({
          where: {
            parentId: comment.id,
            AND: [approvedStatusWhere],
          },
          orderBy: { createdAt: 'asc' },
        });

        const normalizedReplies = replies.map(normalizeCommentRecord);
        const normalizedComment = normalizeCommentRecord(comment);

        return {
          ...normalizedComment,
          replies: normalizedReplies,
          replyCount: normalizedReplies.length,
        };
      })
    );

    if (commentsWithReplies.length > 0) {
      return res.json({
        comments: commentsWithReplies,
        total,
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    }

    // Fallback: comments may exist in backend DB when web DB is empty or out of sync.
    try {
      const backendPayload = await fetchCommentsFromBackend(String(movieId), page, limit, sort);
      if (backendPayload) {
        res.setHeader('x-comments-source', 'backend-fallback');
        return res.json(backendPayload);
      }
    } catch {
      // ignore fallback failure and return local empty payload
    }

    return res.json({
      comments: commentsWithReplies,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return res.status(500).json({ error: 'Failed to fetch comments' });
  }
}
