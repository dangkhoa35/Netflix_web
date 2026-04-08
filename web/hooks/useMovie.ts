import useSWR from "swr";
import fetcher from "../libs/fetcher";
import { useGetSingleMovie, type MovieItem } from "./useMovieList";
import { logInfo, logError } from "../libs/logger";

type MovieDetailResponse = MovieItem | { data: MovieItem };

const normalizeDuration = (raw: unknown): number => {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const useMovie = (id: string | null) => {
  const safeId = (id ?? "").trim();

  const getSingleMovie = useGetSingleMovie();
  const cachedMovie = safeId ? getSingleMovie(safeId) : null;

  const key = safeId ? `/api/movies/${safeId}` : null;

  const { data, error, isLoading, mutate } = useSWR<MovieDetailResponse>(key, fetcher, {
    fallbackData: cachedMovie ?? undefined,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
    onSuccess: (res) => {
      logInfo("useMovie:onSuccess", { key, id: safeId, hasData: !!res });
    },
    onError: (e) => {
      logError("useMovie:onError", e, { key, id: safeId });
    },
  });

  const movieFromApiRaw =
    data && typeof data === "object" && "data" in data
      ? (data.data as MovieItem)
      : (data as MovieItem | undefined);

  const movieFromApi = movieFromApiRaw
    ? { ...movieFromApiRaw, duration: normalizeDuration(movieFromApiRaw.duration) }
    : undefined;

  const movie = movieFromApi ?? cachedMovie ?? null;

  // loading chuẩn hơn: ưu tiên isLoading của SWR
  const loading = Boolean(safeId) && !error && (isLoading || !movie);

  logInfo("useMovie:state", {
    id: safeId,
    key,
    isLoading: loading,
    hasMovie: !!movie,
    error: (error as Error | undefined)?.message ?? null,
  });

  return { data: movie, error, isLoading: loading, mutate };
};

export default useMovie;
