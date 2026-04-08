import type { NextRouter } from "next/router";

export type WatchMode = "movie" | "trailer";

const WATCH_INTRO_AUDIO_INTENT_PREFIX = "nextflix:watch_intro_force_audio:";

export function buildWatchPath(movieId: string, mode: WatchMode = "movie"): string {
  const safeMovieId = String(movieId || "").trim();
  if (!safeMovieId) return "";
  return mode === "trailer" ? `/watch/${safeMovieId}?mode=trailer` : `/watch/${safeMovieId}`;
}

export function getWatchIntroAudioIntentKey(introKey: string): string {
  return `${WATCH_INTRO_AUDIO_INTENT_PREFIX}${introKey}`;
}

export function rememberWatchIntroAudioIntent(movieId: string, mode: WatchMode = "movie") {
  if (typeof window === "undefined") return;
  const safeMovieId = String(movieId || "").trim();
  if (!safeMovieId) return;

  try {
    window.sessionStorage.setItem(
      getWatchIntroAudioIntentKey(`${safeMovieId}:${mode}`),
      "1"
    );
  } catch {
    // Ignore storage failures and fall back to the default intro audio behavior.
  }
}

export async function navigateToWatch(
  router: NextRouter,
  movieId: string,
  mode: WatchMode = "movie"
) {
  const destination = buildWatchPath(movieId, mode);
  if (!destination) return false;
  rememberWatchIntroAudioIntent(movieId, mode);
  return router.push(destination);
}
