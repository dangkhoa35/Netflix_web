import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AiOutlineInfoCircle } from "react-icons/ai";
import { BsChevronLeft, BsChevronRight } from "react-icons/bs";
import { IoVolumeHighOutline, IoVolumeMuteOutline } from "react-icons/io5";
import { useAppSelector, useAppDispatch } from "../store/index";
import { movieActions, movieState } from "../store/movies";
import { useGetSingleMovie } from "../hooks/useMovieList";
import PlayButton from "./PlayButton";

const HERO_MEDIA_STYLE: React.CSSProperties = {
  objectFit: "cover",
  objectPosition: "50% 24%",
};

const WIDE_BANNER_MIN_RATIO = 1.45;
const MIN_WIDE_BANNER_POOL = 8;
const HERO_UNMUTED_VOLUME = 70;
const HERO_DEFAULT_TRAILER_DURATION_SECONDS = 30;
const parsedHeroRotateMs = Number(process.env.NEXT_PUBLIC_HERO_BANNER_ROTATE_MS);
const HERO_ROTATION_POOL_SIZE = 6;
const ENABLE_YOUTUBE_HERO = (process.env.NEXT_PUBLIC_ENABLE_YOUTUBE_HERO ?? "1") === "1";
type PreferredBannerGroup = {
  key: string;
  keywords: readonly string[];
  preferredKeywords?: readonly string[];
  blockedKeywords?: readonly string[];
};

const PREFERRED_BANNER_GROUPS: readonly PreferredBannerGroup[] = [
  {
    key: "conan",
    keywords: [
      "conan",
      "detective conan",
      "tham tu lung danh conan",
      "meitantei conan",
    ],
  },
  {
    key: "gojo",
    keywords: ["gojo"],
  },
  {
    key: "sukuna",
    keywords: ["sukuna"],
  },
  {
    key: "demon-slayer-infinity-castle",
    keywords: [
      "vo han thanh",
      "infinity castle",
      "thanh guom diet quy vo han thanh",
      "demon slayer infinity castle",
    ],
  },
  {
    key: "doctor-slump",
    keywords: ["doctor slump", "bac si slump"],
  },
  {
    key: "pokemon",
    keywords: ["pokemon", "pokemon horizons", "pokemon journeys"],
    preferredKeywords: [
      "pokemon suc manh cua chung ta",
      "suc manh cua chung ta",
      "pokemon the power of us",
      "the power of us",
      "pokemon movie 21",
    ],
  },
  {
    key: "beloved-summer",
    keywords: ["mua he yeu dau", "our beloved summer"],
  },
];
const BLOCKED_BANNER_KEYWORDS = [
  "mua do",
  "phap su tien tang",
  "frieren",
  "sousou no frieren",
] as const;

const resolveBannerSource = (movie?: Partial<movieState> | null): string => {
  if (!movie) return "/images/default-slate.png";
  return movie.backdropUrl || movie.thumbnailUrl || movie.imageUrl || "/images/default-slate.png";
};

const DIRECT_VIDEO_PATTERN = /\.(mp4|webm|ogg|m3u8)(\?.*)?$/i;

function toYoutubeHeroEmbed(
  raw?: string,
  trailerDurationSeconds: number = HERO_DEFAULT_TRAILER_DURATION_SECONDS
): string {
  if (!raw) return "";

  try {
    const url = new URL(raw.trim());

    const buildEmbed = (id: string) => {
      const embed = new URL(`https://www.youtube.com/embed/${id}`);
      embed.searchParams.set("autoplay", "1");
      embed.searchParams.set("mute", "1");
      embed.searchParams.set("controls", "0");
      embed.searchParams.set("playsinline", "1");
      embed.searchParams.set("rel", "0");
      embed.searchParams.set("modestbranding", "1");
      embed.searchParams.set("iv_load_policy", "3");
      embed.searchParams.set("loop", "1");
      embed.searchParams.set("playlist", id);
      embed.searchParams.set("start", "0");
      embed.searchParams.set("end", String(trailerDurationSeconds));
      embed.searchParams.set("disablekb", "1");
      embed.searchParams.set("fs", "0");
      embed.searchParams.set("showinfo", "0");
      embed.searchParams.set("cc_load_policy", "0");
      embed.searchParams.set("hl", "vi");
      embed.searchParams.set("enablejsapi", "1");
      if (typeof window !== "undefined") {
        embed.searchParams.set("origin", window.location.origin);
      }
      return embed.toString();
    };

    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v");
      if (id) return buildEmbed(id);

      if (url.pathname.startsWith("/shorts/")) {
        const shortId = url.pathname.split("/")[2];
        if (shortId) return buildEmbed(shortId);
      }

      if (url.pathname.startsWith("/embed/")) {
        const embedId = url.pathname.split("/")[2];
        if (embedId) return buildEmbed(embedId);
      }
    }

    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace("/", "");
      if (id) return buildEmbed(id);
    }

    return "";
  } catch {
    return "";
  }
}

