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
 * Parse YouTube Data API v3 ISO 8601 duration string into total seconds.
 * Example: "PT4M13S" → 253, "PT1H2M3S" → 3723, "PT30S" → 30
 */
export function parseISO8601Duration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
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
