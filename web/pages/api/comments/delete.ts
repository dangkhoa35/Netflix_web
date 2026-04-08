import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../libs/prismadb';
import serverAuth from '../../../libs/serverAuth';
import { isAdminEmail } from '../../../libs/adminAuth';

// Type assertion to handle Prisma client
const getPrisma = () => {
  if (!prisma) {
    throw new Error('Prisma client not initialized');
  }
  return prisma as any;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const authResult = await serverAuth(req, res);
    if (!authResult) {
      return;
    }
    const { currentUser } = authResult;

    const { commentId } = req.query;

    // Validation
    if (!commentId || typeof commentId !== 'string') {
      return res.status(400).json({ error: 'Comment ID is required' });
    }

    const db = getPrisma();

    // Check if comment exists
    const comment = await db.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Bình luận không tìm thấy' });
    }

    // Check permissions: owner or admin can delete
    const isOwner = comment.userId === currentUser.id;
    const isAdmin = isAdminEmail(currentUser.email);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa bình luận này' });
    }

    // Delete comment and all its replies
    await db.comment.deleteMany({
      where: {
        OR: [
          { id: commentId },
          { parentId: commentId }
        ]
      }
    });

    return res.status(200).json({ 
      message: 'Xóa bình luận thành công' 
    });
  } catch (error: any) {
    console.error('Error deleting comment:', error);
    return res.status(500).json({ error: 'Xóa bình luận không thành công' });
  }
}
