import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { cleanOldDownloads } from "@/lib/cleanup";

export async function GET(req: Request) {
  try {
    // Run lazy cleanup to sweep old downloaded files
    cleanOldDownloads();

    const { searchParams } = new URL(req.url);
    const file = searchParams.get("file");

    if (!file) {
      return new Response("Missing file parameter", { status: 400 });
    }

    // Sanitize file parameter to prevent directory traversal
    const safeFile = path.basename(file);
    const filePath = path.join(process.cwd(), "downloads", safeFile);

    if (!fs.existsSync(filePath)) {
      return new Response("File not found", { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileBuffer = fs.readFileSync(filePath);

    const isDownload = searchParams.get("download") === "true";
    const disposition = isDownload ? "attachment" : "inline";

    // Stream binary response back
    return new Response(fileBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": stat.size.toString(),
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(safeFile)}"`,
      },
    });
  } catch (err: any) {
    console.error("Download streaming failed:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
