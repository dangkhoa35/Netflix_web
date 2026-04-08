import React, { useMemo } from 'react';
import { GetServerSidePropsContext } from 'next';
import { getServerSession } from "next-auth";
import { authOptions } from "../libs/authOptions";
import useMovieList from "../hooks/useMovieList";
import Navbar from '../components/Navbar';
import MovieList from '../components/MovieList';
import InfoModal from '../components/InfoModal';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return {
      redirect: {
        destination: '/auth',
        permanent: false,
      }
    }
  }
  return { props: {} };
}

const NewPage: React.FC = () => {
  const { data: moviesList = [] } = useMovieList();

  // Filter for new movies (last 30 days)
  const filteredMovies = useMemo(() => {
    if (!moviesList || moviesList.length === 0) return [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return moviesList.filter((m: any) => {
      const createdAt = new Date(m.createdAt);
      return createdAt >= thirtyDaysAgo;
    });
  }, [moviesList]);

  return (
    <div className="bg-black min-h-screen">
      <Navbar />
      <InfoModal />
      <div className="pt-24 pb-40">
        <MovieList title="Mới & Phổ Biến" data={filteredMovies} />
      </div>
    </div>
  );
};

export default NewPage;
