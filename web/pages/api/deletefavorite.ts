import type { NextApiRequest, NextApiResponse } from "next";

import { prisma } from "../../libs/prismadb";
import {
  resolveCanonicalFavoriteIds,
  syncCanonicalFavoriteIds,
} from "../../libs/canonicalFavorites";
import serverAuth from "../../libs/serverAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).end();
    }

    const authResult = await serverAuth(req, res);
    if (!authResult) return; // đã 401
    const { currentUser } = authResult;

    const { movieId } = req.body as { movieId?: string };

    if (!movieId || typeof movieId !== "string") {
      return res.status(400).json({ message: "movieId is required" });
    }

    const existingMovie = await prisma.movie.findUnique({
      where: { id: movieId },
    });

    if (!existingMovie) {
      return res.status(404).json({ message: "Invalid ID" });
    }

    const { favoriteIds } = await syncCanonicalFavoriteIds({
      email: currentUser.email,
      favoriteIds: currentUser.favoriteIds ?? [],
    });
    const { favoriteIds: canonicalMovieIdsToRemove } = await resolveCanonicalFavoriteIds([movieId]);
    const movieIdsToRemove = new Set<string>([movieId, ...canonicalMovieIdsToRemove]);
    const updatedFavoriteIds = favoriteIds.filter((favoriteId) => !movieIdsToRemove.has(favoriteId));

    const updatedUser = await prisma.user.update({
      where: { email: currentUser.email ?? "" },
      data: { favoriteIds: { set: updatedFavoriteIds } },
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Something went wrong" });
  }
}
