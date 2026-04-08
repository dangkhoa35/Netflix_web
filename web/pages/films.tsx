import React, { useMemo } from "react";
import { GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../libs/authOptions";
import useMovieList from "../hooks/useMovieList";
import Navbar from "../components/Navbar";
import MovieList from "../components/MovieList";
import InfoModal from "../components/InfoModal";

const normalizeCategory = (value: string) => value
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[\u0111\u0110]/g, "d")
  .trim();

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return {
      redirect: {
        destination: "/auth",
        permanent: false,
      },
    };
  }
  return { props: {} };
}

const FilmsPage: React.FC = () => {
  const { data: moviesList = [] } = useMovieList();

  const filteredMovies = useMemo(() => {
    if (!moviesList || moviesList.length === 0) return [];

    return moviesList.filter((movie: any) => {
      const rawCategories = Array.isArray(movie.categories) ? movie.categories : [];
      const categories = rawCategories.map((item: unknown) => normalizeCategory(String(item || "")));

      if (categories.includes("series")) return false;

      const duration = Number(movie.duration) || 0;
      if (duration > 150) return false;

      if (categories.includes("chinh kich") && duration > 120) return false;
      return true;
    });
  }, [moviesList]);

  const featuredMovie = useMemo(() => {
    if (!filteredMovies.length) return null;

    const imageReady = filteredMovies.filter((movie: any) => (
      Boolean(movie?.backdropUrl || movie?.thumbnailUrl || movie?.posterUrl || movie?.imageUrl)
    ));

    const pool = imageReady.length ? imageReady : filteredMovies;
    return pool[0] || null;
  }, [filteredMovies]);

  const featuredImage = useMemo(() => {
    if (!featuredMovie) return "/images/default-slate.png";

    return featuredMovie.backdropUrl
      || featuredMovie.thumbnailUrl
      || featuredMovie.posterUrl
      || featuredMovie.imageUrl
      || "/images/default-slate.png";
  }, [featuredMovie]);

  return (
    <div className="bg-black min-h-screen">
      <Navbar />
      <InfoModal />

      {featuredMovie ? (
        <section className="relative w-full h-[44vw] min-h-[320px] max-h-[520px] overflow-hidden">
          <img
            src={featuredImage}
            alt={featuredMovie.title || "Featured film"}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/35 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/45 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black via-black/75 to-transparent" />

          <div className="absolute left-4 md:left-16 bottom-10 md:bottom-14 z-10 max-w-[90%] md:max-w-[55%] lg:max-w-[40%]">
            <p className="text-white/80 text-xs md:text-sm mb-2">Films</p>
            <h1 className="text-white text-3xl md:text-5xl font-bold drop-shadow-2xl leading-tight">
              {featuredMovie.title}
            </h1>
            {featuredMovie.description ? (
              <p className="mt-3 text-white/90 text-sm md:text-base line-clamp-3 md:line-clamp-4">
                {featuredMovie.description}
              </p>
            ) : null}
          </div>
        </section>
      ) : (
        <div className="h-[76px]" />
      )}

      <div className="pb-40">
        <MovieList title="Phim Le" data={filteredMovies} />
      </div>
    </div>
  );
};

export default FilmsPage;
