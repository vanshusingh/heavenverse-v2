import fs from "fs";
import path from "path";

/**
 * Extract the YouTube video ID from any valid YouTube URL format.
 * Supports: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/,
 *           music.youtube.com/watch?v=, youtube.com/embed/, youtube.com/v/
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    // Standard: youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    // Short: youtu.be/VIDEO_ID
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // Shorts: youtube.com/shorts/VIDEO_ID
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    // Embed: youtube.com/embed/VIDEO_ID
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    // Old embed: youtube.com/v/VIDEO_ID
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    // Music: music.youtube.com/watch?v=VIDEO_ID
    /(?:music\.youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Get the platform-aware downloads directory.
 * - On Vercel/Linux: uses /tmp/ (only writable location in serverless)
 * - On Windows (local dev): uses ./downloads/ relative to project root
 *
 * Automatically creates the directory if it doesn't exist.
 */
export function getDownloadsDir(): string {
  const dir =
    process.platform === "win32"
      ? path.join(process.cwd(), "downloads")
      : "/tmp";

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return dir;
}

// Public Piped API instances (proxy audio streams through their servers)
const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.in.projectsegfau.lt",
];

// Public Invidious API instances (provide direct stream URLs)
const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.io.lol",
  "https://vid.puffyan.us",
];

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export interface AudioStreamResult {
  streamUrl: string;
  title: string;
  duration: number;
}

/**
 * Get an audio stream URL by querying Piped and Invidious APIs.
 * These services extract YouTube stream URLs from their own servers,
 * completely bypassing YouTube's bot detection on Vercel/cloud IPs.
 *
 * Piped is preferred because it proxies streams through its own servers.
 */
export async function getAudioStreamUrl(
  videoId: string
): Promise<AudioStreamResult> {
  const errors: string[] = [];

  // 1. Try Piped instances (proxied streams — most reliable from Vercel)
  for (const instance of PIPED_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${instance}/streams/${videoId}`, {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        errors.push(`Piped ${instance}: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const audioStreams: any[] = data.audioStreams || [];

      // Pick the highest bitrate audio stream
      const best = audioStreams
        .filter(
          (s: any) =>
            s.mimeType?.startsWith("audio/") && s.url && s.url.length > 0
        )
        .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];

      if (best?.url) {
        console.log(
          `Audio stream found via Piped (${instance}): ${best.mimeType} @ ${best.bitrate}bps`
        );
        return {
          streamUrl: best.url,
          title: data.title || "audio",
          duration: data.duration || 0,
        };
      }

      errors.push(`Piped ${instance}: no audio streams in response`);
    } catch (err: any) {
      errors.push(
        `Piped ${instance}: ${err.name === "AbortError" ? "timeout" : err.message}`
      );
      continue;
    }
  }

  // 2. Fallback to Invidious instances (direct CDN URLs)
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(
        `${instance}/api/v1/videos/${videoId}?fields=title,lengthSeconds,adaptiveFormats`,
        {
          headers: {
            "User-Agent": BROWSER_UA,
            Accept: "application/json",
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!res.ok) {
        errors.push(`Invidious ${instance}: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const formats: any[] = data.adaptiveFormats || [];

      // Pick the highest bitrate audio format
      const best = formats
        .filter(
          (f: any) => f.type?.startsWith("audio/") && f.url && f.url.length > 0
        )
        .sort(
          (a: any, b: any) =>
            (b.bitrate ? parseInt(b.bitrate) : 0) -
            (a.bitrate ? parseInt(a.bitrate) : 0)
        )[0];

      if (best?.url) {
        console.log(
          `Audio stream found via Invidious (${instance}): ${best.type} @ ${best.bitrate}bps`
        );
        return {
          streamUrl: best.url,
          title: data.title || "audio",
          duration: data.lengthSeconds || 0,
        };
      }

      errors.push(`Invidious ${instance}: no audio formats in response`);
    } catch (err: any) {
      errors.push(
        `Invidious ${instance}: ${err.name === "AbortError" ? "timeout" : err.message}`
      );
      continue;
    }
  }

  // All services failed
  console.error("All audio extraction services failed:", errors);
  throw new Error(
    "Could not extract audio stream. All services are currently unavailable. Please try again later."
  );
}
