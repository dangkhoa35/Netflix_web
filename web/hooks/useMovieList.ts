import { useCallback, useMemo } from "react";
import useSWR from "swr";
import fetcher from "../libs/fetcher";

export type MovieItem = {
  id: string;
  _id?: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  thumbnail_url?: string;
  posterUrl?: string;
  backdropUrl?: string;
  imageUrl?: string;
  image?: string;
  movieUrl?: string;
  videoUrl?: string;
  video_url?: string;
  trailerUrl?: string;
  trailer_url?: string;
  genre?: string;
  duration?: number;
  code?: string;
  slug?: string;
  studio?: string;
  director?: string;
  cast?: string[];
  status?: string;
  ageRating?: string;
  releaseDate?: string;
  tags?: string[];
  subtitles?: string[];
  categories?: string[];
  language?: string[];
};

type MoviesApiResponse = MovieItem[] | { data?: MovieItem[] };

const FALLBACK_POSTER = "/images/poster.png";

const normalizeImageUrl = (raw?: string) => {
  if (!raw || typeof raw !== "string") return FALLBACK_POSTER;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return raw;
  return `/${raw}`;
};

const normalizeDuration = (raw: unknown): number => {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const normalizeMovie = (m: MovieItem): MovieItem => {
  const thumb =
    m.thumbnailUrl ||
    m.thumbnail_url ||
    m.posterUrl ||
    m.imageUrl ||
    m.backdropUrl ||
    m.image ||
    FALLBACK_POSTER;
  const id = String(m.id ?? m._id ?? "");
  return {
    ...m,
    id,
    duration: normalizeDuration(m.duration),
    thumbnailUrl: normalizeImageUrl(thumb),
  };
};

const extractMovies = (payload: MoviesApiResponse | null | undefined): MovieItem[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
};

const useMovieList = (enabled = true) => {
  const key = enabled ? "/api/movies?limit=100" : null;
  const { data, error, isLoading, mutate } = useSWR<MoviesApiResponse>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    }
  );

  const movies: MovieItem[] = extractMovies(data).map(normalizeMovie);

  return { data: movies, isLoading, error, mutate };
};

export const useGetSingleMovie = (enabled = true) => {
  const { data } = useMovieList(enabled);
  const movies: MovieItem[] = Array.isArray(data) ? data : [];

  const movieMap = useMemo(() => {
    const map = new Map<string, MovieItem>();
    movies.forEach((m) => {
      if (!m.id) return;
      map.set(String(m.id), m);
    });
    return map;
  }, [movies]);

  return useCallback((id: string): MovieItem | null => {
    if (!id) return null;
    return movieMap.get(id) || null;
  }, [movieMap]);
};

export default useMovieList;

