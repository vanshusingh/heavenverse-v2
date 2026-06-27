import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import ytdl from "@distube/ytdl-core";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "child_process";
import { cleanOldDownloads } from "@/lib/cleanup";
import { extractVideoId, getDownloadsDir } from "@/lib/youtube";

// Increase max duration for serverless (Vercel Pro: 60s)
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // Run lazy cleanup to sweep old downloaded files
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

    // Fetch video info to get the title for the filename
    console.log("Fetching video info via ytdl-core...");

    let info;
    try {
      info = await ytdl.getInfo(canonicalUrl, {
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
    } catch (infoErr: any) {
      console.error("ytdl-core getInfo failed:", infoErr.message);

      // Parse common errors into user-friendly messages
      if (
        infoErr.message?.includes("Sign in") ||
        infoErr.message?.includes("bot")
      ) {
        return NextResponse.json(
          {
            error:
              "YouTube is requiring sign-in verification. This may be a temporary restriction. Please try again in a few minutes.",
          },
          { status: 503 }
        );
      }
      if (
        infoErr.message?.includes("private") ||
        infoErr.message?.includes("unavailable")
      ) {
        return NextResponse.json(
          {
            error:
              "This video is unavailable. It might be private, deleted, or restricted.",
          },
          { status: 404 }
        );
      }

      throw infoErr;
    }

    const resolvedTitle = info.videoDetails.title || "audio";
    const safeTitle = resolvedTitle.replace(/[\\/:*?"<>|]/g, "_");
    const outputFilename = `${safeTitle}.mp3`;
    const finalMp3Path = path.join(outputDir, outputFilename);

    // If the file already exists (cached), return immediately
    if (fs.existsSync(finalMp3Path)) {
      console.log("Cached MP3 found, returning immediately:", outputFilename);
      return NextResponse.json({
        success: true,
        fileName: outputFilename,
      });
    }

    // Resolve ffmpeg path safely
    let resolvedFfmpegPath = ffmpegPath;
    if (resolvedFfmpegPath && !fs.existsSync(resolvedFfmpegPath)) {
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

    if (!resolvedFfmpegPath) {
      throw new Error("ffmpeg binary not found. Ensure ffmpeg-static is installed.");
    }

    // Parse audio quality (default 320kbps)
    const parsedQuality = quality
      ? isNaN(Number(quality))
        ? 320
        : Number(quality)
      : 320;

    console.log(`Starting audio download + transcode to ${parsedQuality}kbps MP3...`);

    // Download audio stream via ytdl-core and pipe directly through ffmpeg
    await new Promise<void>((resolve, reject) => {
      const audioStream = ytdl(canonicalUrl, {
        filter: "audioonly",
        quality: "highestaudio",
        requestOptions: {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          },
        },
      });

      const ffmpegProcess = spawn(resolvedFfmpegPath!, [
        "-y",
        "-i",
        "pipe:0", // Read from stdin (piped audio stream)
        "-vn", // No video
        "-ab",
        `${parsedQuality}k`,
        "-f",
        "mp3",
        finalMp3Path,
      ]);

      // Pipe the ytdl audio stream into ffmpeg's stdin
      audioStream.pipe(ffmpegProcess.stdin);

      let ffmpegError = "";
      ffmpegProcess.stderr.on("data", (data: Buffer) => {
        ffmpegError += data.toString();
      });

      audioStream.on("error", (err: Error) => {
        console.error("ytdl-core stream error:", err.message);
        ffmpegProcess.kill("SIGTERM");
        reject(new Error(`Audio download failed: ${err.message}`));
      });

      ffmpegProcess.on("close", (code: number | null) => {
        if (code === 0) {
          console.log("FFmpeg transcoding completed successfully.");
          resolve();
        } else {
          console.error("FFmpeg stderr:", ffmpegError);
          reject(
            new Error(
              `FFmpeg exited with code ${code}. Check server logs for details.`
            )
          );
        }
      });

      ffmpegProcess.on("error", (err: Error) => {
        console.error("FFmpeg process error:", err.message);
        reject(new Error(`FFmpeg failed to start: ${err.message}`));
      });
    });

    // Verify the output file was created
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

    // Parse common errors into friendly messages
    if (errorMessage.includes("Video unavailable")) {
      errorMessage =
        "This video is unavailable. It might be private, deleted, or restricted by the owner.";
    } else if (
      errorMessage.includes("Sign in to confirm your age") ||
      errorMessage.includes("confirm your age")
    ) {
      errorMessage =
        "This video is age-restricted and cannot be downloaded.";
    } else if (
      errorMessage.includes("geo") ||
      errorMessage.includes("geographic")
    ) {
      errorMessage =
        "This video is geographically restricted or blocked in your region.";
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
