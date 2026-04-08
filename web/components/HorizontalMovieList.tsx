import React, { useRef, useState, useEffect } from "react";
import { BsChevronLeft, BsChevronRight } from "react-icons/bs";
import { MovieItem } from "../hooks/useMovieList";
import { useRouter } from "next/router";

interface HorizontalMovieListProps {
  title: string;
  data: MovieItem[];
}

const HorizontalMovieList: React.FC<HorizontalMovieListProps> = ({ title, data }) => {
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const scroll = (direction: "left" | "right") => {
    if (listRef.current) {
      const { scrollLeft, clientWidth } = listRef.current;
      const scrollTo = direction === "left" ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      listRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  const onScroll = () => {
    if (listRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = listRef.current;
      setShowLeft(scrollLeft > 0);
      setShowRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    onScroll();
  }, [data]);

  if (!data || data.length === 0) return null;

  return (
    <div className="px-4 md:px-12 mt-12 mb-12 group relative">
      <h2 className="text-white text-xl md:text-2xl font-bold mb-6">{title}</h2>
      
      <div className="relative">
        {/* Left Arrow */}
        {showLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-0 bottom-0 z-40 w-10 md:w-16 bg-black/50 hover:bg-black/70 flex items-center justify-center transition opacity-0 group-hover:opacity-100"
          >
            <BsChevronLeft className="w-8 text-white h-8" />
          </button>
        )}

        {/* List */}
        <div
          ref={listRef}
          onScroll={onScroll}
          className="flex overflow-x-auto gap-4 no-scrollbar scroll-smooth"
        >
          {data.map((movie) => (
            <div
              key={movie.id}
              onClick={() => router.push(`/watch/${movie.id}`)}
              className="group/item flex-none w-[140px] md:w-[200px] cursor-pointer"
            >
              <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-zinc-800 transition-transform duration-300 hover:scale-105">
                <img
                  src={movie.thumbnailUrl || movie.posterUrl || movie.imageUrl || "/images/poster.png"}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                  <p className="text-white text-xs md:text-sm font-medium truncate w-full">{movie.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        {showRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-0 bottom-0 z-40 w-10 md:w-16 bg-black/50 hover:bg-black/70 flex items-center justify-center transition opacity-0 group-hover:opacity-100"
          >
            <BsChevronRight className="w-8 text-white h-8" />
          </button>
        )}
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default HorizontalMovieList;
