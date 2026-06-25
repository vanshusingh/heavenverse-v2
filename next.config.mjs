import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  transpilePackages: ["gsap"],
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ["ffmpeg-static", "yt-dlp-exec"],
  outputFileTracingExcludes: {
    '*': [
      '**/.next/cache/**/*',
      '**/.git/**/*',
      '**/yt-dlp.exe',
    ],
  },
}

export default nextConfig


