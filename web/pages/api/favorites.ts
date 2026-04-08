import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../libs/prismadb";
import {
  areFavoriteIdsEqual,
  resolveCanonicalFavoriteIds,
  syncCanonicalFavoriteIds,
} from "../../libs/canonicalFavorites";
import serverAuth from "../../libs/serverAuth";

const isObjectId = (s: unknown) => typeof s === "string" && /^[a-fA-F0-9]{24}$/.test(s);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authResult = await serverAuth(req, res);
    if (!authResult) return;
    const { currentUser } = authResult;

    if (req.method === "GET") {
      const { favoriteIds } = await syncCanonicalFavoriteIds({
        email: currentUser.email,
        favoriteIds: currentUser.favoriteIds ?? [],
      });
      const movies = await prisma.movie.findMany({ where: { id: { in: favoriteIds } } });
      const movieById = new Map(movies.map((movie) => [movie.id, movie]));

      return res.status(200).json(
        favoriteIds
          .map((favoriteId) => movieById.get(favoriteId))
          .filter((movie): movie is (typeof movies)[number] => Boolean(movie))
      );
    }

    if (req.method === "DELETE") {
      const movieId = (req.query.movieId as string) || "";
      if (!isObjectId(movieId)) return res.status(400).json({ message: "movieId invalid" });

      const { favoriteIds } = await syncCanonicalFavoriteIds({
        email: currentUser.email,
        favoriteIds: currentUser.favoriteIds ?? [],
      });
      const { favoriteIds: canonicalMovieIdsToRemove } = await resolveCanonicalFavoriteIds([movieId]);
      const movieIdsToRemove = new Set<string>([movieId, ...canonicalMovieIdsToRemove]);

      const user = await prisma.user.update({
        where: { email: currentUser.email ?? "" },
        data: {
          favoriteIds: { set: favoriteIds.filter((favoriteId) => !movieIdsToRemove.has(favoriteId)) },
        },
      });

      return res.status(200).json(user);
    }

    if (req.method === "POST") {
      const { movieId } = req.body as { movieId?: string };
      if (!isObjectId(movieId)) return res.status(400).json({ message: "movieId invalid" });

      const existing = await prisma.movie.findUnique({ where: { id: movieId } });
      if (!existing) return res.status(404).json({ message: "Invalid ID" });

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

      return res.status(200).json(user);
    }

    return res.status(405).end();
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
