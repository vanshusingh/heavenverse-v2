import fs from "fs";
import path from "path";

// Dynamically resolve yt-dlp binary path
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

// Dynamically build options for yt-dlp-exec
export function getYtDlpOptions(baseOptions: any = {}): any {
  const options = { ...baseOptions };

  // Remove deprecated options to clean up logs
  if ("youtubeSkipDashManifest" in options) {
    delete options.youtubeSkipDashManifest;
  }

  // Handle YouTube cookies environment variable for bypassing bot challenges on cloud servers
  const cookiesEnv = process.env.YT_COOKIES;
  if (cookiesEnv && cookiesEnv.trim()) {
    const cookiesPath = process.platform === "win32" ? path.join(process.cwd(), "cookies.txt") : "/tmp/cookies.txt";
    try {
      fs.writeFileSync(cookiesPath, cookiesEnv.trim(), "utf8");
      options.cookies = cookiesPath;
      console.log("YouTube cookies written successfully to:", cookiesPath);
    } catch (err) {
      console.error("Failed to write YT_COOKIES to file:", err);
    }
  } else {
    console.log("No YT_COOKIES environment variable found. Continuing unauthenticated.");
  }

  return options;
}
