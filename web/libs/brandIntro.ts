const LOCAL_BRAND_INTRO_URL = "/intro.mp4";

function isYoutubeUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw.trim());
    return (
      parsed.hostname.includes("youtube.com")
      || parsed.hostname.includes("youtube-nocookie.com")
      || parsed.hostname.includes("youtu.be")
    );
  } catch {
    return false;
  }
}

export function getBrandIntroUrl(): string {
  const configured = String(process.env.NEXT_PUBLIC_BRAND_INTRO_URL ?? "").trim();
  if (!configured) return LOCAL_BRAND_INTRO_URL;

  // Brand intro audio is significantly more reliable from a direct MP4 source
  // than from a YouTube iframe during SPA navigation into /watch.
  if (isYoutubeUrl(configured)) return LOCAL_BRAND_INTRO_URL;

  return configured;
}

export { LOCAL_BRAND_INTRO_URL };
