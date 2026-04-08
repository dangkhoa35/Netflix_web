import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { sendDbError } from '../utils/dbError';

const router = Router();
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const isValidObjectId = (value: unknown): value is string => (
  typeof value === 'string' && OBJECT_ID_REGEX.test(value)
);

/**
 * @swagger
 * /api/comments:
 *   post:
 *     summary: Create a new comment (published immediately)
 *     tags: [Comments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content, movieId, userId, userName]
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 1000
 *                 example: "Great movie! Loved the cinematography."
 *               movieId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *               userId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439012"
 *               userName:
 *                 type: string
 *                 example: "John Doe"
 *               userEmail:
 *                 type: string
 *                 example: "john@example.com"
 *     responses:
 *       201:
 *         description: Comment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 content:
 *                   type: string
 *                 movieId:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 userName:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [pending, approved]
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Movie not found
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { content, movieId, userId, userName, userEmail } = req.body;

    // Validation
    if (!content || !movieId || !userId || !userName) {
      return res.status(400).json({ 
        error: 'Missing required fields: content, movieId, userId, userName' 
      });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Comment content must be 1000 characters or less' });
    }

    if (!isValidObjectId(movieId)) {
      return res.status(400).json({ error: 'Invalid movieId' });
    }

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Invalid userId' });
    }

    // Check if movie exists
    const movie = await prisma.movie.findUnique({
      where: { id: movieId }
    });

    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    // Publish immediately, admin can still reject/delete later
    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        movieId,
        userId,
        userName,
        userEmail: userEmail || null,
        status: 'approved'
      }
    });

    res.status(201).json({
      ...comment,
      message: 'Comment submitted successfully'
    });
  } catch (error: any) {
    console.error('Error creating comment:', error);
    return sendDbError(res, error, 'Failed to create comment');
  }
});

/**
 * @swagger
 * /api/comments/movie/{movieId}:
 *   get:
 *     summary: Get approved comments for a specific movie
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         schema:
 *           type: string
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of approved comments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comments:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *       404:
 *         description: Movie not found
 */
router.get('/movie/:movieId', async (req: Request, res: Response) => {
  try {
    const { movieId } = req.params;
    if (!isValidObjectId(movieId)) {
      return res.status(400).json({ error: 'Invalid movieId' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Check if movie exists
    const movie = await prisma.movie.findUnique({
      where: { id: movieId }
    });

    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    // Get only approved comments
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: {
          movieId,
          status: 'approved'
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.comment.count({
        where: {
          movieId,
          status: 'approved'
        }
      })
    ]);

    res.json({
      comments,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit))
    });
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return sendDbError(res, error, 'Failed to fetch comments');
  }
});

/**
 * @swagger
 * /api/comments/pending:
 *   get:
 *     summary: Get all pending comments (admin only)
 *     tags: [Comments]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of pending comments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comments:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 */
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { status: 'pending' },
        include: {
          movie: {
            select: {
              id: true,
              title: true,
              imageUrl: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.comment.count({
        where: { status: 'pending' }
      })
    ]);

    res.json({
      comments,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit))
    });
  } catch (error: any) {
    console.error('Error fetching pending comments:', error);
    return sendDbError(res, error, 'Failed to fetch pending comments');
  }
});

/**
 * @swagger
 * /api/comments/{id}/approve:
 *   patch:
 *     summary: Approve a pending comment (admin only)
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "507f1f77bcf86cd799439013"
 *     responses:
 *       200:
 *         description: Comment approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [approved]
 *                 message:
 *                   type: string
 *       404:
 *         description: Comment not found
 */
router.patch('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid comment id' });
    }

    const comment = await prisma.comment.findUnique({
      where: { id }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { status: 'approved' }
    });

    res.json({
      ...updatedComment,
      message: 'Comment approved successfully'
    });
  } catch (error: any) {
    console.error('Error approving comment:', error);
    return sendDbError(res, error, 'Failed to approve comment');
  }
});

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: Reject/delete a comment (admin only)
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "507f1f77bcf86cd799439013"
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Comment not found
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid comment id' });
    }

    const comment = await prisma.comment.findUnique({
      where: { id }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    await prisma.comment.delete({
      where: { id }
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting comment:', error);
    return sendDbError(res, error, 'Failed to delete comment');
  }
});

export default router;