function hasMotionHeroMedia(movie?: Partial<movieState> | null): boolean {
  if (!movie) return false;

  const trailerRaw = String(movie.trailerUrl ?? "").trim();
  if (DIRECT_VIDEO_PATTERN.test(trailerRaw)) return true;
  if (ENABLE_YOUTUBE_HERO && toYoutubeHeroEmbed(trailerRaw)) return true;

  const videoRaw = String(movie.videoUrl ?? "").trim();
  if (DIRECT_VIDEO_PATTERN.test(videoRaw)) return true;
  return ENABLE_YOUTUBE_HERO && Boolean(toYoutubeHeroEmbed(videoRaw));
}

function normalizeText(value?: string): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0111\u0110]/g, "d")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getBannerSearchText(movie?: Partial<movieState> | null): string {
  if (!movie) return "";

  return normalizeText([
    movie.title,
    movie.slug,
    movie.code,
  ].filter(Boolean).join(" "));
}

function getBannerDedupKey(movie?: Partial<movieState> | null): string {
  if (!movie) return "";

  const normalizedTitle = normalizeText(movie.title);
  if (normalizedTitle) return normalizedTitle;

  const normalizedSlug = normalizeText(movie.slug);
  if (normalizedSlug) return normalizedSlug;

  const normalizedCode = normalizeText(movie.code);
  if (normalizedCode) return normalizedCode;

  return String(movie.id || "").trim();
}

function movieMatchesAnyKeyword(
  movie: Partial<movieState> | null | undefined,
  keywords: readonly string[] | undefined
): boolean {
  if (!keywords || keywords.length === 0) return false;
  if (!movie) return false;
  const searchText = getBannerSearchText(movie);
  if (!searchText) return false;

  return keywords.some((keyword) => searchText.includes(normalizeText(keyword)));
}

function movieHasAnyKeyword(
  movie: Partial<movieState> | null | undefined,
  keywords: readonly string[] | undefined
): boolean {
  return movieMatchesAnyKeyword(movie, keywords);
}

function isAllowedForBanner(movie?: Partial<movieState> | null): boolean {
  if (!movie) return false;
  const status = String(movie.status || "").toLowerCase();
  if (status !== "published") return false;
  if (movieMatchesAnyKeyword(movie, BLOCKED_BANNER_KEYWORDS)) return false;
  return true;
}

function hasRenderableBannerMedia(movie?: Partial<movieState> | null): boolean {
  if (!movie) return false;

  if (hasMotionHeroMedia(movie)) return true;

  const imageSrc = resolveBannerSource(movie);
  return Boolean(imageSrc && imageSrc !== "/images/default-slate.png");
}

function buildPreferredBannerPool(movies: movieState[]): movieState[] {
  const selected: movieState[] = [];
  const seenBannerKeys = new Set<string>();

  for (const group of PREFERRED_BANNER_GROUPS) {
    const groupCandidates = movies.filter((movie) => (
      isAllowedForBanner(movie)
      && movieMatchesAnyKeyword(movie, group.keywords)
      && !movieHasAnyKeyword(movie, group.blockedKeywords)
      && hasRenderableBannerMedia(movie)
    ));
    if (!groupCandidates.length) continue;

    const preferredCandidates = groupCandidates.filter((movie) => (
      movieMatchesAnyKeyword(movie, group.preferredKeywords)
    ));
    const sourcePool = preferredCandidates.length ? preferredCandidates : groupCandidates;
    const motionCandidates = sourcePool.filter((movie) => hasMotionHeroMedia(movie));
    const pickedMovie = (motionCandidates.length ? motionCandidates : sourcePool)[0];
    const bannerKey = getBannerDedupKey(pickedMovie);

    if (!bannerKey || seenBannerKeys.has(bannerKey)) continue;
    seenBannerKeys.add(bannerKey);
    selected.push(pickedMovie);
  }

  return selected;
}

