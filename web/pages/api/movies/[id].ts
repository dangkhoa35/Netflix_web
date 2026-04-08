import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../libs/prismadb";

const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://localhost:5000";
const EVENTS_COLLECTION = "movie_engagement_events";
const ALLOWED_ORIGINS = new Set(["http://localhost:3000", "http://localhost:3002"]);

const setCors = (req: NextApiRequest, res: NextApiResponse) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

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

const getViewCountByMovieId = async (movieId: string) => {
  const safeMovieId = String(movieId || "").trim();
  if (!safeMovieId) return null;

  const rows = await readAggregate([
    {
      $match: {
        eventType: "view",
        movieId: safeMovieId,
      },
    },
    {
      $group: {
        _id: "$movieId",
        total: { $sum: 1 },
      },
    },
  ]);

  const first = (rows as any[])[0];
  if (!first) return null;
  return Math.max(0, Number(first.total || 0));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { id } = req.query;
    const movieId = Array.isArray(id) ? id[0] : id;
    if (!movieId) {
      return res.status(400).json({ error: "Movie id is required" });
    }

    try {
      const response = await fetch(`${BACKEND_API_URL}/api/movies/${movieId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(`Backend API error: ${response.status}`);
      const viewCount = await getViewCountByMovieId(String(movieId));
      return res.status(200).json(withCompatFields(data as any, viewCount ?? undefined));
    } catch (_backendError) {
      const movie = await prisma.movie.findUnique({
        where: { id: String(movieId) },
      });

      if (!movie) {
        return res.status(404).json({ error: "Movie not found" });
      }

      const viewCount = await getViewCountByMovieId(String(movieId));
      res.setHeader("x-data-source", "web-prisma-fallback");
      return res.status(200).json(withCompatFields(movie as any, viewCount ?? undefined));
    }
  } catch (error) {
    console.error("Error fetching movie detail:", error);
    return res.status(500).json({
      error: "Failed to fetch movie detail",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
