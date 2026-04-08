import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { prisma } from "../../../libs/prismadb";
import { authOptions } from "../../../libs/authOptions";

const EVENTS_COLLECTION = "movie_engagement_events";
let hasEnsuredEventIndexes = false;

type EventType = "view" | "favorite" | "rating";

const isObjectId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);

const toEventType = (raw: unknown): EventType | null => {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "view" || value === "favorite" || value === "rating") return value;
  return null;
};

const toNumericValue = (raw: unknown): number | null => {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number(raw.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

async function ensureEventIndexes() {
  if (hasEnsuredEventIndexes) return;

  const db = prisma as any;
  try {
    await db.$runCommandRaw({
      createIndexes: EVENTS_COLLECTION,
      indexes: [
        { key: { createdAt: 1 }, name: "events_createdAt_idx" },
        { key: { eventType: 1, createdAt: 1 }, name: "events_type_createdAt_idx" },
        { key: { movieId: 1, createdAt: 1 }, name: "events_movie_createdAt_idx" },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "");
    const safeError = (
      message.includes("already exists")
      || message.includes("IndexOptionsConflict")
      || message.includes("IndexKeySpecsConflict")
    );
    if (!safeError) throw error;
  } finally {
    hasEnsuredEventIndexes = true;
  }
}

async function getCurrentUserId(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  const session = await getServerSession(req, res, authOptions);
  const email = session?.user?.email?.trim();
  if (!email) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return user?.id ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const movieId = String((req.body as { movieId?: string })?.movieId || "").trim();
    const eventType = toEventType((req.body as { eventType?: string })?.eventType);
    const modeRaw = (req.body as { mode?: string })?.mode;
    const valueRaw = (req.body as { value?: unknown })?.value;

    if (!isObjectId(movieId)) {
      return res.status(400).json({ error: "movieId is invalid" });
    }
    if (!eventType) {
      return res.status(400).json({ error: "eventType is invalid" });
    }

    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      select: { id: true },
    });
    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    const numericValue = toNumericValue(valueRaw);
    const value = eventType === "rating"
      ? Math.max(1, Math.min(5, Math.round(numericValue ?? 0)))
      : 1;
    if (eventType === "rating" && (!Number.isFinite(value) || value < 1 || value > 5)) {
      return res.status(400).json({ error: "rating value must be between 1 and 5" });
    }

    const userId = await getCurrentUserId(req, res);
    const mode = typeof modeRaw === "string" && modeRaw.trim() ? modeRaw.trim() : "movie";

    await ensureEventIndexes();
    await (prisma as any).$runCommandRaw({
      insert: EVENTS_COLLECTION,
      documents: [{
        movieId,
        userId: userId ?? null,
        eventType,
        value,
        mode,
        createdAt: new Date(),
      }],
    });

    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error("analytics/track API error:", error);
    return res.status(500).json({ error: "Failed to track event" });
  }
}
