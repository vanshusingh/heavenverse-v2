declare module 'ffmpeg-static' {
  const ffmpeg: string;
  export default ffmpeg;
}

declare module 'ffprobe-static' {
  const ffprobe: { path: string };
  export default ffprobe;
}
