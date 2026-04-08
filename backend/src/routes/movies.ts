import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { sendDbError } from '../utils/dbError';

const router = Router();
const EVENTS_COLLECTION = 'movie_engagement_events';
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const ALLOWED_SORT_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'title',
  'releaseDate',
  'duration',
  'code',
  'status',
]);

const isValidObjectId = (value: unknown): value is string => (
  typeof value === 'string' && OBJECT_ID_REGEX.test(value)
);

const ensureObjectIdParam = (res: Response, value: unknown, name = 'id') => {
  if (isValidObjectId(value)) return true;
  res.status(400).json({ error: `Invalid ${name}` });
  return false;
};

async function readAggregate(pipeline: Record<string, unknown>[]) {
  try {
    const result = await (prisma as any).$runCommandRaw({
      aggregate: EVENTS_COLLECTION,
      pipeline,
      cursor: {},
    });
    const rows = result?.cursor?.firstBatch;
    return Array.isArray(rows) ? rows : [];
  } catch (error: any) {
    const message = String(error?.message || '');
    if (message.includes('NamespaceNotFound') || message.includes('ns not found')) {
      return [];
    }
    throw error;
  }
}

async function getViewCountsByMovieIds(movieIds: string[]): Promise<Map<string, number>> {
  const uniqueMovieIds = Array.from(new Set(
    movieIds
      .map((id) => String(id || '').trim())
      .filter(Boolean),
  ));

  if (!uniqueMovieIds.length) return new Map();

  const rows = await readAggregate([
    {
      $match: {
        eventType: 'view',
        movieId: { $in: uniqueMovieIds },
      },
    },
    {
      $group: {
        _id: '$movieId',
        total: { $sum: 1 },
      },
    },
  ]);

  const viewCountByMovieId = new Map<string, number>();
  for (const row of rows as any[]) {
    const movieId = String(row?._id || '');
    if (!movieId) continue;
    viewCountByMovieId.set(movieId, Math.max(0, Number(row?.total || 0)));
  }

  for (const movieId of uniqueMovieIds) {
    if (!viewCountByMovieId.has(movieId)) {
      viewCountByMovieId.set(movieId, 0);
    }
  }

  return viewCountByMovieId;
}

// Helper: add backward-compatible genre field + image aliases
function withGenre(movie: any, rawViewCount = 0) {
  const viewCount = Math.max(0, Math.floor(Number(rawViewCount) || 0));
  return {
    ...movie,
    genre: (movie.categories || []).join(', '),
    duration: String(movie.duration),
    viewCount,
    views: viewCount,
    view_count: viewCount,
    // backward compat: populate old fields from imageUrl
    posterUrl: movie.imageUrl || movie.posterUrl,
    backdropUrl: movie.imageUrl || movie.backdropUrl,
    thumbnailUrl: movie.imageUrl || movie.thumbnailUrl,
  };
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')   // Remove leading dashes
    .replace(/-+$/, '')   // Remove trailing dashes
    .trim();
}

/**
 * @swagger
 * /api/movies:
 *   get:
 *     summary: Get all movies (paginated)
 *     tags: [Movies]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [all, draft, published, hidden] }
 *         description: Defaults to published when omitted. Use all for admin listing.
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: ageRating
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: createdAt }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Paginated list of movies
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedMovies'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    // Default to published movies. Admin can pass status=all to disable status filter.
    const where: any = {};
    const statusQuery = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    if (!statusQuery) {
      where.status = 'published';
    } else if (statusQuery !== 'all') {
      where.status = statusQuery;
    }
    if (req.query.category) {
      where.categories = { has: req.query.category as string };
    }
    if (req.query.ageRating) {
      where.ageRating = req.query.ageRating;
    }
    if (req.query.search) {
      where.title = { contains: req.query.search as string, mode: 'insensitive' };
    }

    const requestedSortField = String(req.query.sort || '').trim();
    const sortField = ALLOWED_SORT_FIELDS.has(requestedSortField) ? requestedSortField : 'createdAt';
    const sortOrder = (req.query.order as string) === 'asc' ? 'asc' : 'desc';

    const [movies, total] = await Promise.all([
      prisma.movie.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortField]: sortOrder },
      }),
      prisma.movie.count({ where }),
    ]);
    const viewCountByMovieId = await getViewCountsByMovieIds(movies.map((movie) => movie.id));

    res.json({
      data: movies.map((movie) => withGenre(movie, viewCountByMovieId.get(movie.id) || 0)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/movies error:', error);
    return sendDbError(res, error);
  }
});

/**
 * @swagger
 * /api/movies/random:
 *   get:
 *     summary: Get a random published movie
 *     tags: [Movies]
 *     responses:
 *       200:
 *         description: A random movie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Movie'
 */
