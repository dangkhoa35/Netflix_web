import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface IntroNProps {
  className?: string;
  imageClassName?: string;
  imageSrc?: string;
  alt?: string;
  videoUrl?: string;
  videoUrls?: string[]; // New prop for playlist
  preferVideo?: boolean;
  onFinished?: () => void;
  finishAfterMs?: number;
  isMuted?: boolean;
}

type IntroSource =
  | { type: "direct"; src: string }
  | { type: "youtube"; src: string }
  | null;

const DIRECT_VIDEO_PATTERN = /\.(mp4|webm|ogg|m3u8)(\?.*)?$/i;
const INTRO_LOCK_PLAYER_CONTROLS = (
  process.env.NEXT_PUBLIC_INTRO_LOCK_PLAYER_CONTROLS
  ?? process.env.NEXT_PUBLIC_LOCK_PLAYER_CONTROLS
  ?? "0"
) === "1";
const INTRO_MUTED = (process.env.NEXT_PUBLIC_INTRO_MUTED ?? "0") === "1";
const INTRO_AUTOPLAY_MUTED = (process.env.NEXT_PUBLIC_INTRO_AUTOPLAY_MUTED ?? "0") === "1";
const ALLOW_YOUTUBE_INTRO_EMBED = (process.env.NEXT_PUBLIC_ALLOW_YOUTUBE_INTRO_EMBED ?? "1") === "1";
const INTRO_USE_LOADING_IMAGE = (process.env.NEXT_PUBLIC_INTRO_USE_LOADING_IMAGE ?? "0") === "1";
const INTRO_HIDE_YOUTUBE_CHROME = (process.env.NEXT_PUBLIC_INTRO_HIDE_YOUTUBE_CHROME ?? "1") === "1";
const INTRO_HIDE_DIRECT_CONTROLS = (process.env.NEXT_PUBLIC_INTRO_HIDE_DIRECT_CONTROLS ?? "1") === "1";
const parsedIntroYoutubeEndGuardSeconds = Number(process.env.NEXT_PUBLIC_INTRO_YT_END_GUARD_SECONDS ?? "0.35");
const INTRO_YOUTUBE_END_GUARD_SECONDS = Number.isFinite(parsedIntroYoutubeEndGuardSeconds)
  ? Math.max(0, parsedIntroYoutubeEndGuardSeconds)
  : 0.35;
const INTRO_LOCKED_UI = INTRO_LOCK_PLAYER_CONTROLS || INTRO_HIDE_YOUTUBE_CHROME;

function applyYoutubeParams(embed: URL, isMuted: boolean) {
  embed.searchParams.set("autoplay", "1");
  embed.searchParams.set("rel", "0");
  embed.searchParams.set("playsinline", "1");
  embed.searchParams.set("controls", INTRO_LOCKED_UI ? "0" : "1");
  embed.searchParams.set("enablejsapi", "1");
  embed.searchParams.set("modestbranding", "1");
  embed.searchParams.set("iv_load_policy", "3");
  embed.searchParams.set("fs", INTRO_LOCKED_UI ? "0" : "1");
  embed.searchParams.set("disablekb", INTRO_LOCKED_UI ? "1" : "0");
  embed.searchParams.set("showinfo", "0");
  embed.searchParams.set("mute", isMuted ? "1" : "0");
}

function toYoutubeEmbed(raw: string, isMuted: boolean): string {
  try {
    const u = new URL(raw.trim());

    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) {
        const embedId = u.pathname.split("/")[2];
        if (!embedId) return "";
        const embed = new URL(`https://www.youtube-nocookie.com/embed/${embedId}`);
        applyYoutubeParams(embed, isMuted);
        return embed.toString();
      }

      const id = u.searchParams.get("v");
      if (id) {
        const embed = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
        applyYoutubeParams(embed, isMuted);
        return embed.toString();
      }

      if (u.pathname.startsWith("/shorts/")) {
        const shortId = u.pathname.split("/")[2];
        if (shortId) {
          const embed = new URL(`https://www.youtube-nocookie.com/embed/${shortId}`);
          applyYoutubeParams(embed, isMuted);
          return embed.toString();
        }
      }
    }

    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      if (id) {
        const embed = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
        applyYoutubeParams(embed, isMuted);
        return embed.toString();
      }
    }

    return "";
  } catch {
    return "";
  }
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

