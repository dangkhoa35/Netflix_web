import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../libs/prismadb";

const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://localhost:5000";
const ALLOWED_SORT_FIELDS = new Set(["createdAt", "updatedAt", "title", "releaseDate", "duration"]);
const EVENTS_COLLECTION = "movie_engagement_events";
const ALLOWED_ORIGINS = new Set(["http://localhost:3000", "http://localhost:3002"]);

const toNonNegativeInt = (raw: unknown): number | null => {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) return Math.floor(raw);
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number(raw.trim());
    if (Number.isFinite(parsed) && parsed >= 0) return Math.floor(parsed);
  }
  return null;
};

const resolveMovieViewCount = (movie: Record<string, any>, fallbackViewCount?: number) => {
  const fromMovie = toNonNegativeInt(movie.viewCount ?? movie.views ?? movie.view_count);
  if (fromMovie !== null) return fromMovie;

  const fromFallback = toNonNegativeInt(fallbackViewCount);
  return fromFallback ?? 0;
};

const withCompatFields = (movie: Record<string, any>, fallbackViewCount?: number) => {
  const viewCount = resolveMovieViewCount(movie, fallbackViewCount);
  return {
    ...movie,
    genre: Array.isArray(movie.categories) ? movie.categories.join(", ") : "",
    duration: Number(movie.duration ?? 0),
    viewCount,
    views: viewCount,
    view_count: viewCount,
    posterUrl: movie.imageUrl || movie.posterUrl,
    backdropUrl: movie.imageUrl || movie.backdropUrl,
    thumbnailUrl: movie.imageUrl || movie.thumbnailUrl,
  };
};

const readAggregate = async (pipeline: Record<string, unknown>[]) => {
  try {
    const result = await (prisma as any).$runCommandRaw({
      aggregate: EVENTS_COLLECTION,
      pipeline,
      cursor: {},
    });
    const rows = result?.cursor?.firstBatch;
    return Array.isArray(rows) ? rows : [];
  } catch (error: any) {
    const message = String(error?.message || "");
    if (message.includes("NamespaceNotFound") || message.includes("ns not found")) {
      return [];
    }
    throw error;
  }
};

const getViewCountByMovieIds = async (movieIds: string[]) => {
  const uniqueMovieIds = Array.from(new Set(
    movieIds
      .map((id) => String(id || "").trim())
      .filter(Boolean),
  ));
  if (!uniqueMovieIds.length) return new Map<string, number>();

  const rows = await readAggregate([
    {
      $match: {
        eventType: "view",
        movieId: { $in: uniqueMovieIds },
      },
    },
    {
      $group: {
        _id: "$movieId",
        total: { $sum: 1 },
      },
    },
  ]);

  const viewCountByMovieId = new Map<string, number>();
  for (const row of rows as any[]) {
    const movieId = String(row?._id || "").trim();
    if (!movieId) continue;
    viewCountByMovieId.set(movieId, Math.max(0, Number(row?.total || 0)));
  }

  return viewCountByMovieId;
};

const attachRealViewCounts = async (payload: unknown) => {
  if (!payload || typeof payload !== "object") return payload;
  const current = payload as Record<string, unknown>;
  if (!Array.isArray(current.data)) return payload;

  const movies = current.data as Record<string, any>[];
  const viewCountByMovieId = await getViewCountByMovieIds(
    movies.map((movie) => String(movie?.id ?? "")),
  );

  return {
    ...current,
    data: movies.map((movie) => withCompatFields(movie, viewCountByMovieId.get(String(movie?.id ?? "")))),
  };
};

const buildQueryString = (query: NextApiRequest["query"]) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
      return;
    }
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  return params.toString();
};

// CORS configuration
const setCors = (req: NextApiRequest, res: NextApiResponse) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

const fetchFromLocalDb = async (req: NextApiRequest) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
  const skip = (page - 1) * limit;

  const where: Record<string, any> = {};
  const statusQuery = typeof req.query.status === "string" ? req.query.status.trim() : "";
  if (!statusQuery) {
    where.status = "published";
  } else if (statusQuery !== "all") {
    where.status = statusQuery;
  }
  if (typeof req.query.category === "string" && req.query.category.trim()) {
    where.categories = { has: req.query.category };
  }
  if (typeof req.query.ageRating === "string" && req.query.ageRating.trim()) {
    where.ageRating = req.query.ageRating;
  }
  if (typeof req.query.search === "string" && req.query.search.trim()) {
    where.title = { contains: req.query.search, mode: "insensitive" };
  }

  const rawSort = typeof req.query.sort === "string" ? req.query.sort : "createdAt";
  const sortField = ALLOWED_SORT_FIELDS.has(rawSort) ? rawSort : "createdAt";
  const sortOrder = req.query.order === "asc" ? "asc" : "desc";

  const [movies, total] = await Promise.all([
    prisma.movie.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortField]: sortOrder } as any,
    }),
    prisma.movie.count({ where }),
  ]);
  const viewCountByMovieId = await getViewCountByMovieIds(movies.map((movie) => movie.id));

  return {
    data: movies.map((movie) => withCompatFields(movie, viewCountByMovieId.get(movie.id))),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  setCors(req, res);

  // Handle OPTIONS requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const queryString = buildQueryString(req.query);
    const url = `${BACKEND_API_URL}/api/movies${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    const enriched = await attachRealViewCounts(data);
    return res.status(200).json(enriched);
  } catch (backendError) {
    try {
      const fallbackData = await fetchFromLocalDb(req);
      res.setHeader("x-data-source", "web-prisma-fallback");
      return res.status(200).json(fallbackData);
    } catch (fallbackError) {
      console.error("Error fetching movies (backend + fallback):", backendError, fallbackError);
      return res.status(500).json({
        error: "Failed to fetch movies",
        message:
          fallbackError instanceof Error
            ? fallbackError.message
            : backendError instanceof Error
              ? backendError.message
              : "Unknown error",
      });
    }
  }
}
