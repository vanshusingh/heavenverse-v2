import fs from "fs";
import path from "path";

export async function getYtDlpPath(): Promise<string> {
  // On Windows, use the local yt-dlp.exe from the workspace root
  if (process.platform === "win32") {
    const localExe = path.join(process.cwd(), "yt-dlp.exe");
    if (fs.existsSync(localExe)) {
      return localExe;
    }
    // Fallback if not found in root, look in node_modules/yt-dlp-exec
    const fallbackExe = path.join(process.cwd(), "node_modules", "yt-dlp-exec", "bin", "yt-dlp.exe");
    if (fs.existsSync(fallbackExe)) {
      return fallbackExe;
    }
    return "yt-dlp.exe";
  }

  // On Linux (Vercel / AWS Lambda / production)
  const targetPath = "/tmp/yt-dlp";

  // If already downloaded and cached in /tmp, return it
  if (fs.existsSync(targetPath)) {
    try {
      fs.accessSync(targetPath, fs.constants.X_OK);
      return targetPath;
    } catch {
      // If file exists but isn't executable, set permissions
      fs.chmodSync(targetPath, 0o755);
      return targetPath;
    }
  }

  console.log("yt-dlp not found in /tmp, downloading Linux binary...");

  // Download the official standalone Linux yt-dlp binary from GitHub releases
  const response = await fetch("https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux");
  if (!response.ok) {
    throw new Error(`Failed to download yt-dlp binary: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(targetPath, buffer);

  // Set executable permissions (rwxr-xr-x)
  fs.chmodSync(targetPath, 0o755);

  console.log("yt-dlp downloaded and marked executable successfully.");
  return targetPath;
}
