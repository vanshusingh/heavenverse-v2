import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { cleanOldDownloads } from "@/lib/cleanup";
import { extractVideoId, getDownloadsDir } from "@/lib/youtube";
import YTDlpWrap from "yt-dlp-wrap";

export const maxDuration = 60;

// Initialize yt-dlp binary path
// We use /tmp on Vercel as it's the only writable directory
const isVercel = process.env.VERCEL === "1";
const binaryDir = isVercel ? "/tmp" : path.join(process.cwd(), "bin");
const binaryPath = path.join(binaryDir, process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");

let ytDlpWrap: YTDlpWrap | null = null;

async function ensureYtDlp() {
  if (ytDlpWrap) return ytDlpWrap;
  
  if (!fs.existsSync(binaryDir)) {
    fs.mkdirSync(binaryDir, { recursive: true });
  }

  if (!fs.existsSync(binaryPath)) {
    console.log(`Downloading yt-dlp binary to ${binaryPath}...`);
    await YTDlpWrap.downloadFromGithub(binaryPath);
    
    if (process.platform !== "win32") {
      fs.chmodSync(binaryPath, '755'); // Make executable
    }
  }
  
  ytDlpWrap = new YTDlpWrap(binaryPath);
  return ytDlpWrap;
}

export async function POST(req: Request) {
  try {
    cleanOldDownloads();

    const { url, quality } = await req.json();

    if (!url || !url.trim()) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const videoId = extractVideoId(url.trim());
    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL." },
        { status: 400 }
      );
    }

    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const outputDir = getDownloadsDir();

    console.log("Fetching audio stream for video:", canonicalUrl);

    // Metadata fallback fetch via oEmbed
    let title = "audio";
    try {
       const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${canonicalUrl}&format=json`);
       if(oembedRes.ok) {
          const oembedData = await oembedRes.json();
          if(oembedData.title) title = oembedData.title;
       }
    } catch(e) {}

    const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_");
    const outputFilename = `${safeTitle}.mp3`;
    const finalMp3Path = path.join(outputDir, outputFilename);

    // Cached check
    if (fs.existsSync(finalMp3Path)) {
      console.log("Cached MP3 found, returning immediately:", outputFilename);
      return NextResponse.json({
        success: true,
        fileName: outputFilename,
      });
    }

    const parsedQuality = quality
      ? isNaN(Number(quality))
        ? 320
        : Number(quality)
      : 320;

    console.log(
      `Downloading audio stream and transcoding to ${parsedQuality}kbps MP3 via yt-dlp-wrap with human-like client...`
    );

    const wrap = await ensureYtDlp();

    // Download using yt-dlp-wrap with android client spoofing to bypass bot detection
    const ffmpegPath = require("ffmpeg-static");
    const args = [
      canonicalUrl,
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '--output', finalMp3Path,
      '--ffmpeg-location', ffmpegPath,
      '--no-check-certificates',
      '--no-warnings',
      '--prefer-free-formats',
      '--extractor-args', 'youtube:player_client=android,web' // This spoofs human detection
    ];

    await wrap.execPromise(args);

    if (!fs.existsSync(finalMp3Path)) {
      throw new Error("Conversion completed but output file was not found.");
    }

    console.log("Conversion successful:", outputFilename);

    return NextResponse.json({
      success: true,
      fileName: outputFilename,
    });
  } catch (err: any) {
    console.error("Conversion failed:", err);
    let errorMessage = err.message || "Conversion failed";

    if (errorMessage.includes("Video unavailable") || errorMessage.includes("Sign in")) {
      errorMessage =
        "YouTube bot detection blocked the request. Please try again later.";
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
