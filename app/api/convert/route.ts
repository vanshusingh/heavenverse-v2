import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "child_process";
import { Readable } from "stream";
import { cleanOldDownloads } from "@/lib/cleanup";
import { extractVideoId, getDownloadsDir, getAudioStreamUrl } from "@/lib/youtube";

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

    const outputDir = getDownloadsDir();

    // Get audio stream URL via Piped/Invidious (bypasses YouTube bot detection)
    console.log("Fetching audio stream URL for video:", videoId);
    const { streamUrl, title } = await getAudioStreamUrl(videoId);

    const safeTitle = (title || "audio").replace(/[\\/:*?"<>|]/g, "_");
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
      throw new Error(
        "ffmpeg binary not found. Ensure ffmpeg-static is installed."
      );
    }

    // Parse audio quality (default 320kbps)
    const parsedQuality = quality
      ? isNaN(Number(quality))
        ? 320
        : Number(quality)
      : 320;

    console.log(
      `Downloading audio stream and transcoding to ${parsedQuality}kbps MP3...`
    );

    // Download the audio stream from the proxied URL
    const streamRes = await fetch(streamUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });

    if (!streamRes.ok || !streamRes.body) {
      throw new Error(
        `Failed to download audio stream: HTTP ${streamRes.status}`
      );
    }

    // Convert Web ReadableStream to Node.js Readable stream
    const reader = streamRes.body.getReader();
    const nodeStream = new Readable({
      async read() {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
        } else {
          this.push(Buffer.from(value));
        }
      },
    });

    // Pipe the downloaded audio stream through ffmpeg for MP3 transcoding
    await new Promise<void>((resolve, reject) => {
      const ffmpegProcess = spawn(resolvedFfmpegPath!, [
        "-y",
        "-i",
        "pipe:0", // Read from stdin
        "-vn", // No video
        "-ab",
        `${parsedQuality}k`,
        "-f",
        "mp3",
        finalMp3Path,
      ]);

      // Pipe the audio stream into ffmpeg's stdin
      nodeStream.pipe(ffmpegProcess.stdin);

      let ffmpegError = "";
      ffmpegProcess.stderr.on("data", (data: Buffer) => {
        ffmpegError += data.toString();
      });

      nodeStream.on("error", (err: Error) => {
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
      errorMessage.includes("age") &&
      errorMessage.includes("restricted")
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
