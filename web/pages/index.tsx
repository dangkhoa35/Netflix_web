import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import type { NextPage, GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { getServerSession } from "next-auth";
import { authOptions } from "../libs/authOptions";

import { profileActions, type ProfileState } from "../store/profile";
import { movieActions, type movieState } from "../store/movies";
import { useAppDispatch } from "../store";

import useCurrentUser from "../hooks/useCurrentUser";
import useMovieList, { type MovieItem } from "../hooks/useMovieList";
import useFavorites from "../hooks/useFavorites";
import { getBrandIntroUrl } from "../libs/brandIntro";

import Navbar from "../components/Navbar";
import Billboard from "../components/Billboard";
import MovieList from "../components/MovieList";
import InfoModal from "../components/InfoModal";
import IntroN from "../components/IntroN";
import Footer from "../components/Footer";

const BRAND_INTRO_URL = getBrandIntroUrl();
const parsedBrandIntroDurationMs = Number(
  process.env.NEXT_PUBLIC_BRAND_INTRO_DURATION_MS ?? process.env.NEXT_PUBLIC_INTRO_DURATION_MS
);
const INTRO_DURATION_MS = Number.isFinite(parsedBrandIntroDurationMs)
  ? Math.max(0, Math.floor(parsedBrandIntroDurationMs))
  : 4000;
type HomePageProps = {
  showIntroOnLoad: boolean;
};

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

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

  const introParam = context.query.intro;
  const showIntroOnLoad = introParam === "1" || (Array.isArray(introParam) && introParam.includes("1"));

  // Don't redirect - showIntroOnLoad will be false if coming directly to home
  // Home page will handle it gracefully
  return { props: { showIntroOnLoad } };
}

const Home: NextPage<HomePageProps> = ({ showIntroOnLoad }) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [showIntro, setShowIntro] = useState(showIntroOnLoad);
  const [introResolved, setIntroResolved] = useState(showIntroOnLoad);
  const prevShowIntroOnLoadRef = useRef(showIntroOnLoad);
  // Always fetch data so we can have movie videos for the intro
  const shouldFetchHomeData = true;

  // Calculate introIsMuted immediately (not using useEffect to avoid timing issue)
  const introIsMuted = useMemo(() => {
    if (!showIntro) return false;
    
    try {
      // Detect if user just selected avatar (showIntroOnLoad changed from false → true)
      const isAvatarJustSelected = !prevShowIntroOnLoadRef.current && showIntroOnLoad;
      
      if (isAvatarJustSelected) {
        // First time from avatar selection: reset counter and show with sound
        window.sessionStorage.setItem("nextflix:home_intro_run_count", "0");
        return false; // No mute (has sound)
      }
    } catch {
      // Ignore sessionStorage errors
    }
    
    // For subsequent visits/reload, check run count
    try {
      const storageKey = "nextflix:home_intro_run_count";
      const runCountStr = window.sessionStorage.getItem(storageKey);
      const runCount = runCountStr ? parseInt(runCountStr, 10) : 0;
      // First run (count = 0): no mute, subsequent runs: muted
      return runCount > 0;
    } catch {
      // If sessionStorage fails, assume first run
      return false;
    }
  }, [showIntro, showIntroOnLoad]);

  const { data: currentUser } = useCurrentUser(shouldFetchHomeData);
  const { data: moviesList = [], isLoading: moviesLoading, error: moviesError } = useMovieList(shouldFetchHomeData);
  const { data: favorites = [] } = useFavorites(shouldFetchHomeData);

  // Get latest 5 movie videos for the intro playlist (No longer used for intro, but kept if needed elsewhere)
  const introVideoUrls = useMemo(() => {
    if (!moviesList || moviesList.length === 0) return [];
    return moviesList
      .slice(0, 5) 
      .map(m => m.videoUrl || m.movieUrl || m.trailerUrl)
      .filter(Boolean) as string[];
  }, [moviesList]);

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

  const movieStateList = useMemo<movieState[]>(
    () => moviesList.map(toMovieState).filter((movie) => Boolean(movie.id)),
    [moviesList]
  );

  useEffect(() => {
    if (currentUser?.id) {
      const profilePayload: ProfileState = {
        id: currentUser.id,
        createdAt: currentUser.createdAt,
        email: currentUser.email,
        emailVerified: currentUser.emailVerified ?? null,
        favoriteIds: Array.isArray(currentUser.favoriteIds) ? currentUser.favoriteIds : [],
        image: currentUser.image ?? "",
        name: currentUser.name ?? "",
        updatedAt: currentUser.updatedAt,
      };
      dispatch(profileActions.updateProfile(profilePayload));
    }
  }, [currentUser?.id, dispatch]);

  useEffect(() => {
    if (movieStateList.length > 0) {
      dispatch(movieActions.updateMovieList(movieStateList));
    }
  }, [movieStateList, dispatch]);

  const hideIntro = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        // Increment intro run count for reload tracking
        const storageKey = "nextflix:home_intro_run_count";
        const runCountStr = window.sessionStorage.getItem(storageKey);
        const runCount = runCountStr ? parseInt(runCountStr, 10) : 0;
        window.sessionStorage.setItem(storageKey, String(runCount + 1));
      }
    } catch {
      // Ignore sessionStorage errors.
    }

    setShowIntro(false);
    // Keep ?intro=1 in URL so reload will show intro again but muted
    // Don't remove the intro param
  }, []);

  useIsomorphicLayoutEffect(() => {
    // Luồng hoạt động:
    // 1. Server-side đã check intro param, return showIntroOnLoad (true/false)
    // 2. Client-side: Show intro nếu showIntroOnLoad = true
    // 3. useMemo sẽ handle reset runCount khi showIntroOnLoad thay đổi
    
    const shouldShowIntro = showIntroOnLoad;
    setShowIntro(shouldShowIntro);
    setIntroResolved(true);
    
    // Update ref after state changes
    prevShowIntroOnLoadRef.current = showIntroOnLoad;
  }, [showIntroOnLoad]);

  if (!introResolved) {
    return <div className="w-screen h-screen bg-black" />;
  }

  if (showIntro) {
    return (
      <IntroN
        preferVideo
        videoUrl={BRAND_INTRO_URL}
        alt="Brand intro"
        onFinished={hideIntro}
        finishAfterMs={INTRO_DURATION_MS}
        isMuted={introIsMuted}
      />
    );
  }

  // If intro finished but movies still loading, show loading indicator
  if (moviesLoading && moviesList.length === 0) {
    return <div className="w-screen h-screen bg-black" />;
  }

  if (moviesError) {
    return (
      <div className="w-screen h-screen bg-black text-white flex items-center justify-center px-6 text-center">
        Không kết nối được dữ liệu phim. Bạn kiểm tra backend hoặc API rồi tải lại trang.
      </div>
    );
  }

  if (!moviesLoading && moviesList.length === 0) {
    return (
      <div className="w-screen h-screen bg-black text-white flex items-center justify-center">
        Không có phim nào để hiển thị.
      </div>
    );
  }

  return (
    <>
      <Head>
        <link rel="shortcut icon" href="/images/favicon.png" />
      </Head>
      <InfoModal />
      <Navbar />
      <Billboard />
      <div className="pb-40">
        <MovieList title="Trending Now" data={moviesList} />
        <MovieList title="My List" data={favorites} />
      </div>
      <Footer />
    </>
  );
};

export default Home;

