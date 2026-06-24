import { NextResponse } from "next/server";
import path from "path";
import { create } from "yt-dlp-exec";

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url || !url.trim()) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Initialize yt-dlp-exec pointing to our local standalone executable
    const ytdlp = create(path.join(process.cwd(), "yt-dlp.exe"));

    console.log("Starting yt-dlp...");
    console.log("URL:", url);
    console.log("Process cwd:", process.cwd());
    console.log("ytdlp loaded:", !!ytdlp);

    // Extract metadata using yt-dlp with robust parsing flags
    const info = await ytdlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noPlaylist: true,
      youtubeSkipDashManifest: true,
      jsRuntimes: `node:${process.execPath}`,
    }) as any;

    return NextResponse.json({
      title: info.title || "Unknown Title",
      thumbnail: info.thumbnail || (info.thumbnails && info.thumbnails[0]?.url) || "",
      duration: info.duration || 0,
      uploader: info.uploader || info.artist || "Unknown Uploader",
    });
  } catch (error: any) {
    console.error("Analysis failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze link" },
      { status: 500 }
    );
  }
}
