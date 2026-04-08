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
    // Authenticate user
    const authResult = await serverAuth(req, res);
    if (!authResult) {
      return; // serverAuth already sent error response
    }
    const { currentUser } = authResult;

    const { content, movieId } = req.body;

    // Validation
    if (!content || !movieId) {
      return res.status(400).json({ error: 'Missing required fields: content, movieId' });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Comment content must be 1000 characters or less' });
    }

    const db = getPrisma();

    // Ensure movie exists before creating comment
    const movie = await db.movie.findUnique({
      where: { id: movieId }
    });
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    // Create comment with pending status - admin must approve before it shows on web
    const comment = await db.comment.create({
      data: {
        content: content.trim(),
        movieId,
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email || null,
        userAvatar: DEFAULT_AVATAR_SRC,
        status: 'pending',
        likes: 0,
        dislikes: 0,
        likedBy: [],
        dislikedBy: []
      }
    });

    console.log('Comment created successfully:', comment.id);
    return res.status(201).json({
      ...comment,
      message: 'Comment submitted successfully'
    });
  } catch (error: any) {
    console.error('Error creating comment:', error);
    
    // Provide more detailed error message
    if (error.message && error.message.includes('MongoServerError')) {
      return res.status(500).json({ error: 'Database error. Please check if MongoDB is running.' });
    }
    
    if (error.message && error.message.includes('not initialized')) {
      return res.status(500).json({ error: 'Database client error. Please run: npx prisma generate' });
    }
    
    return res.status(500).json({ error: 'Failed to create comment' });
  }
}
