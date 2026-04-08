import React, { useMemo } from "react";
import { useAppDispatch } from "../store";
import { movieActions, movieState } from "../store/movies";
import { MovieItem } from "../hooks/useMovieList";
import MovieCard from "./MovieCard";

interface MovieListProps {
  data: MovieItem[];
  title: string;
}

const toMovieState = (movie: MovieItem): movieState => ({
  id: String(movie.id ?? movie._id ?? ""),
  title: movie.title || "",
  description: movie.description || "",
  videoUrl: movie.videoUrl || "",
  thumbnailUrl: movie.thumbnailUrl || "",
  genre: movie.genre || "",
  duration: movie.duration || 0,
  code: movie.code,
  slug: movie.slug,
  studio: movie.studio,
  director: movie.director,
  cast: Array.isArray(movie.cast) ? movie.cast : [],
  status: movie.status,
  ageRating: movie.ageRating,
  releaseDate: movie.releaseDate,
  imageUrl: movie.imageUrl,
  posterUrl: movie.posterUrl,
  backdropUrl: movie.backdropUrl,
  trailerUrl: movie.trailerUrl,
  tags: Array.isArray(movie.tags) ? movie.tags : [],
  subtitles: Array.isArray(movie.subtitles) ? movie.subtitles : [],
  categories: Array.isArray(movie.categories) ? movie.categories : [],
});

const MovieList: React.FC<MovieListProps> = ({ data, title }) => {
  const dispatch = useAppDispatch();

  const movieById = useMemo(() => {
    const map = new Map<string, MovieItem>();
    data.forEach((movie) => {
      const id = String(movie.id ?? movie._id ?? "");
      if (!id) return;
      map.set(id, movie);
    });
    return map;
  }, [data]);

  if (!data || data.length === 0) {
    return null;
  }

  const handleClick = (id: string) => {
    if (!id) return;
    const movie = movieById.get(id);
    if (!movie) return;

    dispatch(movieActions.showModal(toMovieState(movie)));
  };

  return (
    <div className="px-4 md:px-12 mt-8 space-y-8">
      <div>
        <p className="text-white text-lg md:text-xl lg:text-2xl font-semibold mb-4 md:mb-6">
          {title}
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 md:gap-3 lg:gap-4">
          {data.map((movie) => {
            const movieId = String(movie.id ?? movie._id ?? "");
            return <MovieCard key={movieId || movie.title} data={movie} onClick={handleClick} />;
          })}
        </div>
      </div>
    </div>
  );
};

export default MovieList;
