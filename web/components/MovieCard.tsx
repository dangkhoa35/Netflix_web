import React, { useMemo, useState } from "react";
import { MovieItem } from "../hooks/useMovieList";

interface MovieCardProps {
  data: MovieItem;
  onClick: (id: string) => void;
}

const FALLBACK_IMG = "/images/poster.png";

const MovieCard: React.FC<MovieCardProps> = ({ data, onClick }) => {
  // Resolve image source from all supported movie image fields.
  const imgSrc = useMemo(() => {
    const raw =
      data?.thumbnailUrl ||
      data?.thumbnail_url ||
      data?.posterUrl ||
      data?.imageUrl ||
      data?.backdropUrl ||
      data?.image ||
      "";

    if (!raw) return FALLBACK_IMG;

    if (typeof raw === "string" && !raw.startsWith("http") && !raw.startsWith("/")) {
      return `/${raw}`;
    }

    return raw;
  }, [data]);

  const [error, setError] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onClick(String(data?.id ?? data?._id ?? ""))}
      className="
        group relative w-full overflow-hidden rounded-lg
        aspect-[2/3] bg-zinc-900
        focus:outline-none focus:ring-2 focus:ring-white/60
        transition-all duration-300 ease-out
        hover:scale-105 hover:z-10
        border-2 border-transparent hover:border-white
        shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]
      "
    >
      <img
        src={error ? FALLBACK_IMG : imgSrc}
        alt={data?.title || "Poster"}
        className="
          w-full h-full object-cover object-top
          transition-all duration-300
          group-hover:brightness-110
        "
        onError={() => setError(true)}
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
    </button>
  );
};

export default MovieCard;
