import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { create } from "yt-dlp-exec";
import ffmpegPath from "ffmpeg-static";
import { cleanOldDownloads } from "@/lib/cleanup";
import { getYtDlpPath } from "@/lib/ytdlp";

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

    // Initialize local/remote yt-dlp wrapper dynamically
    const ytdlpPath = await getYtDlpPath();
    const ytdlp = create(ytdlpPath);

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
      extractorArgs: "youtube:player_client=default,-android_sdkless",
      jsRuntimes: `node:${process.execPath}`,
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

    // 1. Download the raw audio stream directly using yt-dlp (no postprocessing, bypassing ffprobe requirement)
    const downloadTemplate = path.join(outputDir, `${safeTitle}.%(ext)s`);
    await ytdlp(url, {
      format: "bestaudio",
      noPlaylist: true,
      output: downloadTemplate,
      extractorArgs: "youtube:player_client=default,-android_sdkless",
      jsRuntimes: `node:${process.execPath}`,
    });

    // 2. Find the downloaded raw audio file (webm, m4a, opus, etc.)
    const extensions = ["webm", "m4a", "opus", "ogg", "aac"];
    let downloadedFilePath = "";
    for (const ext of extensions) {
      const checkPath = path.join(outputDir, `${safeTitle}.${ext}`);
      if (fs.existsSync(checkPath)) {
        downloadedFilePath = checkPath;
        break;
      }
    }

    if (!downloadedFilePath) {
      // Fallback: search directory for any file starting with safeTitle and not ending with .mp3
      const files = fs.readdirSync(outputDir);
      const match = files.find(f => f.startsWith(safeTitle) && !f.endsWith(".mp3"));
      if (match) {
        downloadedFilePath = path.join(outputDir, match);
      }
    }

    if (!downloadedFilePath) {
      throw new Error("Could not locate the downloaded audio stream file.");
    }

    // 3. Transcode to MP3 using local ffmpeg directly
    const finalMp3Path = path.join(outputDir, outputFilename);
    const { execFileSync } = require("child_process");
    
    console.log(`Directly transcoding to MP3: "${resolvedFfmpegPath}" -y -i "${downloadedFilePath}" -ab ${parsedQuality}k "${finalMp3Path}"`);
    execFileSync(resolvedFfmpegPath, [
      "-y",
      "-i",
      downloadedFilePath,
      "-ab",
      `${parsedQuality}k`,
      finalMp3Path,
    ], {
      stdio: "ignore",
    });

    // 4. Delete the temporary raw audio download file
    if (fs.existsSync(downloadedFilePath)) {
      fs.unlinkSync(downloadedFilePath);
    }

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
