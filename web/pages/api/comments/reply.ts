import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../libs/prismadb';
import { DEFAULT_AVATAR_SRC } from '../../../libs/displayAvatar';
import serverAuth from '../../../libs/serverAuth';

// Type assertion to handle Prisma client
const getPrisma = () => {
  if (!prisma) {
    throw new Error('Prisma client not initialized');
  }
  return prisma as any;
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

    if (!currentUser || !currentUser.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { content, movieId, parentId } = req.body;

    if (!content || !movieId || !parentId) {
      return res.status(400).json({ error: 'Missing required fields: content, movieId, parentId' });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'Reply content cannot be empty' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Reply must be 1000 characters or less' });
    }

    const db = getPrisma();

    // Check if parent comment exists
    const parentComment = await db.comment.findUnique({
      where: { id: parentId }
    });

    if (!parentComment) {
      return res.status(404).json({ error: 'Parent comment not found' });
    }

    console.log(`Creating reply for parent comment ${parentId} by user ${currentUser.id}`);

    console.log(`Creating reply for parent comment ${parentId} by user ${currentUser.id}`);

    // Create reply with same status as parent comment
    // If parent is pending, reply also pending (both show together when admin approves)
    const parentStatus = parentComment.status || 'pending';
    
    const reply = await db.comment.create({
      data: {
        content: content.trim(),
        movieId,
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email || null,
        userAvatar: DEFAULT_AVATAR_SRC,
        parentId,
        status: parentStatus,
        likes: 0,
        dislikes: 0,
        likedBy: [],
        dislikedBy: []
      }
    });

    console.log(`Reply created successfully: ${reply.id} with status: ${parentStatus}`);
    return res.status(201).json(reply);
  } catch (error: any) {
    console.error('Error creating reply:', error);
    
    if (error.message?.includes('MongoServerError')) {
      return res.status(500).json({ error: 'Database error. Please check if MongoDB is running.' });
    }
    
    if (error.message?.includes('not initialized')) {
      return res.status(500).json({ error: 'Database client error. Please run: npx prisma generate' });
    }
    
    return res.status(500).json({ error: 'Failed to create reply: ' + error.message });
  }
}