router.get('/random', async (_req: Request, res: Response) => {
  try {
    const count = await prisma.movie.count({ where: { status: 'published' } });
    if (count === 0) return res.status(404).json({ error: 'No movies found' });

    const skip = Math.floor(Math.random() * count);
    const movies = await prisma.movie.findMany({
      where: { status: 'published' },
      take: 1,
      skip,
    });
    const selectedMovie = movies[0];
    if (!selectedMovie) return res.status(404).json({ error: 'No movies found' });
    const viewCountByMovieId = await getViewCountsByMovieIds([selectedMovie.id]);

    res.json(withGenre(selectedMovie, viewCountByMovieId.get(selectedMovie.id) || 0));
  } catch (error) {
    console.error('GET /api/movies/random error:', error);
    return sendDbError(res, error);
  }
});

/**
 * @swagger
 * /api/movies/search:
 *   get:
 *     summary: Search movies by title
 *     tags: [Movies]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    if (!q.trim()) return res.json([]);

    const movies = await prisma.movie.findMany({
      where: {
        status: 'published',
        title: { contains: q, mode: 'insensitive' },
      },
      take: 20,
      orderBy: { title: 'asc' },
    });
    const viewCountByMovieId = await getViewCountsByMovieIds(movies.map((movie) => movie.id));

    res.json(movies.map((movie) => withGenre(movie, viewCountByMovieId.get(movie.id) || 0)));
  } catch (error) {
    console.error('GET /api/movies/search error:', error);
    return sendDbError(res, error);
  }
});

/**
 * @swagger
 * /api/movies/check-slug:
 *   get:
 *     summary: Check if a slug is available
 *     tags: [Movies]
 *     parameters:
 *       - in: query
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: excludeId
 *         required: false
 *         schema:
 *           type: string
 *         description: Exclude this movie id when checking (useful for edit form)
 *     responses:
 *       200:
 *         description: Slug availability result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 *                 slug:
 *                   type: string
 */
router.get('/check-slug', async (req: Request, res: Response) => {
  try {
    const slug = (req.query.slug as string) || '';
    const excludeId = req.query.excludeId as string;
    if (!slug) return res.json({ available: false });

    const where: any = { slug };
    if (excludeId && isValidObjectId(excludeId)) where.id = { not: excludeId };

    const existing = await prisma.movie.findFirst({ where });
    res.json({ available: !existing, slug });
  } catch (error) {
    return sendDbError(res, error);
  }
});

/**
 * @swagger
 * /api/movies/check-duplicate:
 *   get:
 *     summary: Check duplicate movie by title and optional release year
 *     tags: [Movies]
 *     parameters:
 *       - in: query
 *         name: title
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: year
 *         required: false
 *         schema:
 *           type: string
 *         description: Release year to narrow duplicate check
 *       - in: query
 *         name: excludeId
 *         required: false
 *         schema:
 *           type: string
 *         description: Exclude this movie id when checking (useful for edit form)
 *     responses:
 *       200:
 *         description: Duplicate check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 duplicate:
 *                   type: boolean
 *                 movie:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     code:
 *                       type: string
 */
router.get('/check-duplicate', async (req: Request, res: Response) => {
  try {
    const title = (req.query.title as string) || '';
    const year = req.query.year as string;
    const excludeId = req.query.excludeId as string;
    if (!title) return res.json({ duplicate: false });

    const where: any = {
      title: { equals: title, mode: 'insensitive' },
    };
    if (excludeId && isValidObjectId(excludeId)) where.id = { not: excludeId };
    if (year) {
      if (!/^\d{4}$/.test(year)) {
        return res.status(400).json({ error: 'year must be YYYY' });
      }
      const start = new Date(`${year}-01-01`);
      const end = new Date(`${parseInt(year) + 1}-01-01`);
      where.releaseDate = { gte: start, lt: end };
    }

    const existing = await prisma.movie.findFirst({ where });
    res.json({ duplicate: !!existing, movie: existing ? { id: existing.id, title: existing.title, code: existing.code } : null });
  } catch (error) {
    return sendDbError(res, error);
  }
});

