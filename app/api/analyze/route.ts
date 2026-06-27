import { NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";
import { extractVideoId } from "@/lib/youtube";

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

    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Fetch video metadata via @distube/ytdl-core (pure Node.js, no binary needed)
    const info = await ytdl.getInfo(canonicalUrl, {
      requestOptions: {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      },
    });

    const details = info.videoDetails;

    // Pick the best available thumbnail
    const thumbnails = details.thumbnails || [];
    const bestThumb =
      thumbnails.length > 0
        ? thumbnails.sort((a, b) => (b.width || 0) - (a.width || 0))[0].url
        : "";

    return NextResponse.json({
      title: details.title || "Unknown Title",
      thumbnail: bestThumb,
      duration: parseInt(details.lengthSeconds, 10) || 0,
      uploader: details.author?.name || details.ownerChannelName || "Unknown Uploader",
    });
  } catch (error: any) {
    console.error("Analysis failed:", error);

    let errorMessage = error.message || "Failed to analyze link";

    // Parse common ytdl-core errors into friendly messages
    if (errorMessage.includes("Sign in") || errorMessage.includes("bot")) {
      errorMessage =
        "YouTube is temporarily restricting requests. Please try again in a moment.";
    } else if (
      errorMessage.includes("private") ||
      errorMessage.includes("unavailable")
    ) {
      errorMessage =
        "This video is unavailable. It might be private, deleted, or restricted.";
    } else if (errorMessage.includes("age")) {
      errorMessage =
        "This video is age-restricted and cannot be analyzed.";
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
