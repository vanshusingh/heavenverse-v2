import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { create } from "yt-dlp-exec";
import ffmpegPath from "ffmpeg-static";
import { cleanOldDownloads } from "@/lib/cleanup";

export async function POST(req: Request) {
  try {
    // Run lazy cleanup to sweep old downloaded files
    cleanOldDownloads();

    const { url, quality } = await req.json();

    if (!url || !url.trim()) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const outputDir = path.join(
      process.cwd(),
      "downloads"
    );

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Initialize local yt-dlp.exe wrapper
    const ytdlp = create(path.join(process.cwd(), "yt-dlp.exe"));

    console.log("Starting yt-dlp...");
    console.log("URL:", url);
    console.log("Process cwd:", process.cwd());
    console.log("ytdlp loaded:", !!ytdlp);

    // Extract title first to return the resolved file path accurately
    const info = await ytdlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noPlaylist: true,
      youtubeSkipDashManifest: true,
    }) as any;

    const resolvedTitle = info.title || "audio";
    const safeTitle = resolvedTitle.replace(/[\\/:*?"<>|]/g, "_"); // Sanitize filename
    const outputFilename = `${safeTitle}.mp3`;

    // Resolve ffmpeg path safely to prevent Next.js bundling path resolution issues
    let resolvedFfmpegPath = ffmpegPath;
    if (resolvedFfmpegPath) {
      if (!fs.existsSync(resolvedFfmpegPath)) {
        const fallbackPath = path.join(
          process.cwd(),
          "node_modules",
          "ffmpeg-static",
          process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
        );
        if (fs.existsSync(fallbackPath)) {
          resolvedFfmpegPath = fallbackPath;
        }
      }
    }

    // Parse the audio quality parameter from client (default to 320 kbps if invalid/not provided)
    const parsedQuality = quality ? (isNaN(Number(quality)) ? 320 : Number(quality)) : 320;

    // Download audio and convert using static ffmpeg
    await ytdlp(url, {
      extractAudio: true,
      audioFormat: "mp3",
      audioQuality: parsedQuality,
      noPlaylist: true,
      ffmpegLocation: resolvedFfmpegPath || undefined,
      output: path.join(outputDir, `${safeTitle}.%(ext)s`),
    });

    return NextResponse.json({
      success: true,
      fileName: outputFilename,
    });
  } catch (err: any) {
    console.error("Conversion failed:", err);
    let errorMessage = err.message || "Conversion failed";
    
    // Parse common yt-dlp/YouTube errors into friendly user warnings
    if (errorMessage.includes("Video unavailable")) {
      errorMessage = "This video is unavailable. It might be private, deleted, or restricted by the owner on third-party players.";
    } else if (errorMessage.includes("Sign in to confirm your age")) {
      errorMessage = "This video is age-restricted. YouTube blocks automated downloads for age-gated media.";
    } else if (errorMessage.includes("confirm your age")) {
      errorMessage = "This video requires age verification and cannot be downloaded.";
    } else if (errorMessage.includes("geo") || errorMessage.includes("geographic")) {
      errorMessage = "This video is geographically restricted or blocked in your region.";
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
