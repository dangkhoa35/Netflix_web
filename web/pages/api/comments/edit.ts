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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const authResult = await serverAuth(req, res);
    if (!authResult) {
      return;
    }
    const { currentUser } = authResult;

    const { commentId, content } = req.body;

    // Validation
    if (!commentId || !content) {
      return res.status(400).json({ error: 'Missing required fields: commentId, content' });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Comment content must be 1000 characters or less' });
    }

    const db = getPrisma();

    // Check if comment exists and belongs to user
    const comment = await db.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId !== currentUser.id) {
      return res.status(403).json({ error: 'You can only edit your own comments' });
    }

    // Update comment
    const updatedComment = await db.comment.update({
      where: { id: commentId },
      data: { 
        content: content.trim(),
        updatedAt: new Date()
      }
    });

    return res.status(200).json({
      ...updatedComment,
      message: 'Comment updated successfully'
    });
  } catch (error: any) {
    console.error('Error editing comment:', error);
    return res.status(500).json({ error: 'Failed to edit comment' });
  }
}
