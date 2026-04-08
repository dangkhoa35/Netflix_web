import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { prisma } from "../../../libs/prismadb";
import serverAuth from "../../../libs/serverAuth";
import { authOptions } from "../../../libs/authOptions";

const RATINGS_COLLECTION = "movie_ratings";
const EVENTS_COLLECTION = "movie_engagement_events";
let hasEnsuredRatingIndexes = false;

type RatingsResponse = {
  movieId: string;
  averageRating: number;
  ratingCount: number;
  userRating: number | null;
};

const clampRating = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
};

const buildResponse = (movieId: string, averageRating: number, ratingCount: number, userRating: number | null): RatingsResponse => ({
  movieId,
  averageRating: Number(averageRating.toFixed(2)),
  ratingCount: Math.max(0, Math.floor(ratingCount)),
  userRating: userRating === null ? null : Math.max(1, Math.min(5, Math.round(userRating))),
});

async function ensureRatingIndexes() {
  if (hasEnsuredRatingIndexes) return;

  const db = prisma as any;

  try {
    await db.$runCommandRaw({
      createIndexes: RATINGS_COLLECTION,
      indexes: [
        {
          key: { movieId: 1, userId: 1 },
          name: "movie_user_unique_idx",
          unique: true,
        },
        {
          key: { movieId: 1 },
          name: "movie_lookup_idx",
        },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "");
    const isSafeIndexError = (
      message.includes("already exists")
      || message.includes("IndexOptionsConflict")
      || message.includes("IndexKeySpecsConflict")
    );

    if (!isSafeIndexError) {
      throw error;
    }
  } finally {
    hasEnsuredRatingIndexes = true;
  }
}

async function getCurrentUserIdFromSession(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  const session = await getServerSession(req, res, authOptions);
  const email = session?.user?.email?.trim();
  if (!email) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return user?.id ?? null;
}

async function getAggregate(movieId: string): Promise<{ averageRating: number; ratingCount: number }> {
  const db = prisma as any;
  const aggregateResult = await db.$runCommandRaw({
    aggregate: RATINGS_COLLECTION,
    pipeline: [
      { $match: { movieId } },
      { $group: { _id: null, averageRating: { $avg: "$rating" }, ratingCount: { $sum: 1 } } },
    ],
    cursor: {},
  });

  const first = aggregateResult?.cursor?.firstBatch?.[0];
  return {
    averageRating: typeof first?.averageRating === "number" ? first.averageRating : 0,
    ratingCount: typeof first?.ratingCount === "number" ? first.ratingCount : 0,
  };
}

async function getUserRating(movieId: string, userId: string | null): Promise<number | null> {
  if (!userId) return null;

  const db = prisma as any;
  const findResult = await db.$runCommandRaw({
    find: RATINGS_COLLECTION,
    filter: { movieId, userId },
    limit: 1,
  });

  const doc = findResult?.cursor?.firstBatch?.[0];
  if (!doc || typeof doc.rating !== "number") return null;
  return doc.rating;
}

async function upsertRating(movieId: string, userId: string, rating: number): Promise<void> {
  const db = prisma as any;
  const now = new Date();

  await db.$runCommandRaw({
    update: RATINGS_COLLECTION,
    updates: [
      {
        q: { movieId, userId },
        u: {
          $set: { movieId, userId, rating, updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        upsert: true,
        multi: false,
      },
    ],
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const movieId = String(req.query.movieId || "").trim();
  if (!movieId) {
    return res.status(400).json({ error: "movieId is required" });
  }

  try {
    if (req.method === "GET") {
      await ensureRatingIndexes();
      const userId = await getCurrentUserIdFromSession(req, res);
      const [aggregate, userRating] = await Promise.all([
        getAggregate(movieId),
        getUserRating(movieId, userId),
      ]);

      return res.status(200).json(
        buildResponse(movieId, aggregate.averageRating, aggregate.ratingCount, userRating)
      );
    }

    if (req.method === "POST") {
      const authResult = await serverAuth(req, res);
      if (!authResult) return;
      const userId = authResult.currentUser.id;

      const rating = clampRating((req.body as { rating?: number })?.rating);
      if (!rating) {
        return res.status(400).json({ error: "rating must be an integer from 1 to 5" });
      }

      const movieExists = await prisma.movie.findUnique({
        where: { id: movieId },
        select: { id: true },
      });

      if (!movieExists) {
        return res.status(404).json({ error: "Movie not found" });
      }

      await ensureRatingIndexes();
      await upsertRating(movieId, userId, rating);
      try {
        await (prisma as any).$runCommandRaw({
          insert: EVENTS_COLLECTION,
          documents: [{
            movieId,
            userId,
            eventType: "rating",
            value: rating,
            mode: "movie",
            createdAt: new Date(),
          }],
        });
      } catch (eventError) {
        console.error("Failed to track rating event:", eventError);
      }
      const [aggregate, userRating] = await Promise.all([
        getAggregate(movieId),
        getUserRating(movieId, userId),
      ]);

      return res.status(200).json(
        buildResponse(movieId, aggregate.averageRating, aggregate.ratingCount, userRating)
      );
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("ratings API error:", error);
    return res.status(500).json({ error: "Failed to process rating" });
  }
}
