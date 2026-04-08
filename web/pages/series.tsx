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

const SeriesPage: React.FC = () => {
  const { data: moviesList = [] } = useMovieList();

  // Filter for series - movies with specific categories or duration > 100 mins (assuming series)
  const filteredMovies = useMemo(() => {
    if (!moviesList || moviesList.length === 0) return [];
    return moviesList.filter((m: any) => {
      // Include if has explicitly Series category
      if (m.categories?.includes('Series')) return true;
      // Include dramas, psychological, emotional content (typically series)
      if (m.categories?.includes('Chính kịch')) return true;
      if (m.categories?.includes('Tâm lý')) return true;
      // Include items with higher durations (more likely to be series)
      const duration = parseInt(m.duration) || 0;
      if (duration > 100) return true;
      return false;
    });
  }, [moviesList]);

  return (
    <div className="bg-black min-h-screen">
      <Navbar />
      <InfoModal />
      <div className="pt-24 pb-40">
        <MovieList title="Phim Bộ" data={filteredMovies} />
      </div>
    </div>
  );
};

export default SeriesPage;
