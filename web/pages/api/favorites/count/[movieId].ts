import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../../libs/prismadb";

const isObjectId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const movieId = String(req.query.movieId || "").trim();
  if (!isObjectId(movieId)) {
    return res.status(400).json({ error: "movieId is invalid" });
  }

  try {
    const favoriteCount = await prisma.user.count({
      where: {
        favoriteIds: {
          has: movieId,
        },
      },
    });

    return res.status(200).json({ movieId, favoriteCount });
  } catch (error) {
    console.error("favorite count API error:", error);
    return res.status(500).json({ error: "Failed to load favorite count" });
  }
}