function isLikelyDirectIntroUrl(raw: string): boolean {
  const value = String(raw || "").trim();
  if (!value) return false;
  if (/ref_=tt_ov_i/i.test(value)) return false;
  if (DIRECT_VIDEO_PATTERN.test(value)) return true;
  if (isYoutubeUrl(value)) return false;
  if (!/^https?:\/\//i.test(value)) return false;

  try {
    const parsed = new URL(value);
    if (parsed.hostname.includes("imdb.com")) return false;
  } catch {
    return false;
  }

  return true;
}

function resolveIntroSource(raw?: string, isMuted = false): IntroSource {
  if (!raw) return null;
  const normalized = raw.trim();
  if (!normalized) return null;

  if (isLikelyDirectIntroUrl(normalized)) {
    return { type: "direct", src: normalized };
  }

  const embed = toYoutubeEmbed(normalized, isMuted);
  if (ALLOW_YOUTUBE_INTRO_EMBED && embed) {
    return { type: "youtube", src: embed };
  }

  return null;
}

const IntroN: React.FC<IntroNProps> = ({
  className = "",
  imageClassName = "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
  imageSrc = "/images/loading.gif",
  alt = "Nextlix intro",
  videoUrl,
  videoUrls = [],
  preferVideo = false,
  onFinished,
  finishAfterMs = 0,
  isMuted,
}) => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  
  // Combine videoUrl and videoUrls into a single playlist
  const playlist = useMemo(() => {
    const list = [...videoUrls];
    if (videoUrl && !list.includes(videoUrl)) {
      list.unshift(videoUrl);
    }
    return list.filter(Boolean);
  }, [videoUrl, videoUrls]);

  const currentVideoUrl = playlist[currentVideoIndex] || videoUrl;

  const shouldMuteIntro = isMuted ?? (INTRO_MUTED || INTRO_AUTOPLAY_MUTED);
  const introSource = useMemo(() => resolveIntroSource(currentVideoUrl, shouldMuteIntro), [currentVideoUrl, shouldMuteIntro]);
  const showDirectIntro = Boolean(preferVideo && introSource?.type === "direct");
  const showYoutubeIntro = Boolean(preferVideo && introSource?.type === "youtube");
  const showNOnlyIntro = !showDirectIntro && !showYoutubeIntro && playlist.length === 0;
  const directIntroSrc = introSource?.type === "direct" ? introSource.src : "";
  const youtubeIntroSrc = introSource?.type === "youtube" ? introSource.src : "";
  const safeFinishAfterMs = Number.isFinite(finishAfterMs) ? Math.max(0, Math.floor(finishAfterMs)) : 0;
  const fallbackFinishAfterMs = safeFinishAfterMs;
  const finishCalledRef = useRef(false);
  const youtubeFrameRef = useRef<HTMLIFrameElement | null>(null);
  const directVideoRef = useRef<HTMLVideoElement | null>(null);
  const [hideYoutubeSurface, setHideYoutubeSurface] = useState(false);

  const finishIntro = useCallback(() => {
    if (currentVideoIndex < playlist.length - 1) {
      setCurrentVideoIndex((prev) => prev + 1);
      return;
    }

    if (!onFinished || finishCalledRef.current) return;
    finishCalledRef.current = true;
    onFinished();
  }, [currentVideoIndex, playlist.length, onFinished]);

  useEffect(() => {
    finishCalledRef.current = false;
    setHideYoutubeSurface(false);
  }, [currentVideoUrl, preferVideo, showDirectIntro, showYoutubeIntro, showNOnlyIntro]);

  const sendYoutubeCommand = useCallback((func: string, args: unknown[] = []) => {
    const frame = youtubeFrameRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  }, []);

  const applyYoutubeAudioState = useCallback(() => {
    if (!showYoutubeIntro) return;
    sendYoutubeCommand(shouldMuteIntro ? "mute" : "unMute");
    if (!shouldMuteIntro) {
      sendYoutubeCommand("setVolume", [100]);
    }
  }, [sendYoutubeCommand, shouldMuteIntro, showYoutubeIntro]);

  const initializeYoutubeBridge = useCallback(() => {
    if (!showYoutubeIntro) return;
    const frame = youtubeFrameRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage(JSON.stringify({ event: "listening", id: "intro-player" }), "*");
    sendYoutubeCommand("addEventListener", ["onStateChange"]);
    sendYoutubeCommand("addEventListener", ["onReady"]);
    applyYoutubeAudioState();
    sendYoutubeCommand("playVideo");
    sendYoutubeCommand("getPlayerState");
  }, [applyYoutubeAudioState, sendYoutubeCommand, showYoutubeIntro]);

  useEffect(() => {
    if (!showYoutubeIntro || !onFinished) return;

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
        applyYoutubeAudioState();
        sendYoutubeCommand("playVideo");
        return;
      }

      if (payload.event === "onStateChange" && Number(payload.info) === 0) {
        setHideYoutubeSurface(true);
        finishIntro();
        return;
      }

      if (payload.event === "infoDelivery" && payload.info) {
        const info = payload.info as Record<string, unknown>;
        const playerState = Number(info.playerState);
        const currentTime = Number(info.currentTime);
        const duration = Number(info.duration);

        if (
          Number.isFinite(currentTime)
          && Number.isFinite(duration)
          && duration > 0
          && currentTime >= Math.max(0, duration - INTRO_YOUTUBE_END_GUARD_SECONDS)
        ) {
          setHideYoutubeSurface(true);
          finishIntro();
          return;
        }

        if (Number.isFinite(playerState) && playerState === 0) {
          setHideYoutubeSurface(true);
          finishIntro();
        }
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [applyYoutubeAudioState, finishIntro, onFinished, sendYoutubeCommand, showYoutubeIntro]);

  useEffect(() => {
    if (!onFinished) return;
    if (fallbackFinishAfterMs <= 0) {
      if (!showDirectIntro && !showYoutubeIntro) finishIntro();
      return;
    }

    // Reset and start timer for the CURRENT video in the playlist
    const timer = window.setTimeout(() => {
      // If we are in a playlist, this will move to next video
      // If it's the last video, it will call onFinished
      finishIntro();
    }, fallbackFinishAfterMs);
    
    return () => window.clearTimeout(timer);
  }, [fallbackFinishAfterMs, finishIntro, onFinished, showDirectIntro, showYoutubeIntro, currentVideoIndex]);

  useEffect(() => {
    if (!showDirectIntro) return;
    const player = directVideoRef.current;
    if (!player) return;

    let cancelled = false;
    let hasStarted = false;
    const tryAutoplay = async () => {
      player.muted = shouldMuteIntro;
      try {
        await player.play();
      } catch {
        // Browser blocked unmuted autoplay: retry muted and keep muted for this intro.
        player.muted = true;
        await player.play().catch(() => {});
      }
    };

    const handlePlaying = () => {
      hasStarted = true;
    };

    const handleCanPlay = () => {
      if (cancelled) return;
      if (player.ended) return;
      if (!player.paused) return;
      void tryAutoplay();
    };

    const stallGuardTimer = window.setTimeout(() => {
      if (cancelled || hasStarted || player.ended) return;
      player.muted = true;
      player.currentTime = 0;
      void player.play().catch(() => {});
    }, 900);

    player.addEventListener("playing", handlePlaying);
    player.addEventListener("canplay", handleCanPlay);
    player.addEventListener("loadeddata", handleCanPlay);
    void tryAutoplay();
    return () => {
      cancelled = true;
      window.clearTimeout(stallGuardTimer);
      player.removeEventListener("playing", handlePlaying);
      player.removeEventListener("canplay", handleCanPlay);
      player.removeEventListener("loadeddata", handleCanPlay);
    };
  }, [showDirectIntro, directIntroSrc, shouldMuteIntro]);

  return (
    <div className={`relative h-screen w-screen bg-black ${className}`.trim()}>
      {showDirectIntro ? (
        <div className="relative h-full w-full">
          <video
            ref={directVideoRef}
            className="h-full w-full object-cover"
            autoPlay
            preload="auto"
            muted={shouldMuteIntro}
            loop={!onFinished}
            playsInline
            controls={!INTRO_HIDE_DIRECT_CONTROLS && !INTRO_LOCK_PLAYER_CONTROLS}
            disablePictureInPicture={INTRO_HIDE_DIRECT_CONTROLS || INTRO_LOCK_PLAYER_CONTROLS}
            controlsList={(INTRO_HIDE_DIRECT_CONTROLS || INTRO_LOCK_PLAYER_CONTROLS)
              ? "nodownload noplaybackrate noremoteplayback nofullscreen"
              : undefined}
            onPause={(event) => {
              if (!event.currentTarget.ended) {
                void event.currentTarget.play().catch(() => {});
              }
            }}
            onEnded={onFinished ? () => finishIntro() : undefined}
            onError={onFinished ? () => finishIntro() : undefined}
            onContextMenu={(event) => event.preventDefault()}
            src={directIntroSrc}
          />
          {(INTRO_LOCK_PLAYER_CONTROLS || INTRO_HIDE_DIRECT_CONTROLS) ? <div className="absolute inset-0 z-10" /> : null}
        </div>
      ) : null}

      {showYoutubeIntro ? (
        <div className="absolute inset-0 overflow-hidden bg-black">
          <iframe
            ref={youtubeFrameRef}
            className={`absolute inset-0 h-full w-full ${INTRO_LOCKED_UI ? "pointer-events-none" : ""}`}
            src={youtubeIntroSrc}
            title={alt}
            allow="autoplay; encrypted-media"
            allowFullScreen={!INTRO_LOCKED_UI}
            onLoad={initializeYoutubeBridge}
          />
          {INTRO_LOCKED_UI ? <div className="absolute inset-0 z-10" /> : null}
          {INTRO_LOCKED_UI ? <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-black/95" /> : null}
          {INTRO_LOCKED_UI ? <div className="pointer-events-none absolute right-0 top-0 h-20 w-56 bg-gradient-to-l from-black/95 via-black/70 to-transparent" /> : null}
          {INTRO_LOCKED_UI ? <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-black/95" /> : null}
          {hideYoutubeSurface ? <div className="absolute inset-0 z-20 bg-black" /> : null}
        </div>
      ) : null}

      {showNOnlyIntro ? (
        INTRO_USE_LOADING_IMAGE ? (
          <img className={imageClassName} src={imageSrc} alt={alt} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="relative h-[22vh] min-h-[120px] max-h-[240px] w-[14vh] min-w-[72px] max-w-[148px] animate-pulse"
              aria-label={alt}
              role="img"
            >
              <span className="absolute inset-y-0 left-0 w-[28%] rounded-[2px] bg-[#e50914] shadow-[0_0_24px_rgba(229,9,20,0.65)]" />
              <span className="absolute inset-y-0 right-0 w-[28%] rounded-[2px] bg-[#e50914] shadow-[0_0_24px_rgba(229,9,20,0.65)]" />
              <span className="absolute inset-y-0 left-1/2 w-[34%] -translate-x-1/2 skew-x-[-16deg] rounded-[2px] bg-gradient-to-b from-[#ff4c55] via-[#e50914] to-[#7d0208] shadow-[0_0_24px_rgba(229,9,20,0.55)]" />
            </div>
          </div>
        )
      ) : null}
    </div>
  );
};

export default IntroN;
