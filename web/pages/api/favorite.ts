import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../libs/prismadb";
import {
  areFavoriteIdsEqual,
  resolveCanonicalFavoriteIds,
  syncCanonicalFavoriteIds,
} from "../../libs/canonicalFavorites";
import serverAuth from "../../libs/serverAuth";

const isObjectId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);
const EVENTS_COLLECTION = "movie_engagement_events";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).end();
    }

    const authResult = await serverAuth(req, res);
    if (!authResult) return;
    const { currentUser } = authResult;

    const { movieId } = req.body as { movieId?: string };
    if (!isObjectId(movieId)) {
      return res.status(400).json({ message: "movieId is invalid" });
    }

    const existingMovie = await prisma.movie.findUnique({
      where: { id: movieId },
      select: { id: true },
    });

    if (!existingMovie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    const { favoriteIds } = await syncCanonicalFavoriteIds({
      email: currentUser.email,
      favoriteIds: currentUser.favoriteIds ?? [],
    });
    const { favoriteIds: nextFavoriteIds } = await resolveCanonicalFavoriteIds([
      ...favoriteIds,
      movieId,
    ]);
    const hasMovie = areFavoriteIdsEqual(favoriteIds, nextFavoriteIds);

    const user = await prisma.user.update({
      where: { email: currentUser.email ?? "" },
      data: { favoriteIds: { set: nextFavoriteIds } },
    });

    if (!hasMovie) {
      try {
        await (prisma as any).$runCommandRaw({
          insert: EVENTS_COLLECTION,
          documents: [{
            movieId,
            userId: currentUser.id,
            eventType: "favorite",
            value: 1,
            mode: "movie",
            createdAt: new Date(),
          }],
        });
      } catch (error) {
        console.error("Failed to track favorite event:", error);
      }
    }

    return res.status(200).json(user);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
