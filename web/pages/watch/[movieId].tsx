import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import { AiFillStar, AiOutlineArrowLeft, AiOutlineClose, AiOutlineHeart, AiOutlineStar } from "react-icons/ai";
import { BiCommentDetail, BiRedo, BiShareAlt, BiUndo } from "react-icons/bi";
import { BsBell, BsChevronDown, BsPauseFill, BsPlayFill, BsSearch } from "react-icons/bs";

import { IoSettingsOutline, IoVolumeHighOutline, IoVolumeMuteOutline } from "react-icons/io5";
import { MdClosedCaption } from "react-icons/md";
import { MdFullscreen, MdFullscreenExit } from "react-icons/md";
import useMovie from "../../hooks/useMovie";
import useCurrentUser from "../../hooks/useCurrentUser";
import { getBrandIntroUrl } from "../../libs/brandIntro";
import AccountMenu from "../../components/AccountMenu";
import CommentSection from "../../components/CommentSection";
import HorizontalMovieList from "../../components/HorizontalMovieList";
import IntroN from "../../components/IntroN";
import useMovieList from "../../hooks/useMovieList";
import useFavorites from "../../hooks/useFavorites";
import { buildWatchPath, getWatchIntroAudioIntentKey, navigateToWatch } from "../../libs/watchNavigation";

type RatingApiResponse = {
  movieId: string;
  averageRating: number;
  ratingCount: number;
  userRating: number | null;
};

type FavoriteCountApiResponse = {
  movieId: string;
  favoriteCount: number;
};

const DIRECT_VIDEO_PATTERN = /\.(mp4|webm|ogg|m3u8)(\?.*)?$/i;
const parsedIntroSkipSeconds = Number(process.env.NEXT_PUBLIC_INTRO_SKIP_SECONDS);
const INTRO_SKIP_SECONDS = Number.isFinite(parsedIntroSkipSeconds)
  ? Math.max(0, Math.floor(parsedIntroSkipSeconds))
  : 0;
const BRAND_INTRO_URL = getBrandIntroUrl();
const parsedBrandIntroDurationMs = Number(
  process.env.NEXT_PUBLIC_BRAND_INTRO_DURATION_MS ?? process.env.NEXT_PUBLIC_INTRO_DURATION_MS
);
const INTRO_DURATION_MS = Number.isFinite(parsedBrandIntroDurationMs)
  ? Math.max(0, Math.floor(parsedBrandIntroDurationMs))
  : 4000;
const WATCH_LOCK_PLAYER_CONTROLS = (
  process.env.NEXT_PUBLIC_WATCH_LOCK_PLAYER_CONTROLS
  ?? "0"
) === "1";
const ALLOW_YOUTUBE_WATCH_EMBED = (
  process.env.NEXT_PUBLIC_ALLOW_YOUTUBE_WATCH_EMBED
  ?? "1"
) === "1";
const WATCH_AUTOPLAY_MUTED = (process.env.NEXT_PUBLIC_WATCH_AUTOPLAY_MUTED ?? "0") === "1";
const parsedWatchYoutubeEndOverlaySeconds = Number(process.env.NEXT_PUBLIC_WATCH_YT_END_OVERLAY_SECONDS ?? "0.8");
const WATCH_YOUTUBE_END_OVERLAY_SECONDS = Number.isFinite(parsedWatchYoutubeEndOverlaySeconds)
  ? Math.max(0, parsedWatchYoutubeEndOverlaySeconds)
  : 0.8;
const SHARE_PUBLIC_BASE_URL = (process.env.NEXT_PUBLIC_SHARE_BASE_URL ?? "").trim();
const WATCH_INTRO_COMPLETED_KEYS = new Set<string>();
type YoutubePlaybackQuality = "auto" | "hd1080" | "hd720" | "large" | "medium" | "small" | "tiny";
type DirectSubtitleTrack = {
  src: string;
  label: string;
  srclang: string;
  isDefault: boolean;
};

const YOUTUBE_QUALITY_OPTIONS: Array<{ value: YoutubePlaybackQuality; label: string }> = [
  { value: "auto", label: "Tự động" },
  { value: "hd1080", label: "1080p" },
  { value: "hd720", label: "720p" },
  { value: "large", label: "480p" },
  { value: "medium", label: "360p" },
  { value: "small", label: "240p" },
  { value: "tiny", label: "144p" },
];

function pickFirstNonEmptyString(input: unknown, keys: readonly string[]): string {
  if (!input || typeof input !== "object") return "";
  const record = input as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

function pickFirstFiniteNumber(input: unknown, keys: readonly string[]): number | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.trim().replace(/[^\d.]/g, ""));
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
  }

  return null;
}

function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "00:00";
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeYoutubeQuality(value: unknown): YoutubePlaybackQuality | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "default" || normalized === "auto") return "auto";
  if (normalized === "highres") return "hd1080";
  if (
    normalized === "hd1080"
    || normalized === "hd720"
    || normalized === "large"
    || normalized === "medium"
    || normalized === "small"
    || normalized === "tiny"
  ) {
    return normalized;
  }
  return null;
}

function formatRatingCountLabel(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return "Chưa có đánh giá";
  const normalized = Math.max(0, Math.floor(count));
  const formatted = new Intl.NumberFormat("vi-VN").format(normalized);
  return `${formatted} lượt đánh giá`;
}

function applyYoutubePlayerParams(url: URL) {
  // Keep YouTube embed params minimal for compatibility.
  // Support both autoplay and manual-start modes.
  const shouldAutoplay = url.searchParams.get("autoplay") !== "0";
  url.searchParams.set("autoplay", shouldAutoplay ? "1" : "0");
  url.searchParams.set("mute", WATCH_AUTOPLAY_MUTED ? "1" : "0");
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("rel", "0");
  url.searchParams.set("enablejsapi", "1");
  // Hide native YouTube controls to keep the custom watch UI consistent.
  url.searchParams.set("controls", "0");
  url.searchParams.set("disablekb", "1");
  url.searchParams.set("fs", "0");
  url.searchParams.set("modestbranding", "1");
  url.searchParams.set("iv_load_policy", "3");
  if (typeof window !== "undefined") {
    url.searchParams.set("origin", window.location.origin);
  }
}

function toYoutubeEmbed(raw: string, autoplay = true): string {
  try {
    const u = new URL(raw.trim());
    const buildEmbed = (id: string) => {
      const embed = new URL(`https://www.youtube.com/embed/${id}`);
      embed.searchParams.set("autoplay", autoplay ? "1" : "0");
      applyYoutubePlayerParams(embed);
      return embed.toString();
    };

    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return buildEmbed(id);

      if (u.pathname.startsWith("/shorts/")) {
        const shortId = u.pathname.split("/")[2];
        if (shortId) return buildEmbed(shortId);
      }

      if (u.pathname.startsWith("/embed/")) {
        const embedId = u.pathname.split("/")[2];
        if (embedId) return buildEmbed(embedId);
      }
    }

    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      if (id) return buildEmbed(id);
    }

    return "";
  } catch {
    return "";
  }
}

function toYoutubeWatchUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    const buildWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;

    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return buildWatchUrl(id);

      if (u.pathname.startsWith("/shorts/")) {
        const shortId = u.pathname.split("/")[2];
        if (shortId) return buildWatchUrl(shortId);
      }

      if (u.pathname.startsWith("/embed/")) {
        const embedId = u.pathname.split("/")[2];
        if (embedId) return buildWatchUrl(embedId);
      }
    }

    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      if (id) return buildWatchUrl(id);
    }

    return raw.trim();
  } catch {
    return raw.trim();
  }
}

function getYoutubeEmbedIssueMessage(code: number | null): string {
  if (code === 101 || code === 150) {
    return "Video nay bi YouTube chan nhung hoac gioi han do tuoi, nen khong the phat truc tiep trong Nextflix.";
  }

  if (code === 100) {
    return "Video YouTube nay khong con kha dung hoac da duoc dat rieng tu.";
  }

  if (code === 2 || code === 5) {
    return "Video YouTube nay khong ho tro phat inline on dinh trong player hien tai.";
  }

  return "Video YouTube nay khong the phat trong khung nhung. Ban co the mo truc tiep tren YouTube.";
}

function isYoutubeUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    return (
      u.hostname.includes("youtube.com")
      || u.hostname.includes("youtube-nocookie.com")
      || u.hostname.includes("youtu.be")
    );
  } catch {
    return false;
  }
}

