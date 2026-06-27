import { NextResponse } from "next/server";
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

    // Fetch metadata via YouTube's free oEmbed API (no key needed, never blocked)
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`;
    const res = await fetch(oembedUrl);

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return NextResponse.json(
          { error: "This video is private or embedding is disabled." },
          { status: 404 }
        );
      }
      if (res.status === 404) {
        return NextResponse.json(
          { error: "Video not found. It may be deleted or region-restricted." },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch video metadata." },
        { status: 500 }
      );
    }

    const data = await res.json();

    // oEmbed returns: title, author_name, thumbnail_url (among others)
    // Duration is not available via oEmbed — we pass 0 and resolve it during conversion
    return NextResponse.json({
      title: data.title || "Unknown Title",
      thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: 0,
      uploader: data.author_name || "Unknown Uploader",
    });
  } catch (error: any) {
    console.error("Analysis failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze link" },
      { status: 500 }
    );
  }
}
