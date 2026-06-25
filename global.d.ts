declare module 'yt-dlp-exec' {
  const ytDlp: any;
  export const create: any;
  export default ytDlp;
}

declare module 'ffmpeg-static' {
  const ffmpeg: string;
  export default ffmpeg;
}

declare module 'ffprobe-static' {
  const ffprobe: { path: string };
  export default ffprobe;
}