/**
 * @swagger
 * /api/movies/{id}:
 *   get:
 *     summary: Get movie by ID
 *     tags: [Movies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Movie details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Movie'
 *       404:
 *         description: Not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!ensureObjectIdParam(res, req.params.id)) return;

    const movie = await prisma.movie.findUnique({
      where: { id: req.params.id },
    });
    if (!movie) return res.status(404).json({ error: 'Movie not found' });
    const viewCountByMovieId = await getViewCountsByMovieIds([movie.id]);
    res.json(withGenre(movie, viewCountByMovieId.get(movie.id) || 0));
  } catch (error) {
    console.error('GET /api/movies/:id error:', error);
    return sendDbError(res, error);
  }
});

/**
 * @swagger
 * /api/movies:
 *   post:
 *     summary: Create a new movie
 *     tags: [Movies]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MovieCreateInput'
 *     responses:
 *       201:
 *         description: Created movie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Movie'
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, posterUrl, backdropUrl, thumbnailUrl, ...rest } = req.body;
    
    // Trim inputs
    const trimmedTitle = (title || '').trim();
    const trimmedDesc = (description || '').trim();
    
    if (!trimmedTitle || !trimmedDesc) {
      return res.status(400).json({ error: 'title and description are required' });
    }
    if (trimmedTitle.length > 150) {
      return res.status(400).json({ error: 'Tên phim tối đa 150 ký tự' });
    }
    if (trimmedDesc.length > 5000) {
      return res.status(400).json({ error: 'Mô tả tối đa 5000 ký tự' });
    }

    // Tags limit
    if (rest.tags && rest.tags.length > 10) {
      return res.status(400).json({ error: 'Tối đa 10 tags' });
    }
    if (rest.cast && rest.cast.length > 20) {
      return res.status(400).json({ error: 'Tối đa 20 diễn viên' });
    }

    // Validate published status requires certain fields
    if (rest.status === 'published') {
      const missing: string[] = [];
      if (!rest.imageUrl && !posterUrl && !backdropUrl && !thumbnailUrl) missing.push('ảnh phim');
      if (!rest.videoUrl && !rest.trailerUrl) missing.push('video hoặc trailer');
      if (!rest.duration && rest.duration !== 0) missing.push('thời lượng');
      if (!rest.categories || rest.categories.length === 0) missing.push('thể loại');
      if (missing.length > 0) {
        return res.status(400).json({ error: `Xuất bản cần: ${missing.join(', ')}` });
      }
    }

    // Auto-generate code
    const lastMovie = await prisma.movie.findFirst({ orderBy: { code: 'desc' } });
    let nextNum = 1;
    if (lastMovie?.code) {
      const match = lastMovie.code.match(/MOV-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const code = `MOV-${String(nextNum).padStart(4, '0')}`;

    // Auto-generate slug
    let slug = rest.slug ? rest.slug.trim() : toSlug(trimmedTitle);
    // Clean up slug
    slug = slug.replace(/^-+/, '').replace(/-+$/, '');
    if (!slug) slug = toSlug(trimmedTitle);
    
    // Make slug unique
    let baseSlug = slug;
    let suffix = 2;
    while (await prisma.movie.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    // Map old image fields to imageUrl for backward compat
    const imageUrl = rest.imageUrl || posterUrl || backdropUrl || thumbnailUrl;

    const movie = await prisma.movie.create({
      data: {
        code,
        title: trimmedTitle,
        slug,
        description: trimmedDesc,
        duration: parseInt(rest.duration) || 0,
        releaseDate: rest.releaseDate ? new Date(rest.releaseDate) : undefined,
        imageUrl: imageUrl || undefined,
        videoUrl: rest.videoUrl || undefined,
        trailerUrl: rest.trailerUrl || undefined,
        categories: Array.isArray(rest.categories) ? rest.categories : [],
        cast: Array.isArray(rest.cast) ? rest.cast : [],
        tags: Array.isArray(rest.tags) ? rest.tags : [],
        language: Array.isArray(rest.language) ? rest.language : [],
        subtitles: Array.isArray(rest.subtitles) ? rest.subtitles : [],
        studio: rest.studio || undefined,
        director: rest.director || undefined,
        ageRating: rest.ageRating || undefined,
        status: rest.status || 'draft',
      },
    });

    res.status(201).json(withGenre(movie));
  } catch (error) {
    console.error('POST /api/movies error:', error);
    return sendDbError(res, error);
  }
});

/**
 * @swagger
 * /api/movies/{id}:
 *   patch:
 *     summary: Update a movie
 *     tags: [Movies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MovieCreateInput'
 *     responses:
 *       200:
 *         description: Updated movie
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    if (!ensureObjectIdParam(res, req.params.id)) return;

    const existing = await prisma.movie.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Movie not found' });

    const { posterUrl, backdropUrl, thumbnailUrl, ...body } = req.body;
    const updateData: any = { ...body };
    
    // Trim text fields
    if (updateData.title) {
      updateData.title = updateData.title.trim();
      if (updateData.title.length > 150) {
        return res.status(400).json({ error: 'Tên phim tối đa 150 ký tự' });
      }
    }
    if (updateData.description) {
      updateData.description = updateData.description.trim();
      if (updateData.description.length > 5000) {
        return res.status(400).json({ error: 'Mô tả tối đa 5000 ký tự' });
      }
    }
    if (updateData.tags && updateData.tags.length > 10) {
      return res.status(400).json({ error: 'Tối đa 10 tags' });
    }
    if (updateData.cast && updateData.cast.length > 20) {
      return res.status(400).json({ error: 'Tối đa 20 diễn viên' });
    }

    // Map old image fields
    if (posterUrl || backdropUrl || thumbnailUrl) {
      updateData.imageUrl = posterUrl || backdropUrl || thumbnailUrl;
    }

    if (updateData.duration !== undefined) {
      updateData.duration = parseInt(updateData.duration) || 0;
    }
    if (updateData.releaseDate) {
      updateData.releaseDate = new Date(updateData.releaseDate);
    }

    // Update slug if title changed
    if (updateData.title && updateData.title !== existing.title) {
      updateData.slug = updateData.slug || toSlug(updateData.title);
      updateData.slug = updateData.slug.replace(/^-+/, '').replace(/-+$/, '');
      
      let baseSlug = updateData.slug;
      let suffix = 2;
      let slugToCheck = updateData.slug;
      while (true) {
        const existingSlug = await prisma.movie.findFirst({
          where: { slug: slugToCheck, id: { not: req.params.id } },
        });
        if (!existingSlug) break;
        slugToCheck = `${baseSlug}-${suffix}`;
        suffix++;
      }
      updateData.slug = slugToCheck;
    }

    // Validate published status
    if (updateData.status === 'published') {
      const merged = { ...existing, ...updateData };
      const missing: string[] = [];
      if (!merged.imageUrl) missing.push('ảnh phim');
      if (!merged.videoUrl && !merged.trailerUrl) missing.push('video hoặc trailer');
      if (!merged.duration) missing.push('thời lượng');
      if (!merged.categories || merged.categories.length === 0) missing.push('thể loại');
      if (missing.length > 0) {
        return res.status(400).json({ error: `Xuất bản cần: ${missing.join(', ')}` });
      }
    }

    const movie = await prisma.movie.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json(withGenre(movie));
  } catch (error) {
    console.error('PATCH /api/movies/:id error:', error);
    return sendDbError(res, error);
  }
});

/**
 * @swagger
 * /api/movies/{id}:
 *   delete:
 *     summary: Soft delete a movie (set status to hidden)
 *     tags: [Movies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Movie hidden
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!ensureObjectIdParam(res, req.params.id)) return;

    const existing = await prisma.movie.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Movie not found' });

    const movie = await prisma.movie.update({
      where: { id: req.params.id },
      data: { status: 'hidden' },
    });
    res.json({ message: 'Movie hidden', movie: withGenre(movie) });
  } catch (error) {
    console.error('DELETE /api/movies/:id error:', error);
    return sendDbError(res, error);
  }
});

/**
 * @swagger
 * /api/movies/{id}/status:
 *   patch:
 *     summary: Update movie status
 *     tags: [Movies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, published, hidden]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    if (!ensureObjectIdParam(res, req.params.id)) return;

    const { status } = req.body;
    if (!['draft', 'published', 'hidden'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be draft, published, or hidden' });
    }

    const existing = await prisma.movie.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Movie not found' });

    const movie = await prisma.movie.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json(withGenre(movie));
  } catch (error) {
    console.error('PATCH /api/movies/:id/status error:', error);
    return sendDbError(res, error);
  }
});

export default router;
