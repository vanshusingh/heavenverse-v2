import fs from "fs";
import path from "path";

export function cleanOldDownloads() {
  try {
    const downloadsDir = path.join(process.cwd(), "downloads");
    if (!fs.existsSync(downloadsDir)) return;

    const files = fs.readdirSync(downloadsDir);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

    for (const file of files) {
      if (file === ".gitkeep") continue;
      
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
