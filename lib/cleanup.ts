import fs from "fs";
import path from "path";
import { getDownloadsDir } from "@/lib/youtube";

export function cleanOldDownloads() {
  try {
    const downloadsDir = getDownloadsDir();
    if (!fs.existsSync(downloadsDir)) return;

    const files = fs.readdirSync(downloadsDir);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

    for (const file of files) {
      if (file === ".gitkeep") continue;
      // Only clean up audio files we created (mp3, webm, m4a, opus, ogg, aac)
      if (!/\.(mp3|webm|m4a|opus|ogg|aac)$/i.test(file)) continue;
      
      const filePath = path.join(downloadsDir, file);
      try {
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > oneHour) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up old download file: ${file}`);
        }
      } catch (fileErr) {
        console.error(`Error processing file ${file} for cleanup:`, fileErr);
      }
    }
  } catch (err) {
    console.error("Failed to clean up old downloads:", err);
  }
}
