import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "child_process";
import ytdl from "@distube/ytdl-core";
import { cleanOldDownloads } from "@/lib/cleanup";
import { extractVideoId, getDownloadsDir } from "@/lib/youtube";

export const maxDuration = 60;

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

    // Fetch video info via ytdl-core
    const info = await ytdl.getInfo(canonicalUrl, {
      requestOptions: {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      },
    });

    const title = info.videoDetails.title || "audio";
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
      throw new Error(
        "ffmpeg binary not found. Ensure ffmpeg-static is installed."
      );
    }

    const parsedQuality = quality
      ? isNaN(Number(quality))
        ? 320
        : Number(quality)
      : 320;

    console.log(
      `Downloading audio stream and transcoding to ${parsedQuality}kbps MP3...`
    );

    // Create readable stream of the best audio format
    const audioStream = ytdl(canonicalUrl, {
      quality: "highestaudio",
      filter: "audioonly",
      requestOptions: {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
      },
    });

    await new Promise<void>((resolve, reject) => {
      const ffmpegProcess = spawn(resolvedFfmpegPath!, [
        "-y",
        "-i",
        "pipe:0",
        "-vn",
        "-ab",
        `${parsedQuality}k`,
        "-f",
        "mp3",
        finalMp3Path,
      ]);

      audioStream.pipe(ffmpegProcess.stdin);

      let ffmpegError = "";
      ffmpegProcess.stderr.on("data", (data: Buffer) => {
        ffmpegError += data.toString();
      });

      audioStream.on("error", (err: Error) => {
        console.error("Stream download error:", err.message);
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
