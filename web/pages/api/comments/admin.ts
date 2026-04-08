import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/libs/prismadb';
import { verifyAdminAccess } from '@/libs/adminVerify';

const setCors = (req: NextApiRequest, res: NextApiResponse) => {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
};

const getPrisma = () => {
  if (!prisma) {
    throw new Error('Prisma client not initialized');
  }
  return prisma as any;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const admin = await verifyAdminAccess(req, res);
    if (!admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const db = getPrisma();

    if (req.method === 'GET') {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;
      const status = (req.query.status as string) || 'all';

      const whereClause: any = {
        // Only get main comments (no parent), replies are fetched separately
        parentId: null,
      };
      
      if (status !== 'all') {
        whereClause.status = status;
      }

      try {
        const [comments, total, allCount, pendingCount, approvedCount, rejectedCount] = await Promise.all([
          db.comment.findMany({
            where: whereClause,
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
          db.comment.count({ where: whereClause }),
          db.comment.count({ where: { parentId: null } }),
          db.comment.count({ where: { status: 'pending', parentId: null } }),
          db.comment.count({ where: { status: 'approved', parentId: null } }),
          db.comment.count({ where: { status: 'rejected', parentId: null } }),
        ]);

        const transformedComments = comments.map((comment: any) => ({
          ...comment,
          userName: comment.userName || 'Anonymous',
          userEmail: comment.userEmail || '',
          userAvatar: comment.userAvatar || '',
        }));

        return res.json({
          comments: transformedComments,
          total,
          page,
          totalPages: Math.ceil(total / limit),
          stats: {
            pending: pendingCount,
            approved: approvedCount,
            rejected: rejectedCount,
            all: allCount,
          },
        });
      } catch (dbError) {
        console.error('Database error in GET /api/comments/admin:', dbError);
        return res.status(500).json({ 
          error: 'Failed to fetch comments',
          message: dbError instanceof Error ? dbError.message : 'Unknown error'
        });
      }
    }

    if (req.method === 'PATCH') {
      const { id, action } = req.body as { id?: string; action?: 'approve' | 'reject' };

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Comment ID is required' });
      }

      if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action. Must be "approve" or "reject"' });
      }

      const comment = await db.comment.findUnique({ where: { id } });
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      
      // Update main comment
      const updatedComment = await db.comment.update({
        where: { id },
        data: { status: newStatus },
      });

      // If this is a main comment (no parent), also update all replies
      if (!comment.parentId) {
        console.log(`Updating replies of comment ${id} to status: ${newStatus}`);
        await db.comment.updateMany({
          where: { parentId: id },
          data: { status: newStatus },
        });
      }

      return res.json({
        ...updatedComment,
        message: `Comment ${action}ed successfully${!comment.parentId ? ' (including replies)' : ''}`,
      });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Comment ID is required' });
      }

      const comment = await db.comment.findUnique({ where: { id } });
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      const hardDelete = req.query.hard === '1' || req.query.hard === 'true';

      if (hardDelete) {
        await db.comment.deleteMany({
          where: {
            OR: [
              { id },
              { parentId: id },
            ],
          },
        });

        return res.json({
          id,
          message: 'Comment and replies deleted permanently',
        });
      }

      // Soft delete (reject) - also reject all replies of this main comment
      const updated = await db.comment.update({
        where: { id },
        data: { status: 'rejected' },
      });

      // Reject all replies if this is a main comment
      if (!comment.parentId) {
        await db.comment.updateMany({
          where: { parentId: id },
          data: { status: 'rejected' },
        });
      }

      return res.json({
        ...updated,
        message: `Comment rejected${!comment.parentId ? ' (including replies)' : ''} successfully`,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in admin comments API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
