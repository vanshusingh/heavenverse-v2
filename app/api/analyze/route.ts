import { NextResponse } from "next/server";
import path from "path";
import { create } from "yt-dlp-exec";
import { getYtDlpPath, getYtDlpOptions } from "@/lib/ytdlp";

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url || !url.trim()) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Initialize local/remote yt-dlp wrapper dynamically
    const ytdlpPath = await getYtDlpPath();
    const ytdlp = create(ytdlpPath);

    console.log("Starting yt-dlp...");
    console.log("URL:", url);
    console.log("Process cwd:", process.cwd());
    console.log("ytdlp loaded:", !!ytdlp);

    // Extract metadata using yt-dlp with robust parsing flags
    const info = await ytdlp(url, getYtDlpOptions({
      dumpSingleJson: true,
      noWarnings: true,
      noPlaylist: true,

      extractorArgs: "youtube:player_client=default,-android_sdkless",
      jsRuntimes: `node:${process.execPath}`,
    })) as any;

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
