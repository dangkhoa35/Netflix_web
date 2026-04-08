import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { sendDbError } from '../utils/dbError';

const router = Router();
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const isValidObjectId = (value: unknown): value is string => (
  typeof value === 'string' && OBJECT_ID_REGEX.test(value)
);

type CommentStatus = 'all' | 'pending' | 'approved' | 'rejected';

const toStatus = (raw: unknown): CommentStatus => {
  const value = String(raw || 'all').trim().toLowerCase();
  if (value === 'pending' || value === 'approved' || value === 'rejected') return value;
  return 'all';
};

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
    const skip = (page - 1) * limit;
    const status = toStatus(req.query.status);
    const search = String(req.query.search || '').trim();

    const where: any = {};
    if (status !== 'all') where.status = status;
    if (search) {
      where.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { userName: { contains: search, mode: 'insensitive' } },
        { userEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [comments, total, allCount, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.comment.findMany({
        where,
        include: {
          movie: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.comment.count({ where }),
      prisma.comment.count(),
      prisma.comment.count({ where: { status: 'pending' } }),
      prisma.comment.count({ where: { status: 'approved' } }),
      prisma.comment.count({ where: { status: 'rejected' } }),
    ]);

    return res.json({
      comments: comments.map((comment) => ({
        ...comment,
        userName: comment.userName || 'Anonymous',
        userEmail: comment.userEmail || '',
        userAvatar: '',
      })),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      stats: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        all: allCount,
      },
    });
  } catch (error) {
    console.error('GET /api/comments/admin error:', error);
    return sendDbError(res, error);
  }
});

router.patch('/', async (req: Request, res: Response) => {
  try {
    const id = String((req.body as { id?: string })?.id || '').trim();
    if (!id) {
      return res.status(400).json({ error: 'Comment ID is required' });
    }
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid comment id' });
    }

    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: { status: 'approved' },
    });

    return res.json({
      ...updated,
      message: 'Comment approved successfully',
    });
  } catch (error) {
    console.error('PATCH /api/comments/admin error:', error);
    return sendDbError(res, error);
  }
});

router.delete('/', async (req: Request, res: Response) => {
  try {
    const id = String(req.query.id || '').trim();
    if (!id) {
      return res.status(400).json({ error: 'Comment ID is required' });
    }
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid comment id' });
    }

    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const hardDelete = req.query.hard === '1' || req.query.hard === 'true';
    if (hardDelete) {
      await prisma.comment.delete({
        where: { id },
      });

      return res.json({
        id,
        message: 'Comment deleted permanently',
      });
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: { status: 'rejected' },
    });

    return res.json({
      ...updated,
      message: 'Comment rejected successfully',
    });
  } catch (error) {
    console.error('DELETE /api/comments/admin error:', error);
    return sendDbError(res, error);
  }
});

export default router;
