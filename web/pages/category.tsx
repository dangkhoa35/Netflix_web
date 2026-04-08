import React, { useMemo } from "react";
import { GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth";
import { useRouter } from "next/router";
import { authOptions } from "../libs/authOptions";
import useMovieList from "../hooks/useMovieList";
import Navbar from "../components/Navbar";
import MovieList from "../components/MovieList";
import InfoModal from "../components/InfoModal";

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

const CategoryPage: React.FC = () => {
  const router = useRouter();
  const { genre } = router.query;
  const { data: moviesList = [] } = useMovieList();

  const filteredMovies = useMemo(() => {
    if (!genre) return moviesList;
    const searchGenre = String(genre).toLowerCase();
    
    return moviesList.filter((movie: any) => {
      const categories = Array.isArray(movie.categories) ? movie.categories : [];
      return categories.some((cat: string) => cat.toLowerCase().includes(searchGenre));
    });
  }, [moviesList, genre]);

  return (
    <div className="bg-black min-h-screen">
      <Navbar />
      <InfoModal />
      <div className="pt-24 pb-40">
        <MovieList title={`Thể loại: ${genre || "Tất cả"}`} data={filteredMovies} />
      </div>
    </div>
  );
};

export default CategoryPage;