function dedupeBannerMovies(movies: movieState[]): movieState[] {
  const seenBannerKeys = new Set<string>();

  return movies.filter((movie) => {
    const bannerKey = getBannerDedupKey(movie);
    if (!bannerKey || seenBannerKeys.has(bannerKey)) return false;
    seenBannerKeys.add(bannerKey);
    return true;
  });
}

const Billboard: React.FC = () => {
  const moviesList = useAppSelector((state) => state.movies.movies);
  const dispatch = useAppDispatch();
  const getMovie = useGetSingleMovie();

  const [mediaRatioByMovieId, setMediaRatioByMovieId] = useState<Record<string, number>>({});
  const [heroIndexSeed, setHeroIndexSeed] = useState(0);
  const [heroMuted, setHeroMuted] = useState(true);
  const directHeroRef = useRef<HTMLVideoElement | null>(null);
  const youtubeHeroRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    moviesList.forEach((movie) => {
      const movieId = String(movie?.id || "");
      if (!movieId || mediaRatioByMovieId[movieId] !== undefined) return;

      const src = resolveBannerSource(movie);
      if (!src) return;

      const probe = new Image();
      probe.onload = () => {
        if (cancelled) return;
        const ratio = probe.naturalWidth > 0 && probe.naturalHeight > 0
          ? probe.naturalWidth / probe.naturalHeight
          : 0;
        setMediaRatioByMovieId((prev) =>
          prev[movieId] !== undefined ? prev : { ...prev, [movieId]: ratio }
        );
      };
      probe.onerror = () => {
        if (cancelled) return;
        setMediaRatioByMovieId((prev) =>
          prev[movieId] !== undefined ? prev : { ...prev, [movieId]: 0 }
        );
      };
      probe.src = src;
    });

    return () => {
      cancelled = true;
    };
  }, [mediaRatioByMovieId, moviesList]);

  const bannerCandidates = useMemo(() => {
    if (!moviesList || moviesList.length === 0) return [];
    const allowedBannerMovies = dedupeBannerMovies(
      moviesList.filter((movie) => isAllowedForBanner(movie))
    );
    if (!allowedBannerMovies.length) return [];

    const wideMovies = allowedBannerMovies.filter((movie) => {
      const movieId = String(movie?.id || "");
      const ratio = mediaRatioByMovieId[movieId];
      return typeof ratio === "number" && ratio >= WIDE_BANNER_MIN_RATIO;
    });

    // If wide-banner pool is too small, fallback to full list to avoid repeating only a few titles.
    return wideMovies.length >= Math.min(MIN_WIDE_BANNER_POOL, allowedBannerMovies.length)
      ? wideMovies
      : allowedBannerMovies;
  }, [mediaRatioByMovieId, moviesList]);

  const rotationPool = useMemo(() => {
    // Preferred groups should be resolved from full movie list so portrait posters
    // (e.g., Doctor Slump) are not dropped by wide-ratio filtering.
    const preferredBannerPool = buildPreferredBannerPool(moviesList);
    if (preferredBannerPool.length >= HERO_ROTATION_POOL_SIZE) {
      return preferredBannerPool.slice(0, HERO_ROTATION_POOL_SIZE);
    }

    const selectedBannerKeys = new Set(
      preferredBannerPool.map((movie) => getBannerDedupKey(movie))
    );

    const fillerCandidates = bannerCandidates.filter((movie) => {
      const bannerKey = getBannerDedupKey(movie);
      if (!bannerKey || selectedBannerKeys.has(bannerKey)) return false;
      return hasRenderableBannerMedia(movie);
    });

    return [...preferredBannerPool, ...fillerCandidates].slice(0, HERO_ROTATION_POOL_SIZE);
  }, [bannerCandidates, moviesList]);

  const rotationPoolSize = rotationPool.length;
  const currentHeroIndex = useMemo(() => {
    if (!rotationPoolSize) return 0;
    return ((heroIndexSeed % rotationPoolSize) + rotationPoolSize) % rotationPoolSize;
  }, [heroIndexSeed, rotationPoolSize]);

  const randomMovie = useMemo(() => {
    if (!rotationPool.length) return undefined;

    return rotationPool[currentHeroIndex];
  }, [currentHeroIndex, rotationPool]);

  const heroRotateIntervalMs = Number.isFinite(parsedHeroRotateMs)
    ? Math.max(8000, Math.floor(parsedHeroRotateMs))
    : HERO_DEFAULT_TRAILER_DURATION_SECONDS * 1000;

  useEffect(() => {
    if (rotationPoolSize <= 1) return;

    const timer = window.setInterval(() => {
      setHeroIndexSeed((prev) => prev + 1);
    }, heroRotateIntervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [heroRotateIntervalMs, rotationPoolSize]);

  const mediaPoster = useMemo(() => {
    return resolveBannerSource(randomMovie);
  }, [randomMovie]);

  const directVideoUrl = useMemo(() => {
    const trailerRaw = String(randomMovie?.trailerUrl || "").trim();
    if (DIRECT_VIDEO_PATTERN.test(trailerRaw)) return trailerRaw;

    const videoRaw = String(randomMovie?.videoUrl ?? "").trim();
    return DIRECT_VIDEO_PATTERN.test(videoRaw) ? videoRaw : "";
  }, [randomMovie?.trailerUrl, randomMovie?.videoUrl]);

  const youtubeHeroUrl = useMemo(() => {
    if (!ENABLE_YOUTUBE_HERO) return "";
    const trailerEmbed = toYoutubeHeroEmbed(randomMovie?.trailerUrl);
    const baseEmbed = trailerEmbed || toYoutubeHeroEmbed(randomMovie?.videoUrl);
    if (!baseEmbed) return "";
    return baseEmbed;
  }, [randomMovie?.trailerUrl, randomMovie?.videoUrl]);
  const activeMediaKey = `${String(randomMovie?.id || "none")}::${directVideoUrl || youtubeHeroUrl || mediaPoster}`;
  const canToggleHeroAudio = Boolean(directVideoUrl || youtubeHeroUrl);
  const activeMovieRatio = randomMovie ? mediaRatioByMovieId[String(randomMovie.id)] : undefined;

  const sendYoutubeHeroCommand = useCallback((func: string, args: unknown[] = []) => {
    const frame = youtubeHeroRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  }, []);

  const applyYoutubeHeroAudioState = useCallback(() => {
    if (!youtubeHeroUrl) return;
    sendYoutubeHeroCommand(heroMuted ? "mute" : "unMute");
    if (!heroMuted) {
      sendYoutubeHeroCommand("setVolume", [HERO_UNMUTED_VOLUME]);
    }
  }, [heroMuted, sendYoutubeHeroCommand, youtubeHeroUrl]);

  const handleYoutubeHeroLoad = useCallback(() => {
    window.setTimeout(() => {
      applyYoutubeHeroAudioState();
    }, 120);
  }, [applyYoutubeHeroAudioState]);

  useEffect(() => {
    const player = directHeroRef.current;
    if (!player) return;
    player.muted = heroMuted;
    player.volume = heroMuted ? 0 : 1;
  }, [heroMuted, directVideoUrl]);

  useEffect(() => {
    applyYoutubeHeroAudioState();
  }, [applyYoutubeHeroAudioState]);

  const toggleHeroMute = useCallback(() => {
    if (!canToggleHeroAudio) return;
    setHeroMuted((prev) => !prev);
  }, [canToggleHeroAudio]);

  const goToHeroIndex = useCallback((targetIndex: number) => {
    if (rotationPoolSize <= 0) return;
    const normalizedTarget = ((targetIndex % rotationPoolSize) + rotationPoolSize) % rotationPoolSize;
    setHeroIndexSeed((prev) => {
      const current = ((prev % rotationPoolSize) + rotationPoolSize) % rotationPoolSize;
      return prev + (normalizedTarget - current);
    });
  }, [rotationPoolSize]);

  const goToPrevHero = useCallback(() => {
    if (rotationPoolSize <= 1) return;
    setHeroIndexSeed((prev) => prev - 1);
  }, [rotationPoolSize]);

  const goToNextHero = useCallback(() => {
    if (rotationPoolSize <= 1) return;
    setHeroIndexSeed((prev) => prev + 1);
  }, [rotationPoolSize]);

  const handleDirectHeroTimeUpdate = useCallback(() => {
    const player = directHeroRef.current;
    if (!player) return;
    if (player.currentTime < HERO_DEFAULT_TRAILER_DURATION_SECONDS) return;
    player.currentTime = 0;
    if (!player.paused) {
      void player.play().catch(() => {});
    }
  }, []);

  const useContainForPoster = !directVideoUrl
    && !youtubeHeroUrl
    && typeof activeMovieRatio === "number"
    && activeMovieRatio > 0
    && activeMovieRatio < WIDE_BANNER_MIN_RATIO;

  const posterStyle = useMemo<React.CSSProperties>(() => {
    if (!useContainForPoster) return HERO_MEDIA_STYLE;
    return {
      objectFit: "contain",
      objectPosition: "center center",
    };
  }, [useContainForPoster]);

  const clickInfoHandler = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const movie = getMovie(id);
    if (!movie) return;

    const movieStateData: movieState[] = [{
      id: movie.id,
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
      cast: movie.cast,
      status: movie.status,
      ageRating: movie.ageRating,
      releaseDate: movie.releaseDate,
      imageUrl: movie.imageUrl,
      posterUrl: movie.posterUrl,
      backdropUrl: movie.backdropUrl,
      trailerUrl: movie.trailerUrl,
      tags: movie.tags,
      subtitles: movie.subtitles,
      categories: movie.categories,
    }];
    dispatch(movieActions.showModal(movieStateData));
  };

  if (!randomMovie) return null;

  return (
    <section className="relative h-[65vh] md:h-[70vh] lg:h-[75vh]">
      <div className="relative h-full w-full overflow-hidden">
        {useContainForPoster && (
          <img
            src={mediaPoster}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover object-center scale-105 opacity-35"
          />
        )}

        {directVideoUrl ? (
          <video
            key={activeMediaKey}
            ref={directHeroRef}
            className="pointer-events-none absolute inset-0 w-full h-full z-[1] brightness-[1.08] contrast-[1.06] saturate-[1.06]"
            style={HERO_MEDIA_STYLE}
            autoPlay
            muted={heroMuted}
            loop
            playsInline
            preload="metadata"
            poster={mediaPoster}
            src={directVideoUrl}
            onTimeUpdate={handleDirectHeroTimeUpdate}
          />
        ) : youtubeHeroUrl ? (
          <div className="pointer-events-none absolute inset-0 w-full h-full z-[1] overflow-hidden">
            <iframe
              key={activeMediaKey}
              ref={youtubeHeroRef}
              className="pointer-events-none absolute -top-[11%] -left-[8%] h-[122%] w-[116%] brightness-[1.08] contrast-[1.06] saturate-[1.06]"
              src={youtubeHeroUrl}
              title={randomMovie.title || "Hero trailer"}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              onLoad={handleYoutubeHeroLoad}
            />
          </div>
        ) : (
          <img
            src={mediaPoster}
            alt={randomMovie.title || "Poster"}
            className="absolute inset-0 w-full h-full z-[1] brightness-[1.08] contrast-[1.06] saturate-[1.06]"
            style={posterStyle}
          />
        )}

        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-transparent via-transparent to-transparent" />
        {/* Removed side gradient overlay for fullscreen effect */}
        <div className="absolute inset-x-0 bottom-0 h-56 md:h-72 bg-gradient-to-t from-black/88 via-black/58 to-transparent" />
        {canToggleHeroAudio ? (
          <div className="group absolute right-4 md:right-8 bottom-[30%] z-20 flex flex-col items-center gap-2">
            <div className="pointer-events-none rounded-md bg-black/80 px-3 py-1.5 text-xs font-semibold text-white opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
              {heroMuted ? "Bật tiếng" : "Tắt tiếng"}
            </div>
            <button
              type="button"
              onClick={toggleHeroMute}
              className={`h-14 w-14 rounded-full backdrop-blur-sm border flex items-center justify-center transition-all duration-200 hover:scale-105 ${
                heroMuted
                  ? "bg-black/70 border-white/20 text-white hover:bg-red-500/30 hover:border-red-300/60 hover:text-red-200"
                  : "bg-black/70 border-white/20 text-white hover:bg-red-500/30 hover:border-red-300/60 hover:text-red-200"
              }`}
              aria-label={heroMuted ? "Bật âm thanh banner" : "Tắt âm thanh banner"}
            >
              {heroMuted ? <IoVolumeMuteOutline size={24} /> : <IoVolumeHighOutline size={24} />}
            </button>
          </div>
        ) : null}

        {rotationPoolSize > 1 ? (
          <div className="absolute right-4 md:right-8 bottom-8 md:bottom-10 z-20 flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1.5 backdrop-blur-sm">
              {rotationPool.map((movie, index) => {
                const isActive = index === currentHeroIndex;
                return (
                  <button
                    key={`hero-dot-${String(movie?.id || index)}`}
                    type="button"
                    onClick={() => goToHeroIndex(index)}
                    className={`h-2 rounded-full transition-all duration-200 ${
                      isActive ? "w-8 bg-white" : "w-3.5 bg-white/40 hover:bg-white/70"
                    }`}
                    aria-label={`Chuyen den banner ${index + 1}`}
                  />
                );
              })}
            </div>

            <button
              type="button"
              onClick={goToPrevHero}
              className="h-10 w-10 rounded-full border border-white/80 bg-black/40 text-white flex items-center justify-center hover:bg-white/10 transition-all duration-200"
              aria-label="Banner truoc"
            >
              <BsChevronLeft size={22} />
            </button>

            <button
              type="button"
              onClick={goToNextHero}
              className="h-10 w-10 rounded-full border border-white/80 bg-black/40 text-white flex items-center justify-center hover:bg-white/10 transition-all duration-200"
              aria-label="Banner tiep theo"
            >
              <BsChevronRight size={22} />
            </button>
          </div>
        ) : null}

        <div className="absolute left-6 md:left-20 lg:left-24 bottom-[25%] md:bottom-[30%] z-10 max-w-[90%] lg:max-w-[45%]">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs md:text-sm text-white/85">
            {randomMovie.genre && (
              <span className="rounded bg-white/15 px-2 py-1">
                {randomMovie.genre}
              </span>
            )}
            {randomMovie.duration ? <span>{randomMovie.duration} phút</span> : null}
          </div>

          <h1 className="text-white text-3xl md:text-5xl lg:text-6xl font-bold drop-shadow-2xl leading-tight mb-3 md:mb-5">
            {randomMovie.title}
          </h1>

          <p className="text-white text-sm md:text-base lg:text-lg drop-shadow-xl line-clamp-3 leading-relaxed mb-2 md:mb-3">
            {randomMovie.description}
          </p>

          <div className="flex items-center mt-5 md:mt-8 gap-3">
            <PlayButton movieId={randomMovie.id as string} />

            <button
              onClick={clickInfoHandler}
              data-id={randomMovie.id}
              className="
                group
                bg-white/30 text-white backdrop-blur-sm
                rounded-md py-2 md:py-2.5 px-4 md:px-6
                text-sm lg:text-base font-semibold
                flex items-center gap-2
                hover:bg-white/40 transition-all duration-200
                hover:-translate-y-1
                hover:shadow-[0_12px_26px_rgba(0,0,0,0.35)]
                shadow-lg
              "
            >
              <AiOutlineInfoCircle className="text-lg md:text-xl transition-colors duration-200 group-hover:text-red-600" />
              <span className="transition-colors duration-200 group-hover:text-red-600">More Info</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Billboard;


