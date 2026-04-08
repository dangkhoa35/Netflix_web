import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { sendDbError } from '../utils/dbError';

const router = Router();

const EVENTS_COLLECTION = 'movie_engagement_events';
const RATINGS_COLLECTION = 'movie_ratings';

type Granularity = 'day' | 'month';

type TimeBucket = {
  key: string;
  label: string;
  start: Date;
};

type TimelineMetric = {
  views: number;
  likes: number;
  ratingStars: number;
  comments: number;
};

const normalizeGranularity = (raw: unknown): Granularity => (
  String(raw || '').toLowerCase() === 'month' ? 'month' : 'day'
);

const normalizeLimit = (raw: unknown, granularity: Granularity): number => {
  const parsed = parseInt(String(raw || ''), 10);
  const fallback = granularity === 'month' ? 12 : 30;
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  const max = granularity === 'month' ? 36 : 120;
  return Math.min(max, Math.max(1, parsed));
};

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const toMonthKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const buildBuckets = (granularity: Granularity, limit: number): TimeBucket[] => {
  const now = new Date();
  const items: TimeBucket[] = [];

  for (let i = limit - 1; i >= 0; i -= 1) {
    const point = new Date(now);
    if (granularity === 'day') {
      point.setHours(0, 0, 0, 0);
      point.setDate(point.getDate() - i);
      const key = toDateKey(point);
      const label = point.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      items.push({ key, label, start: point });
    } else {
      point.setHours(0, 0, 0, 0);
      point.setDate(1);
      point.setMonth(point.getMonth() - i);
      const key = toMonthKey(point);
      const label = `${String(point.getMonth() + 1).padStart(2, '0')}/${point.getFullYear()}`;
      items.push({ key, label, start: point });
    }
  }

  return items;
};

const bucketKeyForDate = (date: Date, granularity: Granularity) => (
  granularity === 'month' ? toMonthKey(date) : toDateKey(date)
);