function isLikelyDirectVideoUrl(raw: string): boolean {
  const value = String(raw || "").trim();
  if (!value) return false;
  if (/ref_=tt_ov_i/i.test(value)) return false;
  if (DIRECT_VIDEO_PATTERN.test(value)) return true;
  if (isYoutubeUrl(value)) return false;
  // Accept HTTP(S) URLs without extension (many CDN signed URLs are like this),
  // but reject known non-media pages.
  if (!/^https?:\/\//i.test(value)) return false;

  try {
    const parsed = new URL(value);
    if (parsed.hostname.includes("imdb.com")) return false;
  } catch {
    return false;
  }

  return true;
}

function toLanguageCode(raw: string): string {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return "vi";
  if (value.includes("viet")) return "vi";
  if (value.includes("anh") || value.includes("english")) return "en";
  if (value.includes("korean") || value.includes("han")) return "ko";
  if (value.includes("japan") || value.includes("nhat")) return "ja";
  if (value.includes("chinese") || value.includes("trung")) return "zh";
  return value.slice(0, 2);
}

function buildDirectSubtitleTracks(movie: unknown): DirectSubtitleTrack[] {
  if (!movie || typeof movie !== "object") return [];
  const record = movie as Record<string, unknown>;

  const fromSubtitleTracks = Array.isArray(record.subtitleTracks) ? record.subtitleTracks : [];
  const fromSubtitleUrls = Array.isArray(record.subtitleUrls) ? record.subtitleUrls : [];
  const fromSubtitles = Array.isArray(record.subtitles) ? record.subtitles : [];

  const combined = [...fromSubtitleTracks, ...fromSubtitleUrls, ...fromSubtitles];
  const results: DirectSubtitleTrack[] = [];
  const seenSrc = new Set<string>();

  combined.forEach((item, index) => {
    if (item && typeof item === "object") {
      const data = item as Record<string, unknown>;
      const src = String(data.src || data.url || "").trim();
      if (!src || seenSrc.has(src)) return;
      if (!/^https?:\/\//i.test(src) && !src.startsWith("/")) return;
      seenSrc.add(src);
      const label = String(data.label || data.language || `Subtitle ${results.length + 1}`).trim();
      const srclang = toLanguageCode(String(data.srclang || data.lang || label));
      const isDefault = Boolean(data.default ?? index === 0);
      results.push({ src, label, srclang, isDefault });
      return;
    }

    if (typeof item !== "string") return;
    const raw = item.trim();
    if (!raw) return;

    let label = "";
    let src = "";
    if (raw.includes("|")) {
      const [left, right] = raw.split("|", 2);
      label = String(left || "").trim();
      src = String(right || "").trim();
    } else if (/^https?:\/\//i.test(raw) || raw.startsWith("/")) {
      src = raw;
    }

    if (!src || seenSrc.has(src)) return;
    if (!/\.(vtt|srt|ass|ssa|ttml|dfxp)(\?.*)?$/i.test(src)) return;
    seenSrc.add(src);
    const fallbackLabel = label || `Subtitle ${results.length + 1}`;
    results.push({
      src,
      label: fallbackLabel,
      srclang: toLanguageCode(fallbackLabel),
      isDefault: index === 0,
    });
  });

  return results;
}

function withYoutubeStart(embedUrl: string, startSeconds: number): string {
  if (!embedUrl || startSeconds <= 0) return embedUrl;

  try {
    const parsed = new URL(embedUrl);
    const isYoutubeEmbed = (
      parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtube-nocookie.com")
    ) && parsed.pathname.includes("/embed/");
    if (!isYoutubeEmbed) return embedUrl;

    if (!parsed.searchParams.has("start")) {
      parsed.searchParams.set("start", String(startSeconds));
    }

    return parsed.toString();
  } catch {
    return embedUrl;
  }
}

function isReloadNavigationInBrowser(): boolean {
  // Keep autoplay behavior consistent on initial open and reload.
  return false;
}

const WatchPage = () => {
  const router = useRouter();
  const { movieId, mode } = router.query as { movieId?: string; mode?: string };
  const shouldStartPausedAfterReload = useMemo(() => isReloadNavigationInBrowser(), []);

  const [completedIntroKey, setCompletedIntroKey] = useState("");
  const [headerMode, setHeaderMode] = useState<"brand" | "title">("brand");
  const [playerCurrentTime, setPlayerCurrentTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);
  const [playerIsPlaying, setPlayerIsPlaying] = useState(true);
  const [playerIsMuted, setPlayerIsMuted] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playbackQuality, setPlaybackQuality] = useState<YoutubePlaybackQuality>("auto");
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [favoriteSubmitting, setFavoriteSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerVolume, setPlayerVolume] = useState(1);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showYoutubeEndOverlay, setShowYoutubeEndOverlay] = useState(false);
  const [showReloadPreviewOverlay, setShowReloadPreviewOverlay] = useState(shouldStartPausedAfterReload);
  const [showPauseMaskOverlay, setShowPauseMaskOverlay] = useState(false);
  const [youtubePlaybackIssue, setYoutubePlaybackIssue] = useState("");
  const [youtubeHasPlaybackSignal, setYoutubeHasPlaybackSignal] = useState(false);

  const lastPlaybackTimeRef = useRef(0);
  const youtubeFrameRef = useRef<HTMLIFrameElement | null>(null);
  const directVideoRef = useRef<HTMLVideoElement | null>(null);
  const commentAnchorRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPlayerSyncAtRef = useRef(0);
  const trackedViewKeyRef = useRef("");

  const validMovieId = movieId && movieId.trim() !== "" ? movieId : null;
  const { data: currentUser, mutate: mutateCurrentUser } = useCurrentUser();
  const { data: movie, isLoading } = useMovie(validMovieId || "");
  const { data: allMovies = [] } = useMovieList();
  const { data: favorites = [] } = useFavorites();
  const isTrailerMode = mode === "trailer";

  const recommendedMoviesRef = useRef<any[]>([]);
  const lastShuffleMovieIdRef = useRef<string | null>(null);

  const recommendedMovies = useMemo(() => {
    if (allMovies.length === 0) return [];
    
    // If we already have a list for this movie, keep it
    if (lastShuffleMovieIdRef.current === validMovieId && recommendedMoviesRef.current.length > 0) {
      return recommendedMoviesRef.current;
    }

    const filtered = allMovies.filter(m => String(m.id) !== String(validMovieId));
    const shuffled = [...filtered].sort(() => 0.5 - Math.random()).slice(0, 10);
    
    recommendedMoviesRef.current = shuffled;
    lastShuffleMovieIdRef.current = validMovieId;
    
    return shuffled;
  }, [allMovies, validMovieId]);

  const movieUrl = useMemo(() => pickFirstNonEmptyString(movie, ["videoUrl", "movieUrl", "video_url"]), [movie]);
  const trailerUrl = useMemo(() => pickFirstNonEmptyString(movie, ["trailerUrl", "trailer_url"]), [movie]);
  const chosenUrl = isTrailerMode ? trailerUrl : movieUrl;

  const introKey = useMemo(() => {
    if (!validMovieId || !chosenUrl) return "";
    return `${validMovieId}:${mode || "movie"}`;
  }, [validMovieId, chosenUrl, mode]);

  const shouldForceIntroAudio = useMemo(() => {
    if (!introKey || typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem(getWatchIntroAudioIntentKey(introKey)) === "1";
    } catch {
      return false;
    }
  }, [introKey]);

  // Keep repeated auto-open and reload flows muted, but preserve audio for explicit watch clicks.
  const introIsMuted = useMemo(() => {
    if (!introKey) return false;
    if (shouldForceIntroAudio) return false;
    try {
      const storageKey = `nextflix:watch_intro_run_count:${introKey}`;
      const runCountStr = window.sessionStorage.getItem(storageKey);
      const runCount = runCountStr ? parseInt(runCountStr, 10) : 0;
      return runCount > 0;
    } catch {
      return false;
    }
  }, [introKey, shouldForceIntroAudio]);

  useEffect(() => {
    if (!introKey || typeof window === "undefined") return;
    try {
      window.sessionStorage.removeItem(getWatchIntroAudioIntentKey(introKey));
    } catch {
      // Ignore storage cleanup failures.
    }
  }, [introKey]);

  const showPlaybackIntro = Boolean(introKey)
    && completedIntroKey !== introKey
    && !WATCH_INTRO_COMPLETED_KEYS.has(introKey);
  const playbackSourceUrl = showPlaybackIntro ? "" : chosenUrl;

  const isDirectVideo = useMemo(() => isLikelyDirectVideoUrl(playbackSourceUrl), [playbackSourceUrl]);
  const trailerEmbedUrl = useMemo(() => {
    if (!playbackSourceUrl || !ALLOW_YOUTUBE_WATCH_EMBED) return "";
    return toYoutubeEmbed(playbackSourceUrl, !shouldStartPausedAfterReload);
  }, [playbackSourceUrl, shouldStartPausedAfterReload]);
  const fallbackDurationSeconds = useMemo(() => {
    const rawDuration = pickFirstFiniteNumber(movie, ["duration", "runtime", "movieDuration"]);
    if (!rawDuration || rawDuration <= 0) return 0;

    if (isTrailerMode) {
      // Trailer data can come as seconds from legacy sources.
      return rawDuration <= 30 ? rawDuration * 60 : rawDuration;
    }

    // Admin duration field is minutes for full movies.
    return rawDuration <= 600 ? rawDuration * 60 : rawDuration;
  }, [isTrailerMode, movie]);
  const playbackEmbedUrl = useMemo(() => trailerEmbedUrl, [trailerEmbedUrl]);
  const isYouTubeSource = useMemo(() => isYoutubeUrl(playbackSourceUrl), [playbackSourceUrl]);
  const youtubeWatchUrl = useMemo(() => {
    if (!chosenUrl || !isYoutubeUrl(chosenUrl)) return "";
    return toYoutubeWatchUrl(chosenUrl);
  }, [chosenUrl]);
  const isPlayableSurface = Boolean(playbackSourceUrl) && (isDirectVideo || Boolean(playbackEmbedUrl));
  const directSubtitleTracks = useMemo(() => buildDirectSubtitleTracks(movie), [movie]);
  const canToggleCaptions = isDirectVideo
    ? directSubtitleTracks.length > 0
    : Boolean(playbackEmbedUrl);

  const rawViewCount = useMemo(() => {
    return pickFirstFiniteNumber(movie, ["viewCount", "views", "view_count"]);
  }, [movie]);
  const displayedViewCount = rawViewCount && rawViewCount > 0 ? rawViewCount : 0;
  const formattedViewCount = useMemo(
    () => new Intl.NumberFormat("vi-VN").format(Math.floor(displayedViewCount)),
    [displayedViewCount]
  );
  const isFavorite = useMemo(() => {
    if (!validMovieId) return false;
    const favoriteIds = currentUser?.favoriteIds;
    const ids = Array.isArray(favoriteIds) ? favoriteIds : [];
    return ids.includes(validMovieId);
  }, [currentUser?.favoriteIds, validMovieId]);
  const progressPercent = useMemo(() => {
    if (!Number.isFinite(playerDuration) || playerDuration <= 0) return 0;
    const percent = (playerCurrentTime / playerDuration) * 100;
    return Math.max(0, Math.min(100, percent));
  }, [playerCurrentTime, playerDuration]);
  const progressTrackStyle = useMemo<React.CSSProperties>(() => ({
    background: `linear-gradient(to right, #e50914 0%, #e50914 ${progressPercent}%, rgba(255,255,255,0.26) ${progressPercent}%, rgba(255,255,255,0.26) 100%)`,
  }), [progressPercent]);
  const volumePercent = useMemo(
    () => Math.max(0, Math.min(100, (playerIsMuted ? 0 : playerVolume) * 100)),
    [playerIsMuted, playerVolume]
  );
  const volumeTrackStyle = useMemo<React.CSSProperties>(() => ({
    background: `linear-gradient(to right, #e50914 0%, #e50914 ${volumePercent}%, rgba(255,255,255,0.28) ${volumePercent}%, rgba(255,255,255,0.28) 100%)`,
  }), [volumePercent]);
  const favoriteCountLabel = useMemo(
    () => new Intl.NumberFormat("vi-VN").format(Math.max(0, favoriteCount)),
    [favoriteCount]
  );
  const ratingCountLabel = useMemo(
    () => formatRatingCountLabel(ratingCount),
    [ratingCount]
  );
  const sharePath = useMemo(() => {
    if (!validMovieId) return "/watch";
    return buildWatchPath(validMovieId, isTrailerMode ? "trailer" : "movie");
  }, [isTrailerMode, validMovieId]);
  const shareOrigin = useMemo(() => {
    if (SHARE_PUBLIC_BASE_URL) {
      try {
        return new URL(SHARE_PUBLIC_BASE_URL).origin;
      } catch {
        // fallback below
      }
    }
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "";
  }, []);
  const shareUrl = useMemo(() => {
    if (!shareOrigin) return "";
    return `${shareOrigin}${sharePath}`;
  }, [shareOrigin, sharePath]);
  const shareTitle = useMemo(
    () => String(movie?.title || "Nextflix"),
    [movie?.title]
  );
  const shareDescription = useMemo(
    () => String(movie?.description || "Xem phim trên Nextflix").trim(),
    [movie?.description]
  );
  const shareImageRaw = useMemo(
    () => pickFirstNonEmptyString(movie, ["backdropUrl", "thumbnailUrl", "imageUrl", "posterUrl"]),
    [movie]
  );
  const shareImageUrl = useMemo(() => {
    if (!shareImageRaw) return "";
    if (/^https?:\/\//i.test(shareImageRaw)) return shareImageRaw;
    if (!shareOrigin) return "";
    const normalizedPath = shareImageRaw.startsWith("/") ? shareImageRaw : `/${shareImageRaw}`;
    return `${shareOrigin}${normalizedPath}`;
  }, [shareImageRaw, shareOrigin]);
  const playbackPreviewImage = useMemo(() => {
    const raw = pickFirstNonEmptyString(movie, ["thumbnailUrl", "backdropUrl", "imageUrl", "posterUrl"]);
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    return raw.startsWith("/") ? raw : `/${raw}`;
  }, [movie]);

  const sendYoutubeCommand = useCallback((func: string, args: unknown[] = []) => {
    const iframe = youtubeFrameRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  }, []);

  const requestYoutubeSnapshot = useCallback(() => {
    if (!playbackEmbedUrl || isDirectVideo) return;
    sendYoutubeCommand("getCurrentTime");
    sendYoutubeCommand("getDuration");
    sendYoutubeCommand("getVolume");
    sendYoutubeCommand("getPlayerState");
    sendYoutubeCommand("isMuted");
    sendYoutubeCommand("getPlaybackRate");
    sendYoutubeCommand("getPlaybackQuality");
  }, [isDirectVideo, playbackEmbedUrl, sendYoutubeCommand]);

  const initializeYoutubeBridge = useCallback(() => {
    const iframe = youtubeFrameRef.current;
    if (!iframe?.contentWindow || !playbackEmbedUrl || isDirectVideo) return;
    iframe.contentWindow.postMessage(JSON.stringify({ event: "listening", id: "watch-player" }), "*");
    sendYoutubeCommand("addEventListener", ["onStateChange"]);
    sendYoutubeCommand("addEventListener", ["onReady"]);
    sendYoutubeCommand("addEventListener", ["onError"]);
    sendYoutubeCommand("addEventListener", ["onPlaybackRateChange"]);
    sendYoutubeCommand("addEventListener", ["onPlaybackQualityChange"]);
    if (WATCH_AUTOPLAY_MUTED) {
      sendYoutubeCommand("mute");
    }
    if (shouldStartPausedAfterReload) {
      sendYoutubeCommand("seekTo", [0, true]);
      sendYoutubeCommand("pauseVideo");
      setPlayerCurrentTime(0);
      setPlayerIsPlaying(false);
      requestYoutubeSnapshot();
      return;
    }

    sendYoutubeCommand("playVideo");
    requestYoutubeSnapshot();
  }, [isDirectVideo, playbackEmbedUrl, requestYoutubeSnapshot, sendYoutubeCommand, shouldStartPausedAfterReload]);

  useEffect(() => {
    if (isDirectVideo || !playbackEmbedUrl) return;

    if (playerIsMuted) {
      sendYoutubeCommand("mute");
      return;
    }

    sendYoutubeCommand("unMute");
    sendYoutubeCommand("setVolume", [Math.round(Math.max(0, Math.min(1, playerVolume)) * 100)]);
  }, [isDirectVideo, playbackEmbedUrl, playerIsMuted, playerVolume, sendYoutubeCommand]);

  const loadRatings = useCallback(async () => {
    if (!validMovieId) return;
    setRatingsLoading(true);
    try {
      const response = await fetch(`/api/ratings/${validMovieId}`);
      if (!response.ok) return;
      const payload = await response.json() as RatingApiResponse;
      setAverageRating(Number(payload.averageRating || 0));
      setRatingCount(Number(payload.ratingCount || 0));
      setUserRating(typeof payload.userRating === "number" ? payload.userRating : null);
    } catch (error) {
      console.error("Failed to load ratings:", error);
    } finally {
      setRatingsLoading(false);
    }
  }, [validMovieId]);

  const loadFavoriteCount = useCallback(async () => {
    if (!validMovieId) return;
    try {
      const response = await fetch(`/api/favorites/count/${validMovieId}`);
      if (!response.ok) return;
      const payload = await response.json() as FavoriteCountApiResponse;
      setFavoriteCount(Math.max(0, Number(payload.favoriteCount || 0)));
    } catch (error) {
      console.error("Failed to load favorite count:", error);
    }
  }, [validMovieId]);

  const toggleFavorite = useCallback(async () => {
    if (!validMovieId || favoriteSubmitting) return;
    if (!currentUser?.email) {
      router.push("/auth");
      return;
    }

    const nextFavoriteState = !isFavorite;
    setFavoriteSubmitting(true);
    setFavoriteCount((prev) => Math.max(0, prev + (nextFavoriteState ? 1 : -1)));

    try {
      const response = await fetch(nextFavoriteState ? "/api/favorite" : "/api/deletefavorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId: validMovieId }),
      });

      if (response.status === 401) {
        router.push("/auth");
        return;
      }

      if (!response.ok) {
        setFavoriteCount((prev) => Math.max(0, prev + (nextFavoriteState ? -1 : 1)));
        return;
      }

      const payload = await response.json() as { favoriteIds?: string[] };
      const nextFavoriteIds = Array.isArray(payload.favoriteIds) ? payload.favoriteIds : [];
      await mutateCurrentUser(
        {
          ...(currentUser || {}),
          favoriteIds: nextFavoriteIds,
        },
        false
      );
      await loadFavoriteCount();
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      setFavoriteCount((prev) => Math.max(0, prev + (nextFavoriteState ? -1 : 1)));
    } finally {
      setFavoriteSubmitting(false);
    }
  }, [currentUser, favoriteSubmitting, isFavorite, loadFavoriteCount, mutateCurrentUser, router, validMovieId]);

  const submitRating = useCallback(async (value: number) => {
    if (!validMovieId || value < 1 || value > 5) return;
    setRatingSubmitting(true);
    try {
      const response = await fetch(`/api/ratings/${validMovieId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: value }),
      });

      if (response.status === 401) {
        router.push("/auth");
        return;
      }

      if (!response.ok) return;
      const payload = await response.json() as RatingApiResponse;
      setAverageRating(Number(payload.averageRating || 0));
      setRatingCount(Number(payload.ratingCount || 0));
      setUserRating(typeof payload.userRating === "number" ? payload.userRating : value);
    } catch (error) {
      console.error("Failed to submit rating:", error);
    } finally {
      setRatingSubmitting(false);
    }
  }, [router, validMovieId]);

  useEffect(() => {
    if (showPlaybackIntro) return;

    let lastY = window.scrollY;
    const onScroll = () => {
      const currentY = window.scrollY;

      if (currentY <= 24) {
        setHeaderMode("brand");
        lastY = currentY;
        return;
      }

      if (currentY > lastY + 2) setHeaderMode("title");
      if (currentY < lastY - 2) setHeaderMode("brand");
      lastY = currentY;
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [showPlaybackIntro]);

  const handlePlaybackIntroFinished = useCallback(() => {
    if (!introKey) return;
    WATCH_INTRO_COMPLETED_KEYS.add(introKey);
    setCompletedIntroKey((prev) => (prev === introKey ? prev : introKey));
    
    // Increment intro run count for this session
    try {
      const storageKey = `nextflix:watch_intro_run_count:${introKey}`;
      const runCountStr = window.sessionStorage.getItem(storageKey);
      const runCount = runCountStr ? parseInt(runCountStr, 10) : 0;
      window.sessionStorage.setItem(storageKey, String(runCount + 1));
    } catch {
      // Ignore sessionStorage errors
    }
  }, [introKey]);

  useEffect(() => {
    setPlayerCurrentTime(0);
    setPlayerDuration(0);
    setPlayerIsPlaying(!shouldStartPausedAfterReload);
    setPlayerIsMuted(WATCH_AUTOPLAY_MUTED && !isLikelyDirectVideoUrl(chosenUrl || ""));
    setCaptionsEnabled(false);
    setPlaybackRate(1);
    setPlaybackQuality("auto");
    setPlayerVolume(1);
    setShowSettingsPanel(false);
    setShowYoutubeEndOverlay(false);
    setShowReloadPreviewOverlay(shouldStartPausedAfterReload);
    setShowPauseMaskOverlay(false);
    setYoutubePlaybackIssue("");
    setYoutubeHasPlaybackSignal(false);
    lastPlayerSyncAtRef.current = Date.now();
  }, [chosenUrl, fallbackDurationSeconds, showPlaybackIntro, shouldStartPausedAfterReload]);

  useEffect(() => {
    if (isDirectVideo || !playbackEmbedUrl) return;
    if (playerDuration > 0) return;
    if (fallbackDurationSeconds <= 0) return;
    setPlayerDuration(fallbackDurationSeconds);
  }, [fallbackDurationSeconds, isDirectVideo, playbackEmbedUrl, playerDuration]);

  useEffect(() => {
    if (!isDirectVideo || !playbackSourceUrl || showPlaybackIntro) return;
    const player = directVideoRef.current;
    if (!player) return;

    if (shouldStartPausedAfterReload) {
      player.pause();
      try {
        player.currentTime = 0;
      } catch {
        // Ignore seek failures on some stream formats.
      }
      setPlayerCurrentTime(0);
      setPlayerIsPlaying(false);
      setShowReloadPreviewOverlay(true);
      setShowPauseMaskOverlay(false);
      return;
    }

    let cancelled = false;
    const tryAutoPlay = async () => {
      player.muted = false;
      setPlayerIsMuted(false);

      try {
        await player.play();
      } catch {
        if (cancelled) return;
        // Fallback for strict autoplay policies.
        player.muted = true;
        setPlayerIsMuted(true);
        await player.play().catch(() => {});
      }
    };

    const handleCanPlay = () => {
      if (cancelled) return;
      if (!player.paused) return;
      void tryAutoPlay();
    };

    player.addEventListener("canplay", handleCanPlay);
    void tryAutoPlay();
    return () => {
      cancelled = true;
      player.removeEventListener("canplay", handleCanPlay);
    };
  }, [isDirectVideo, playbackSourceUrl, showPlaybackIntro, shouldStartPausedAfterReload]);

  useEffect(() => {
    if (!validMovieId) return;
    void loadRatings();
  }, [loadRatings, validMovieId]);

  useEffect(() => {
    if (!validMovieId) return;
    void loadFavoriteCount();
  }, [loadFavoriteCount, validMovieId]);

  useEffect(() => {
    if (!validMovieId || !chosenUrl || showPlaybackIntro) return;

    const modeKey = isTrailerMode ? "trailer" : "movie";
    const trackKey = `${validMovieId}:${modeKey}`;
    if (trackedViewKeyRef.current === trackKey) return;
    trackedViewKeyRef.current = trackKey;

    void fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movieId: validMovieId,
        eventType: "view",
        mode: modeKey,
      }),
    }).catch(() => {});
  }, [chosenUrl, isTrailerMode, showPlaybackIntro, validMovieId]);

  useEffect(() => () => {
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const syncFullscreenState = () => {
      const activeElement = document.fullscreenElement || (document as any).webkitFullscreenElement;
      setIsFullscreen(Boolean(activeElement));
    };
    const webkitFullscreenListener = syncFullscreenState as EventListener;

    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", webkitFullscreenListener);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener("webkitfullscreenchange", webkitFullscreenListener);
    };
  }, []);

  useEffect(() => {
    if (isDirectVideo || !playbackEmbedUrl) return;

    const onMessage = (event: MessageEvent) => {
      if (!String(event.origin).includes("youtube")) return;
      let payload: any = event.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }

      if (!payload) return;
      if (payload.event === "onReady") {
        if (WATCH_AUTOPLAY_MUTED) {
          sendYoutubeCommand("mute");
        }
        if (shouldStartPausedAfterReload) {
          sendYoutubeCommand("seekTo", [0, true]);
          sendYoutubeCommand("pauseVideo");
          setPlayerCurrentTime(0);
          setPlayerIsPlaying(false);
          setShowReloadPreviewOverlay(true);
          setShowPauseMaskOverlay(false);
          requestYoutubeSnapshot();
          return;
        }
        sendYoutubeCommand("playVideo");
        requestYoutubeSnapshot();
        return;
      }
      if (payload.event === "onError") {
        const errorCode = coerceNumber(payload.info);
        setYoutubePlaybackIssue(getYoutubeEmbedIssueMessage(errorCode));
        setPlayerIsPlaying(false);
        setShowPauseMaskOverlay(false);
        setShowReloadPreviewOverlay(false);
        setShowYoutubeEndOverlay(false);
        return;
      }
      if (payload.event === "onStateChange") {
        const state = coerceNumber(payload.info);
        if (state !== null) {
          if (state === 1 || state === 2) {
            setYoutubeHasPlaybackSignal(true);
            if (youtubePlaybackIssue) setYoutubePlaybackIssue("");
          }
          setPlayerIsPlaying(state === 1);
          if (state === 2) {
            setShowPauseMaskOverlay(true);
            setShowReloadPreviewOverlay(false);
          }
          if (state === 1) {
            setShowPauseMaskOverlay(false);
            setShowReloadPreviewOverlay(false);
          }
          setShowYoutubeEndOverlay(state === 0);
        }
      }
      if (payload.event === "onPlaybackQualityChange") {
        const quality = normalizeYoutubeQuality(payload.info);
        if (quality) setPlaybackQuality(quality);
      }
      if (payload.event !== "infoDelivery" || !payload.info) return;
      const info = payload.info as Record<string, unknown>;

      const currentTime = coerceNumber(info.currentTime);
      if (currentTime !== null && currentTime >= 0) {
        if (currentTime > 0) {
          setYoutubeHasPlaybackSignal(true);
          if (youtubePlaybackIssue) setYoutubePlaybackIssue("");
        }
        setPlayerCurrentTime(currentTime);
        lastPlaybackTimeRef.current = currentTime;
        lastPlayerSyncAtRef.current = Date.now();
      }
      const duration = coerceNumber(info.duration);
      if (duration !== null && duration > 0) {
        setYoutubeHasPlaybackSignal(true);
        if (youtubePlaybackIssue) setYoutubePlaybackIssue("");
        setPlayerDuration(duration);
      }
      if (
        duration !== null
        && duration > 0
        && currentTime !== null
        && currentTime >= Math.max(0, duration - WATCH_YOUTUBE_END_OVERLAY_SECONDS)
      ) {
        setShowYoutubeEndOverlay(true);
      }
      const volumeValue = coerceNumber(info.volume);
      if (volumeValue !== null) {
        const normalized = volumeValue > 1 ? volumeValue / 100 : volumeValue;
        setPlayerVolume(Math.max(0, Math.min(1, normalized)));
      }
      const playerState = coerceNumber(info.playerState);
      if (playerState !== null) {
        setPlayerIsPlaying(playerState === 1);
        if (playerState === 0) setShowYoutubeEndOverlay(true);
      }
      if (typeof info.muted === "boolean") {
        setPlayerIsMuted(info.muted);
      }
      const speed = coerceNumber(info.playbackRate);
      if (speed !== null && speed > 0) {
        setPlaybackRate(speed);
      }
      const quality = normalizeYoutubeQuality(info.playbackQuality);
      if (quality) {
        setPlaybackQuality(quality);
      }
    };

    window.addEventListener("message", onMessage);
    const timer = window.setInterval(() => requestYoutubeSnapshot(), 700);
    initializeYoutubeBridge();

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("message", onMessage);
    };
  }, [initializeYoutubeBridge, isDirectVideo, playbackEmbedUrl, requestYoutubeSnapshot, sendYoutubeCommand, shouldStartPausedAfterReload, youtubePlaybackIssue]);

  useEffect(() => {
    if (isDirectVideo || !playbackEmbedUrl) return;
    if (youtubeHasPlaybackSignal || youtubePlaybackIssue) return;

    const timer = window.setTimeout(() => {
      setYoutubePlaybackIssue("Video YouTube nay khong the phat trong Nextflix. Ban co the mo truc tiep tren YouTube.");
      setPlayerIsPlaying(false);
      setShowPauseMaskOverlay(false);
      setShowReloadPreviewOverlay(false);
      setShowYoutubeEndOverlay(false);
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [isDirectVideo, playbackEmbedUrl, youtubeHasPlaybackSignal, youtubePlaybackIssue]);

  useEffect(() => {
    if (isDirectVideo || !playbackEmbedUrl) return;
    if (!playerIsPlaying || playerDuration <= 0) return;

    const timer = window.setInterval(() => {
      const syncedRecently = Date.now() - lastPlayerSyncAtRef.current < 1400;
      if (syncedRecently) return;
      setPlayerCurrentTime((prev) => Math.min(playerDuration, prev + 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isDirectVideo, playbackEmbedUrl, playerDuration, playerIsPlaying]);

  const handleDirectLoadedMetadata = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const player = event.currentTarget;
    const duration = Number.isFinite(player.duration) && player.duration > 0
      ? player.duration
      : fallbackDurationSeconds;
    setPlayerDuration(duration);
    setPlayerVolume(Math.max(0, Math.min(1, player.volume || 1)));
    lastPlayerSyncAtRef.current = Date.now();

    if (INTRO_SKIP_SECONDS > 0 && duration > INTRO_SKIP_SECONDS) {
      try {
        player.currentTime = INTRO_SKIP_SECONDS;
        setPlayerCurrentTime(INTRO_SKIP_SECONDS);
        lastPlaybackTimeRef.current = INTRO_SKIP_SECONDS;
        lastPlayerSyncAtRef.current = Date.now();
      } catch {
        // Some stream formats reject immediate seek.
      }
    }

    const shouldShowCaptions = captionsEnabled && directSubtitleTracks.length > 0;
    for (let i = 0; i < player.textTracks.length; i += 1) {
      player.textTracks[i].mode = shouldShowCaptions ? "showing" : "hidden";
    }
  };

  const handleDirectTimeUpdate = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const current = event.currentTarget.currentTime;
    setPlayerCurrentTime(current);
    lastPlayerSyncAtRef.current = Date.now();
    if (WATCH_LOCK_PLAYER_CONTROLS) lastPlaybackTimeRef.current = current;
  };

  const handleDirectPlay = () => {
    setPlayerIsPlaying(true);
    setShowPauseMaskOverlay(false);
    setShowReloadPreviewOverlay(false);
  };

  const handleDirectPause = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    if (!WATCH_LOCK_PLAYER_CONTROLS) {
      setPlayerIsPlaying(false);
      setShowPauseMaskOverlay(true);
      setShowReloadPreviewOverlay(false);
      return;
    }

    const player = event.currentTarget;
    if (player.ended) {
      setPlayerIsPlaying(false);
      return;
    }
    void player.play().catch(() => {});
  };

  const handleDirectSeeking = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    if (!WATCH_LOCK_PLAYER_CONTROLS) return;
    const player = event.currentTarget;
    const lockedTime = lastPlaybackTimeRef.current;
    if (Math.abs(player.currentTime - lockedTime) < 0.35) return;
    try {
      player.currentTime = lockedTime;
    } catch {
      // Ignore abrupt seek correction failures.
    }
  };

  const handleDirectRateChange = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const player = event.currentTarget;
    if (WATCH_LOCK_PLAYER_CONTROLS && player.playbackRate !== 1) {
      player.playbackRate = 1;
    }
    setPlaybackRate(player.playbackRate || 1);
  };

  const handleDirectVolumeChange = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const player = event.currentTarget;
    setPlayerIsMuted(player.muted);
    setPlayerVolume(Math.max(0, Math.min(1, player.volume || 0)));
  };

  const togglePlayPause = async () => {
    if (isDirectVideo) {
      const player = directVideoRef.current;
      if (!player) return;

      if (player.paused) {
        setShowPauseMaskOverlay(false);
        setShowReloadPreviewOverlay(false);
        await player.play().catch(() => {});
      } else {
        setShowPauseMaskOverlay(true);
        setShowReloadPreviewOverlay(false);
        player.pause();
      }
      return;
    }

    if (!playbackEmbedUrl) return;
    if (!playerIsPlaying) {
      setShowPauseMaskOverlay(false);
      setShowReloadPreviewOverlay(false);
      setShowYoutubeEndOverlay(false);
    } else {
      setShowPauseMaskOverlay(true);
      setShowReloadPreviewOverlay(false);
    }
    sendYoutubeCommand(playerIsPlaying ? "pauseVideo" : "playVideo");
    setPlayerIsPlaying((prev) => !prev);
  };

  const replayYoutubeVideo = useCallback(() => {
    if (!playbackEmbedUrl || isDirectVideo) return;
    setShowYoutubeEndOverlay(false);
    sendYoutubeCommand("seekTo", [0, true]);
    sendYoutubeCommand("playVideo");
    setPlayerCurrentTime(0);
    setPlayerIsPlaying(true);
  }, [isDirectVideo, playbackEmbedUrl, sendYoutubeCommand]);

  const seekTo = (targetSeconds: number) => {
    const clamped = Math.max(0, Math.min(playerDuration || targetSeconds, targetSeconds));

    if (isDirectVideo) {
      const player = directVideoRef.current;
      if (!player) return;
      player.currentTime = clamped;
      setPlayerCurrentTime(clamped);
      return;
    }

    if (!playbackEmbedUrl) return;
    sendYoutubeCommand("seekTo", [clamped, true]);
    setPlayerCurrentTime(clamped);
  };

  const seekBy = (deltaSeconds: number) => seekTo(playerCurrentTime + deltaSeconds);

  const handleVideoSurfaceToggle = () => {
    setShowSettingsPanel(false);
    void togglePlayPause();
  };

  const toggleMute = () => {
    if (isDirectVideo) {
      const player = directVideoRef.current;
      if (!player) return;
      const nextMuted = !player.muted;
      if (!nextMuted && player.volume <= 0) {
        const restoredVolume = playerVolume > 0 ? playerVolume : 1;
        player.volume = restoredVolume;
      }
      player.muted = nextMuted;
      setPlayerIsMuted(nextMuted);
      return;
    }

    if (!playbackEmbedUrl) return;
    sendYoutubeCommand(playerIsMuted ? "unMute" : "mute");
    setPlayerIsMuted((prev) => !prev);
  };

  const changeVolume = (value: number) => {
    const volume = Math.max(0, Math.min(1, value));
    setPlayerVolume(volume);

    if (isDirectVideo) {
      const player = directVideoRef.current;
      if (!player) return;
      player.volume = volume;
      player.muted = volume <= 0;
      setPlayerIsMuted(player.muted);
      return;
    }

    if (!playbackEmbedUrl) return;
    if (volume <= 0) {
      sendYoutubeCommand("mute");
      setPlayerIsMuted(true);
    } else {
      if (playerIsMuted) sendYoutubeCommand("unMute");
      sendYoutubeCommand("setVolume", [volume * 100]);
      setPlayerIsMuted(false);
    }
  };

  const toggleCaptions = () => {
    if (!canToggleCaptions) return;

    if (isDirectVideo) {
      const player = directVideoRef.current;
      if (!player) return;
      const next = !captionsEnabled;
      for (let i = 0; i < player.textTracks.length; i += 1) {
        player.textTracks[i].mode = next ? "showing" : "hidden";
      }
      setCaptionsEnabled(next);
      return;
    }

    if (!playbackEmbedUrl) return;
    const next = !captionsEnabled;
    if (next) {
      sendYoutubeCommand("loadModule", ["captions"]);
      sendYoutubeCommand("setOption", ["captions", "track", { languageCode: "vi" }]);
    } else {
      sendYoutubeCommand("setOption", ["captions", "track", {}]);
    }
    setCaptionsEnabled(next);
  };

  const changePlaybackRate = (value: number) => {
    const nextRate = Math.max(0.5, Math.min(2, value));
    setPlaybackRate(nextRate);

    if (isDirectVideo) {
      const player = directVideoRef.current;
      if (!player) return;
      player.playbackRate = nextRate;
      return;
    }

    if (!playbackEmbedUrl) return;
    sendYoutubeCommand("setPlaybackRate", [nextRate]);
  };

  const changePlaybackQuality = (value: YoutubePlaybackQuality) => {
    setPlaybackQuality(value);
    if (isDirectVideo || !playbackEmbedUrl) return;
    if (value === "auto") {
      sendYoutubeCommand("setPlaybackQuality", ["default"]);
      return;
    }
    sendYoutubeCommand("setPlaybackQuality", [value]);
  };

  const toggleAccountMenu = useCallback(() => {
    setShowAccountMenu((prev) => !prev);
  }, []);

  const toggleSearch = useCallback(() => {
    setShowSearch((prev) => {
      if (!prev) {
        window.setTimeout(() => searchInputRef.current?.focus(), 100);
      } else {
        setSearchQuery("");
        setSearchResults([]);
      }
      return !prev;
    });
  }, []);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setSearchQuery(query);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
          setSearchResults([]);
          return;
        }
        const payload = await response.json();
        setSearchResults(Array.isArray(payload) ? payload : []);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const handleResultClick = useCallback((targetMovieId: string) => {
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    void navigateToWatch(router, targetMovieId);
  }, [router]);

  const openShareWindow = useCallback((url: string) => {
    if (!url || typeof window === "undefined") return;
    window.open(url, "_blank", "noopener,noreferrer,width=760,height=680");
  }, []);

  const handleShareFacebook = useCallback(() => {
    if (!shareUrl) return;
    const facebookSharer = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareTitle)}`;
    openShareWindow(facebookSharer);
  }, [openShareWindow, shareTitle, shareUrl]);

  const scrollToComments = () => {
    commentAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleFullscreen = () => {
    const playerContainer = document.getElementById("watch-player-container");
    if (!playerContainer) return;

    if (!isFullscreen) {
      if (playerContainer.requestFullscreen) {
        playerContainer.requestFullscreen();
      } else if ((playerContainer as any).webkitRequestFullscreen) {
        (playerContainer as any).webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitFullscreenElement && (document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const watchNavLinkClass = "text-white/90 hover:text-red-500 transition-all duration-200 transform-gpu will-change-transform origin-left inline-block hover:[transform:perspective(720px)_translate3d(0,-6px,42px)_scale(1.15)] hover:[text-shadow:0_8px_20px_rgba(239,68,68,0.45)]";
  const watchHeaderActions = (
    <div className="flex flex-row gap-6 items-center">
      <div className="relative">
        <div
          className={`flex items-center transition-all duration-300 ${
            showSearch ? "bg-black/75 border border-white/30 rounded-sm" : ""
          }`}
        >
          <div
            onClick={toggleSearch}
            className="text-gray-200 hover:text-gray-300 cursor-pointer transition p-2"
          >
            {showSearch ? <AiOutlineClose /> : <BsSearch />}
          </div>
          {showSearch && (
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Tìm phim..."
              className="bg-transparent text-white text-sm outline-none w-[200px] md:w-[280px] pr-3 py-1"
            />
          )}
        </div>

        {showSearch && searchResults.length > 0 && (
          <div className="absolute top-full right-0 mt-2 w-[300px] md:w-[350px] bg-zinc-900 border border-zinc-700 rounded-md shadow-2xl max-h-[400px] overflow-y-auto z-50">
            {searchResults.map((item: any) => (
              <div
                key={item.id}
                onClick={() => handleResultClick(item.id)}
                className="flex items-center gap-3 p-3 hover:bg-zinc-800 cursor-pointer transition border-b border-zinc-800 last:border-b-0"
              >
                {item.thumbnailUrl && (
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    className="w-16 h-10 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {item.title}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {item.genre || ""} {item.duration ? `• ${item.duration} phút` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {showSearch && searchQuery && searchResults.length === 0 && !searching && (
          <div className="absolute top-full right-0 mt-2 w-[300px] bg-zinc-900 border border-zinc-700 rounded-md shadow-2xl p-4 z-50">
            <p className="text-gray-400 text-sm text-center">Không tìm thấy phim</p>
          </div>
        )}
      </div>

      <div className="text-gray-200 hover:text-gray-300 cursor-pointer transition">
        <BsBell />
      </div>

      <div
        onClick={toggleAccountMenu}
        className="flex flex-row items-center gap-2 cursor-pointer relative"
      >
        <div className="w-6 h-6 lg:w-10 lg:h-10 rounded-md overflow-hidden">
          <img
            src="/images/default-blue.png"
            alt="profile image"
            className="w-full h-full object-cover block"
          />
        </div>
        <BsChevronDown className={`text-white transition ${showAccountMenu ? "rotate-180" : "rotate-0"}`} />
        <AccountMenu visible={showAccountMenu} />
      </div>
    </div>
  );

  if (isLoading || !validMovieId) {
    return (
      <div className="min-h-screen w-screen bg-black flex items-center justify-center">
        <p className="text-white/80 text-base md:text-lg">Đang tải phim...</p>
      </div>
    );
  }

  if (showPlaybackIntro) {
    return (
      <IntroN
        preferVideo
        videoUrl={BRAND_INTRO_URL}
        alt="Brand intro"
        onFinished={handlePlaybackIntroFinished}
        finishAfterMs={INTRO_DURATION_MS}
        isMuted={introIsMuted}
      />
    );
  }

  return (
    <>
      <Head>
        <title>{shareTitle ? `${shareTitle} | Nextflix` : "Nextflix"}</title>
        <meta property="og:type" content="video.movie" />
        <meta property="og:site_name" content="Nextflix" />
        <meta property="og:title" content={shareTitle} />
        <meta property="og:description" content={shareDescription} />
        {shareUrl ? <meta property="og:url" content={shareUrl} /> : null}
        {shareImageUrl ? <meta property="og:image" content={shareImageUrl} /> : null}
        {shareImageUrl ? <meta property="og:image:secure_url" content={shareImageUrl} /> : null}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={shareTitle} />
        <meta name="twitter:description" content={shareDescription} />
        {shareImageUrl ? <meta name="twitter:image" content={shareImageUrl} /> : null}
      </Head>

      <div className="min-h-screen w-screen bg-black">
      <div className="fixed inset-x-0 top-0 z-40 h-[68px]">
        <nav
          className={`absolute inset-x-0 top-0 h-[68px] px-4 sm:px-12 py-4 bg-transparent transition-all duration-300 flex items-center ${
            headerMode === "brand" ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none"
          }`}
        >
          <div className="flex items-center w-full">
            <Link href="/">
              <img src="/images/logo.png" alt="logo" className="h-5 sm:h-8" />
            </Link>
            <div className="hidden lg:flex items-center ml-8 gap-7 text-sm text-white/90">
              <Link href="/" className={watchNavLinkClass}>Trang chủ</Link>
              <Link href="/series" className={watchNavLinkClass}>Phim bộ</Link>
              <Link href="/films" className={watchNavLinkClass}>Phim lẻ</Link>
              <Link href="/new" className={watchNavLinkClass}>Mới & Phổ biến</Link>
              <Link href="/my-list" className={watchNavLinkClass}>Danh sách của tôi</Link>
              <Link href="/languages" className={watchNavLinkClass}>Theo ngôn ngữ</Link>
            </div>
            <div className="lg:hidden ml-4">
              <Link href="/" className="text-white/90 hover:text-red-500 text-sm transition-all duration-200 transform-gpu will-change-transform origin-left inline-block hover:[transform:perspective(720px)_translate3d(0,-6px,42px)_scale(1.15)] hover:[text-shadow:0_8px_20px_rgba(239,68,68,0.45)]">Home</Link>
            </div>
          </div>
        </nav>

        <nav
          className={`absolute inset-x-0 top-0 h-[68px] px-4 sm:px-8 py-3 bg-transparent transition-all duration-300 flex items-center ${
            headerMode === "title" ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-4 w-full">
            <Link href="/">
              <AiOutlineArrowLeft className="text-white cursor-pointer" size={28} />
            </Link>
            <p className="text-white text-lg md:text-2xl font-semibold truncate">
              {movie?.title || "Đang tải..."}
            </p>
          </div>
        </nav>
        <div className="absolute right-4 sm:right-8 top-0 h-[68px] flex items-center z-50">
          {watchHeaderActions}
        </div>
      </div>

      <div className="pt-16">
        <div
          id="watch-player-container"
          className="relative h-screen bg-black"
        >
          {!chosenUrl ? (
            <div className="h-full w-full flex items-center justify-center text-white text-xl text-center px-4">
              Chưa có link {isTrailerMode ? "trailer" : "phim"} cho nội dung này.
            </div>
          ) : isDirectVideo ? (
            <video
              ref={directVideoRef}
              className="h-full w-full"
              autoPlay={!shouldStartPausedAfterReload}
              muted={playerIsMuted}
              playsInline
              controls={false}
              tabIndex={WATCH_LOCK_PLAYER_CONTROLS ? -1 : 0}
              disablePictureInPicture={WATCH_LOCK_PLAYER_CONTROLS}
              controlsList={WATCH_LOCK_PLAYER_CONTROLS ? "nodownload noplaybackrate noremoteplayback nofullscreen" : undefined}
              onContextMenu={WATCH_LOCK_PLAYER_CONTROLS ? (event) => event.preventDefault() : undefined}
              onLoadedMetadata={handleDirectLoadedMetadata}
              onTimeUpdate={handleDirectTimeUpdate}
              onPlay={handleDirectPlay}
              onPause={handleDirectPause}
              onSeeking={handleDirectSeeking}
              onRateChange={handleDirectRateChange}
              onVolumeChange={handleDirectVolumeChange}
              onEnded={() => setPlayerIsPlaying(false)}
              poster={movie?.thumbnailUrl}
              src={chosenUrl}
            >
              {directSubtitleTracks.map((track) => (
                <track
                  key={`${track.srclang}:${track.src}`}
                  kind="subtitles"
                  src={track.src}
                  srcLang={track.srclang}
                  label={track.label}
                  default={track.isDefault}
                />
              ))}
            </video>
          ) : playbackEmbedUrl ? (
            <div className="relative h-full w-full overflow-hidden bg-black">
              <iframe
                ref={youtubeFrameRef}
                id="watch-player"
                className="absolute inset-0 h-full w-full"
                src={playbackEmbedUrl}
                title={movie?.title || "Trailer"}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                onLoad={initializeYoutubeBridge}
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/65 to-transparent" />
              {showYoutubeEndOverlay ? (
                <div className="absolute inset-0 z-20 bg-black/95 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={replayYoutubeVideo}
                    className="inline-flex items-center justify-center rounded-md bg-white text-black px-6 py-2 text-sm font-semibold hover:bg-red-600 hover:text-white transition-colors"
                  >
                    Xem lại
                  </button>
                </div>
              ) : null}
              {youtubePlaybackIssue ? (
                <div className="absolute inset-0 z-30 bg-black/92 flex items-center justify-center px-6 text-center">
                  <div className="max-w-2xl">
                    <p className="text-2xl font-semibold text-white">
                      Khong the phat video nay trong player nhung
                    </p>
                    <p className="mt-3 text-base text-white/80">
                      {youtubePlaybackIssue}
                    </p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                      {youtubeWatchUrl ? (
                        <a
                          href={youtubeWatchUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-red-600 hover:text-white"
                        >
                          Mo tren YouTube
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => router.back()}
                        className="inline-flex items-center justify-center rounded-md border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                      >
                        Quay lai
                      </button>
                    </div>
                    <p className="mt-4 text-sm text-white/60">
                      Neu day la phim chinh, nen doi `videoUrl` sang link mp4/m3u8 trong admin de phat on dinh hon.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : isYouTubeSource && !ALLOW_YOUTUBE_WATCH_EMBED ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-white text-center px-6 gap-3">
              <p className="text-xl font-semibold">Đang chặn YouTube embed để tránh lỗi "not a bot".</p>
              <p className="text-white/75">
                Để xem trong Nextflix, vui lòng dùng link video trực tiếp (mp4/m3u8) trong trang admin.
              </p>
            </div>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-white text-xl text-center px-6">
              Link này không hỗ trợ phát inline ổn định.
            </div>
          )}

          {showReloadPreviewOverlay && !showPlaybackIntro && isPlayableSurface ? (
            <div className="pointer-events-none absolute inset-0 z-[9] bg-black">
              {playbackPreviewImage ? (
                <img
                  src={playbackPreviewImage}
                  alt={movie?.title || "Movie preview"}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
          ) : null}

          {showPauseMaskOverlay && !showPlaybackIntro && isPlayableSurface ? (
            <div className="pointer-events-none absolute inset-0 z-[9] bg-black" />
          ) : null}
          {isPlayableSurface ? (
            <button
              type="button"
              className="absolute inset-0 z-10 cursor-pointer bg-transparent"
              onClick={handleVideoSurfaceToggle}
              aria-label={playerIsPlaying ? "Tạm dừng video" : "Phát video"}
              title={playerIsPlaying ? "Tạm dừng video" : "Phát video"}
            />
          ) : null}

          {isPlayableSurface && chosenUrl ? (
            <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-4 sm:px-8 pb-4 pt-10">
              <input
                type="range"
                min={0}
                max={Math.max(playerDuration, 1)}
                step={0.1}
                value={Math.min(playerCurrentTime, Math.max(playerDuration, 1))}
                onChange={(event) => seekTo(Number(event.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-red-600"
                style={progressTrackStyle}
                disabled={playerDuration <= 0}
              />

              <div className="mt-3 flex items-center justify-between gap-4 text-white">
                <div className="flex items-center gap-3 sm:gap-5">
                  <button
                    onClick={togglePlayPause}
                    className="text-white/90 hover:text-red-500 transition-colors"
                    title="Play / Pause"
                    aria-label="Play or pause"
                  >
                    {playerIsPlaying ? <BsPauseFill size={30} /> : <BsPlayFill size={30} />}
                  </button>
                  <button
                    onClick={() => seekBy(-10)}
                    className="text-white/90 hover:text-red-500 transition-colors"
                    title="Lùi 10 giây"
                    aria-label="Lùi 10 giây"
                  >
                    <BiUndo size={30} />
                  </button>
                  <button
                    onClick={() => seekBy(10)}
                    className="text-white/90 hover:text-red-500 transition-colors"
                    title="Tiến 10 giây"
                    aria-label="Tiến 10 giây"
                  >
                    <BiRedo size={30} />
                  </button>
                  <div className="group/volume flex items-center gap-2">
                    <button
                      onClick={toggleMute}
                      className="text-white/90 hover:text-red-500 transition-colors"
                      title="Âm thanh"
                      aria-label="Bật tắt âm thanh"
                    >
                      {playerIsMuted ? <IoVolumeMuteOutline size={28} /> : <IoVolumeHighOutline size={28} />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={playerIsMuted ? 0 : playerVolume}
                      onChange={(event) => changeVolume(Number(event.target.value))}
                      className="h-1 w-0 cursor-pointer appearance-none rounded-full bg-white/20 accent-red-600 opacity-0 pointer-events-none transition-all duration-200 group-hover/volume:w-24 group-hover/volume:opacity-100 group-hover/volume:pointer-events-auto focus:w-24 focus:opacity-100 focus:pointer-events-auto"
                      style={volumeTrackStyle}
                      aria-label="Điều chỉnh âm lượng"
                    />
                  </div>
                  <button
                    onClick={toggleCaptions}
                    disabled={!canToggleCaptions}
                    className={`transition-colors ${
                      !canToggleCaptions
                        ? "text-white/30 cursor-not-allowed"
                        : captionsEnabled
                          ? "text-red-500"
                          : "text-white/75 hover:text-red-500"
                    }`}
                    title={!canToggleCaptions ? "Video này chưa có track phụ đề (.vtt)" : "Phụ đề"}
                    aria-label={!canToggleCaptions ? "Video chưa hỗ trợ phụ đề" : "Phụ đề"}
                  >
                    <MdClosedCaption size={28} />
                  </button>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                  <button
                    onClick={() => setShowSettingsPanel((prev) => !prev)}
                    className={`transition-colors ${showSettingsPanel ? "text-red-500" : "text-white/80 hover:text-red-500"}`}
                    title="Cài đặt"
                    aria-label="Cài đặt"
                  >
                    <IoSettingsOutline size={28} />
                  </button>
                  <button
                    type="button"
                    onClick={handleFullscreen}
                    className="text-white/80 hover:text-red-500 transition-colors"
                    title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
                    aria-label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
                  >
                    {isFullscreen ? <MdFullscreenExit size={28} /> : <MdFullscreen size={28} />}
                  </button>
                  <span className="text-xs sm:text-sm text-white/85 tabular-nums">
                    {formatTime(playerCurrentTime)} / {formatTime(playerDuration)}
                  </span>
                </div>
              </div>

              {showSettingsPanel ? (
                <div className="absolute right-4 sm:right-8 bottom-16 w-60 rounded-md border border-white/15 bg-black/90 p-3">
                  <p className="text-white/90 text-xs mb-2">Tốc độ phát</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[0.5, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changePlaybackRate(rate)}
                        className={`rounded px-2 py-1 text-xs ${
                          Math.abs(playbackRate - rate) < 0.01
                            ? "bg-white text-black"
                            : "bg-white/10 text-white hover:bg-white/20"
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 border-t border-white/10 pt-3">
                    <p className="text-white/90 text-xs mb-2">Chất lượng</p>
                    {!isDirectVideo && playbackEmbedUrl ? (
                      <div className="grid grid-cols-2 gap-2">
                        {YOUTUBE_QUALITY_OPTIONS.map((quality) => (
                          <button
                            key={quality.value}
                            onClick={() => changePlaybackQuality(quality.value)}
                            className={`rounded px-2 py-1 text-xs ${
                              playbackQuality === quality.value
                                ? "bg-white text-black"
                                : "bg-white/10 text-white hover:bg-white/20"
                            }`}
                          >
                            {quality.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] leading-relaxed text-white/55">
                        Nguồn video này chưa hỗ trợ đổi chất lượng thủ công.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {movie ? (
          <section className="px-4 sm:px-10 py-5 bg-[#101010] border-y border-white/10">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div>
                <h2 className="text-white text-2xl md:text-3xl font-semibold">{movie.title}</h2>
                <div className="mt-3 flex items-center gap-3 text-white/85 text-base md:text-lg">
                  <span>{formattedViewCount} lượt xem</span>
                  <span>{averageRating.toFixed(1)}</span>
                  <span className="flex items-center gap-0.5 text-[#f5c518]">
                    {[1, 2, 3, 4, 5].map((star) => (
                      star <= Math.round(averageRating) ? <AiFillStar key={star} size={18} /> : <AiOutlineStar key={star} size={18} />
                    ))}
                  </span>
                  <span className="text-white/60 text-sm">({ratingCountLabel})</span>
                </div>

                <div className="mt-4">
                  <p className="text-white/80 text-sm mb-2">
                    {ratingsLoading ? "Đang tải đánh giá..." : "Chấm sao của bạn"}
                  </p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => void submitRating(star)}
                        disabled={ratingSubmitting}
                        className={`transition-colors ${star <= (userRating || 0) ? "text-[#f5c518]" : "text-white/35 hover:text-red-500"}`}
                        title={`${star} sao`}
                      >
                        <AiFillStar size={28} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-white/90">
                <button
                  onClick={scrollToComments}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-2 hover:border-red-500/70 hover:text-red-500 transition-colors"
                >
                  <BiCommentDetail size={22} />
                  <span className="text-sm font-medium">Bình luận</span>
                </button>

                <button
                  onClick={() => void toggleFavorite()}
                  disabled={favoriteSubmitting}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${
                    isFavorite
                      ? "border-red-500/80 bg-red-500/10 text-red-500"
                      : "border-white/20 bg-white/5 hover:border-red-500/70 hover:text-red-500"
                  } ${favoriteSubmitting ? "opacity-70 cursor-not-allowed" : ""}`}
                  title={isFavorite ? "Bỏ tim phim" : "Thả tim phim"}
                  aria-label={isFavorite ? "Bỏ tim phim" : "Thả tim phim"}
                >
                  <AiOutlineHeart size={22} />
                  <span className="text-lg font-semibold leading-none tabular-nums">{favoriteCountLabel}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareFacebook}
                  className="h-11 w-11 inline-flex items-center justify-center rounded-xl border border-white/15 bg-zinc-900/90 text-white/90 shadow-lg shadow-black/35 transition-colors hover:border-white/45 hover:text-white"
                  title="Chia sẻ"
                  aria-label="Chia sẻ"
                >
                  <BiShareAlt size={20} />
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <div ref={commentAnchorRef}>
          {movieId && <CommentSection movieId={movieId} />}
        </div>
        <HorizontalMovieList title="Phim dành cho bạn" data={recommendedMovies} />
        <HorizontalMovieList title="My List" data={favorites} />
      </div>
      </div>
    </>
  );
};

export default WatchPage;



