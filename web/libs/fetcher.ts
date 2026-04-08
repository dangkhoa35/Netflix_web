import { logInfo, logError } from "./logger";

const isDev = process.env.NODE_ENV === "development";

const fetcher = async (url: string) => {
  try {
    if (isDev) {
      logInfo("fetcher:start", { url });
    }

    const res = await fetch(url, {
      credentials: "include",
      cache: "no-store",
    });

    const text = await res.text();
    if (isDev) {
      logInfo("fetcher:response", {
        url,
        status: res.status,
        preview: text.slice(0, 120),
      });
    }

    if (!res.ok) {
      const safeMessage = isDev
        ? `HTTP ${res.status} - ${text.slice(0, 200)}`
        : `HTTP ${res.status}`;

      if (isDev) {
        logError("fetcher:response:error", {
          url,
          status: res.status,
          error: text.slice(0, 200),
        });
      } else {
        logError("fetcher:response:error", {
          url,
          status: res.status,
        });
      }
      throw new Error(safeMessage);
    }

    return text ? JSON.parse(text) : null;
  } catch (err) {
    logError("fetcher", err, { url });
    throw err; // quan trọng để SWR nhận lỗi
  }
};

export default fetcher;
