import { prisma } from "./prismadb";

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

const normalizeMovieTitle = (value: unknown) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const toValidFavoriteIds = (favoriteIds: unknown[]) => {
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const favoriteId of favoriteIds) {
    if (typeof favoriteId !== "string" || !OBJECT_ID_REGEX.test(favoriteId) || seen.has(favoriteId)) {
      continue;
    }
    seen.add(favoriteId);
    ids.push(favoriteId);
  }

  return ids;
};

type MinimalMovieRecord = {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
};

const preferNewestMovie = (
  current: MinimalMovieRecord | undefined,
  candidate: MinimalMovieRecord
) => {
  if (!current) return candidate;
  return candidate.createdAt > current.createdAt ? candidate : current;
};

export const resolveCanonicalFavoriteIds = async (favoriteIds: unknown[]) => {
  const validFavoriteIds = toValidFavoriteIds(Array.isArray(favoriteIds) ? favoriteIds : []);

  if (validFavoriteIds.length === 0) {
    return { favoriteIds: [] as string[], changed: Array.isArray(favoriteIds) && favoriteIds.length > 0 };
  }

  const [favoriteMovies, publishedMovies] = await Promise.all([
    prisma.movie.findMany({
      where: { id: { in: validFavoriteIds } },
      select: { id: true, title: true, status: true, createdAt: true },
    }),
    prisma.movie.findMany({
      where: { status: "published" },
      select: { id: true, title: true, status: true, createdAt: true },
    }),
  ]);

  const favoriteMovieById = new Map(favoriteMovies.map((movie) => [movie.id, movie]));
  const publishedMovieByTitleKey = new Map<string, MinimalMovieRecord>();

  for (const movie of publishedMovies) {
    const titleKey = normalizeMovieTitle(movie.title);
    if (!titleKey) continue;

    publishedMovieByTitleKey.set(
      titleKey,
      preferNewestMovie(publishedMovieByTitleKey.get(titleKey), movie)
    );
  }

  let changed = favoriteMovies.length !== validFavoriteIds.length;
  const canonicalFavoriteIds: string[] = [];
  const seenCanonicalIds = new Set<string>();

  for (const favoriteId of validFavoriteIds) {
    const favoriteMovie = favoriteMovieById.get(favoriteId);
    if (!favoriteMovie) {
      changed = true;
      continue;
    }

    let canonicalFavoriteId = favoriteId;

    if (favoriteMovie.status.toLowerCase() !== "published") {
      const titleKey = normalizeMovieTitle(favoriteMovie.title);
      const publishedMovie = titleKey ? publishedMovieByTitleKey.get(titleKey) : undefined;
      if (publishedMovie?.id) {
        canonicalFavoriteId = publishedMovie.id;
      }
    }

    if (canonicalFavoriteId !== favoriteId) {
      changed = true;
    }

    if (seenCanonicalIds.has(canonicalFavoriteId)) {
      changed = true;
      continue;
    }

    seenCanonicalIds.add(canonicalFavoriteId);
    canonicalFavoriteIds.push(canonicalFavoriteId);
  }

  return {
    favoriteIds: canonicalFavoriteIds,
    changed,
  };
};

export const syncCanonicalFavoriteIds = async ({
  email,
  favoriteIds,
}: {
  email?: string | null;
  favoriteIds: unknown[];
}) => {
  const result = await resolveCanonicalFavoriteIds(favoriteIds);

  if (result.changed && email) {
    await prisma.user.update({
      where: { email },
      data: {
        favoriteIds: { set: result.favoriteIds },
      },
    });
  }

  return result;
};

export const areFavoriteIdsEqual = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);
