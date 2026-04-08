import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../libs/prismadb';
import serverAuth from '../../../libs/serverAuth';

// Type assertion to handle Prisma client
const getPrisma = () => {
  if (!prisma) {
    throw new Error('Prisma client not initialized');
  }
  return prisma as any;
};

const toStringArray = (value: unknown): string[] => (
  Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : []
);

const toNonNegativeInt = (value: unknown): number => {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? Math.floor(num) : 0;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authResult = await serverAuth(req, res);
    if (!authResult) {
      return;
    }
    const { currentUser } = authResult;

    const { commentId, action } = req.body; // action: 'like' or 'dislike'

    if (!commentId || !action) {
      return res.status(400).json({ error: 'Missing commentId or action' });
    }
    if (action !== 'like' && action !== 'dislike') {
      return res.status(400).json({ error: 'Invalid action. Must be like or dislike' });
    }

    const db = getPrisma();
    const comment = await db.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const userId = currentUser.id;
    let likedBy = toStringArray(comment.likedBy);
    let dislikedBy = toStringArray(comment.dislikedBy);
    let likes = toNonNegativeInt(comment.likes);
    let dislikes = toNonNegativeInt(comment.dislikes);

    if (action === 'like') {
      if (likedBy.includes(userId)) {
        // Unlike
        likedBy = likedBy.filter((id: string) => id !== userId);
        likes = Math.max(0, likes - 1);
      } else {
        // Like
        likedBy.push(userId);
        likes += 1;
        // Remove from dislike if exists
        if (dislikedBy.includes(userId)) {
          dislikedBy = dislikedBy.filter((id: string) => id !== userId);
          dislikes = Math.max(0, dislikes - 1);
        }
      }
    } else if (action === 'dislike') {
      if (dislikedBy.includes(userId)) {
        // Un-dislike
        dislikedBy = dislikedBy.filter((id: string) => id !== userId);
        dislikes = Math.max(0, dislikes - 1);
      } else {
        // Dislike
        dislikedBy.push(userId);
        dislikes += 1;
        // Remove from like if exists
        if (likedBy.includes(userId)) {
          likedBy = likedBy.filter((id: string) => id !== userId);
          likes = Math.max(0, likes - 1);
        }
      }
    }

    const updatedComment = await db.comment.update({
      where: { id: commentId },
      data: {
        likes,
        dislikes,
        likedBy,
        dislikedBy
      }
    });

    return res.json({
      ...updatedComment,
      likes: toNonNegativeInt(updatedComment.likes),
      dislikes: toNonNegativeInt(updatedComment.dislikes),
      likedBy: toStringArray(updatedComment.likedBy),
      dislikedBy: toStringArray(updatedComment.dislikedBy),
    });
  } catch (error: any) {
    console.error('Error updating comment like/dislike:', error);
    return res.status(500).json({ error: 'Failed to update' });
  }
}
