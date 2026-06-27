import { NextResponse } from "next/server";
import { extractVideoId, parseISO8601Duration } from "@/lib/youtube";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url || !url.trim()) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const videoId = extractVideoId(url.trim());
    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL. Could not extract video ID." },
        { status: 400 }
      );
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      console.error("YOUTUBE_API_KEY environment variable is not set.");
      return NextResponse.json(
        { error: "Server configuration error: YouTube API key is missing." },
        { status: 500 }
      );
    }

    // Fetch video metadata via YouTube Data API v3 (official, never blocked)
    const apiUrl = `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`;
    const apiRes = await fetch(apiUrl);

    if (!apiRes.ok) {
      const errorBody = await apiRes.text();
      console.error("YouTube API error:", apiRes.status, errorBody);

      if (apiRes.status === 403) {
        return NextResponse.json(
          { error: "YouTube API quota exceeded or API key is invalid. Please check your Google Cloud Console." },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: "Failed to fetch video metadata from YouTube API." },
        { status: 500 }
      );
    }

    const data = await apiRes.json();

    if (!data.items || data.items.length === 0) {
      return NextResponse.json(
        { error: "Video not found. It may be private, deleted, or region-restricted." },
        { status: 404 }
      );
    }

    const video = data.items[0];
    const snippet = video.snippet;
    const contentDetails = video.contentDetails;

    // Parse ISO 8601 duration (e.g., "PT4M13S") into seconds
    const durationSeconds = parseISO8601Duration(contentDetails.duration);

    // Pick the best available thumbnail (maxres > high > medium > default)
    const thumbnails = snippet.thumbnails;
    const thumbnail =
      thumbnails.maxres?.url ||
      thumbnails.high?.url ||
      thumbnails.medium?.url ||
      thumbnails.default?.url ||
      "";

    return NextResponse.json({
      title: snippet.title || "Unknown Title",
      thumbnail,
      duration: durationSeconds,
      uploader: snippet.channelTitle || "Unknown Uploader",
    });
  } catch (error: any) {
    console.error("Analysis failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze link" },
      { status: 500 }
    );
  }
}