const readAggregate = async (collection: string, pipeline: Record<string, unknown>[]) => {
  try {
    const result = await (prisma as any).$runCommandRaw({
      aggregate: collection,
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
};

router.get('/', async (req: Request, res: Response) => {
  try {
    const granularity = normalizeGranularity(req.query.granularity);
    const limit = normalizeLimit(req.query.limit, granularity);
    const buckets = buildBuckets(granularity, limit);
    const startDate = buckets[0]?.start || new Date();
    const startEpochMs = startDate.getTime();
    const bucketFormat = granularity === 'day' ? '%Y-%m-%d' : '%Y-%m';

    const [totalMovies, totalUsers, totalComments] = await Promise.all([
      prisma.movie.count(),
      prisma.user.count(),
      prisma.comment.count(),
    ]);

    const totalsByType = await readAggregate(EVENTS_COLLECTION, [
      { $match: { eventType: { $in: ['view', 'favorite', 'rating'] } } },
      {
        $group: {
          _id: '$eventType',
          eventCount: { $sum: 1 },
          valueTotal: { $sum: { $ifNull: ['$value', 1] } },
        },
      },
    ]);

    const totalsMap = new Map<string, { eventCount: number; valueTotal: number }>();
    for (const row of totalsByType as any[]) {
      const key = String(row?._id || '');
      if (!key) continue;
      totalsMap.set(key, {
        eventCount: Number(row?.eventCount || 0),
        valueTotal: Number(row?.valueTotal || 0),
      });
    }

    let totalViews = totalsMap.get('view')?.eventCount || 0;
    let totalLikes = totalsMap.get('favorite')?.eventCount || 0;
    let totalRatingStars = totalsMap.get('rating')?.valueTotal || 0;

    if (totalLikes <= 0) {
      const users = await prisma.user.findMany({
        select: { favoriteIds: true },
      });
      totalLikes = users.reduce((sum, user) => sum + (Array.isArray(user.favoriteIds) ? user.favoriteIds.length : 0), 0);
    }

    if (totalRatingStars <= 0) {
      const ratingFallback = await readAggregate(RATINGS_COLLECTION, [
        {
          $group: {
            _id: null,
            totalStars: { $sum: '$rating' },
          },
        },
      ]);
      totalRatingStars = Number((ratingFallback as any[])[0]?.totalStars || 0);
    }

    const timelineAgg = await readAggregate(EVENTS_COLLECTION, [
      {
        $match: {
          eventType: { $in: ['view', 'favorite', 'rating'] },
        },
      },
      {
        $addFields: {
          createdAtNormalized: {
            $convert: {
              input: '$createdAt',
              to: 'date',
              onError: null,
              onNull: null,
            },
          },
          createdAtEpochMs: {
            $cond: [
              { $eq: [{ $type: '$createdAt' }, 'date'] },
              { $toLong: '$createdAt' },
              {
                $toLong: {
                  $convert: {
                    input: '$createdAt',
                    to: 'date',
                    onError: null,
                    onNull: null,
                  },
                },
              },
            ],
          },
        },
      },
      {
        $match: {
          createdAtEpochMs: { $gte: startEpochMs },
        },
      },
      {
        $project: {
          bucket: { $dateToString: { format: bucketFormat, date: '$createdAtNormalized' } },
          eventType: 1,
          value: { $ifNull: ['$value', 1] },
        },
      },
      {
        $group: {
          _id: {
            bucket: '$bucket',
            eventType: '$eventType',
          },
          eventCount: { $sum: 1 },
          valueTotal: { $sum: '$value' },
        },
      },
    ]);

    const timelineMap = new Map<string, TimelineMetric>();
    for (const bucket of buckets) {
      timelineMap.set(bucket.key, { views: 0, likes: 0, ratingStars: 0, comments: 0 });
    }

    for (const row of timelineAgg as any[]) {
      const bucket = String(row?._id?.bucket || '');
      const type = String(row?._id?.eventType || '');
      if (!bucket || !timelineMap.has(bucket)) continue;

      const current = timelineMap.get(bucket)!;
      if (type === 'view') current.views = Number(row?.eventCount || 0);
      if (type === 'favorite') current.likes = Number(row?.eventCount || 0);
      if (type === 'rating') current.ratingStars = Number(row?.valueTotal || 0);
    }

    const commentRows = await prisma.comment.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { not: 'rejected' },
      },
      select: {
        movieId: true,
        createdAt: true,
      },
    });

    for (const comment of commentRows) {
      const bucketKey = bucketKeyForDate(new Date(comment.createdAt), granularity);
      const current = timelineMap.get(bucketKey);
      if (!current) continue;
      current.comments += 1;
    }

    const timeline = buckets.map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      views: timelineMap.get(bucket.key)?.views || 0,
      likes: timelineMap.get(bucket.key)?.likes || 0,
      ratingStars: timelineMap.get(bucket.key)?.ratingStars || 0,
      comments: timelineMap.get(bucket.key)?.comments || 0,
    }));

    const hotAgg = await readAggregate(EVENTS_COLLECTION, [
      {
        $match: {
          eventType: { $in: ['view', 'favorite', 'rating'] },
        },
      },
      {
        $addFields: {
          createdAtNormalized: {
            $convert: {
              input: '$createdAt',
              to: 'date',
              onError: null,
              onNull: null,
            },
          },
          createdAtEpochMs: {
            $cond: [
              { $eq: [{ $type: '$createdAt' }, 'date'] },
              { $toLong: '$createdAt' },
              {
                $toLong: {
                  $convert: {
                    input: '$createdAt',
                    to: 'date',
                    onError: null,
                    onNull: null,
                  },
                },
              },
            ],
          },
        },
      },
      {
        $match: {
          createdAtEpochMs: { $gte: startEpochMs },
          movieId: { $type: 'string' },
        },
      },
      {
        $project: {
          movieId: 1,
          eventType: 1,
          value: { $ifNull: ['$value', 1] },
        },
      },
      {
        $group: {
          _id: {
            movieId: '$movieId',
            eventType: '$eventType',
          },
          eventCount: { $sum: 1 },
          valueTotal: { $sum: '$value' },
        },
      },
    ]);

    const byMovie = new Map<string, TimelineMetric>();
    for (const row of hotAgg as any[]) {
      const movieId = String(row?._id?.movieId || '');
      const type = String(row?._id?.eventType || '');
      if (!movieId) continue;
      if (!byMovie.has(movieId)) {
        byMovie.set(movieId, { views: 0, likes: 0, ratingStars: 0, comments: 0 });
      }
      const current = byMovie.get(movieId)!;
      if (type === 'view') current.views = Number(row?.eventCount || 0);
      if (type === 'favorite') current.likes = Number(row?.eventCount || 0);
      if (type === 'rating') current.ratingStars = Number(row?.valueTotal || 0);
    }

    for (const comment of commentRows) {
      const movieId = String(comment.movieId || '');
      if (!movieId) continue;
      if (!byMovie.has(movieId)) {
        byMovie.set(movieId, { views: 0, likes: 0, ratingStars: 0, comments: 0 });
      }
      byMovie.get(movieId)!.comments += 1;
    }

    const movieIds = Array.from(byMovie.keys());
    const movies = movieIds.length
      ? await prisma.movie.findMany({
        where: { id: { in: movieIds } },
        select: { id: true, title: true },
      })
      : [];
    const titleById = new Map(movies.map((movie) => [movie.id, movie.title]));

    const hotMovies = Array.from(byMovie.entries())
      .map(([movieId, metric]) => {
        const score = metric.views + metric.likes * 4 + metric.ratingStars * 3 + metric.comments * 5;
        return {
          movieId,
          title: titleById.get(movieId) || 'Unknown movie',
          views: metric.views,
          likes: metric.likes,
          ratingStars: metric.ratingStars,
          comments: metric.comments,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return res.json({
      summary: {
        totalMovies,
        totalUsers,
        totalComments,
        totalViews,
        totalLikes,
        totalRatingStars,
      },
      timeline,
      hotMovies,
      granularity,
    });
  } catch (error) {
    console.error('GET /api/analytics error:', error);
    return sendDbError(res, error);
  }
});

export default router;
