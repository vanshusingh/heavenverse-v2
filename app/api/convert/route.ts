import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { cleanOldDownloads } from "@/lib/cleanup";
import { extractVideoId, getDownloadsDir } from "@/lib/youtube";
import ytDlpExec from "yt-dlp-exec";

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
      `Downloading audio stream and transcoding to ${parsedQuality}kbps MP3 via yt-dlp with human-like client...`
    );

    // Download using yt-dlp-exec with android client spoofing to bypass bot detection
    await ytDlpExec(canonicalUrl, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: '0',
      output: finalMp3Path,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      extractorArgs: 'youtube:player_client=android,web' // This spoofs human detection
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
