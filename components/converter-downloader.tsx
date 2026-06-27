"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Search, Loader2, CheckCircle2, Download } from "lucide-react"

const Youtube = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.528 3.545 12 3.545 12 3.545s-7.528 0-9.388.51C1.037 4.545.5 5.5.5 6.163.02 8.016.02 12 .02 12s0 3.984.48 5.837c.28 1.05.81 1.603 1.612 1.81 1.86.513 9.388.513 9.388.513s7.528 0 9.388-.513c.8-.207 1.332-.76 1.612-1.81.48-1.853.48-5.837.48-5.837s0-3.984-.48-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
)

interface Song {
  id: string
  title: string
  artist: string
  duration: string
  type: "uploaded" | "downloaded"
  streamUrl?: string
  coverArt?: string
}

interface ConverterDownloaderProps {
  onAddSong: (song: Omit<Song, "id">, streamUrl?: string) => void
  onPreviewSong?: (song: any) => void
}

export function ConverterDownloader({ onAddSong, onPreviewSong }: ConverterDownloaderProps) {
  const [urlInput, setUrlInput] = useState("")
  const [quality, setQuality] = useState<"128" | "192" | "320">("320")

  // Clear preview on unmount
  useEffect(() => {
    return () => {
      if (onPreviewSong) onPreviewSong(null)
    }
  }, [onPreviewSong])
  
  // Pipeline Stepper (Numeric representation: Step 1 to 6)
  const [step, setStep] = useState<number>(1)
  const [statusText, setStatusText] = useState("")
  const [progress, setProgress] = useState(0)
  
  // Analyzed metadata (Cover Art, Artist, Album, Track Name, Thumbnail URL)
  const [analyzedSong, setAnalyzedSong] = useState<{
    title: string
    artist: string
    album: string
    duration: string
    source: "spotify" | "youtube"
    thumbnailUrl?: string
  } | null>(null)

  const [downloadFileName, setDownloadFileName] = useState("")

  const handleDemoLink = (type: "spotify" | "youtube") => {
    const demoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    setUrlInput(demoUrl)
    runAnalysis(demoUrl)
  }

  const isYouTubeUrl = (url: string): boolean => {
    const clean = url.trim()
    return (
      /^(https?:\/\/)?(www\.)?(m\.)?(music\.)?(youtube\.com|youtu\.be)\//.test(clean) &&
      clean.length > 20
    )
  }

  const handleInputChange = (val: string) => {
    setUrlInput(val)
    if (isYouTubeUrl(val) && step === 1) {
      runAnalysis(val)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData("text")
    if (isYouTubeUrl(pastedText) && step === 1) {
      runAnalysis(pastedText)
    }
  }

  const runAnalysis = async (url: string) => {
    if (!url.trim()) return

    const isYoutube =
      url.includes("youtube.com") ||
      url.includes("youtu.be");

    if (!isYoutube) {
      alert("Only YouTube URLs supported");
      return;
    }

    setUrlInput(url) // Ensure input state matches the analyzed URL
    setStep(2) // Step 2: Fetch Metadata
    setStatusText("Frontend initiating socket connection...")
    setProgress(20)
    
    try {
      setStatusText("Extracting video metadata...")
      setProgress(50)

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to analyze YouTube link");
      }

      const data = await res.json();
      
      setProgress(85);
      setStatusText("Parsing stream properties and thumbnail...");

      // Convert duration in seconds to M:SS layout (oEmbed may return 0)
      const durationStr = data.duration > 0
        ? `${Math.floor(data.duration / 60)}:${Math.floor(data.duration % 60).toString().padStart(2, "0")}`
        : "—";

      // Normalize thumbnail URL if it starts with //
      let thumbUrl = data.thumbnail || "";
      if (thumbUrl.startsWith("//")) {
        thumbUrl = "https:" + thumbUrl;
      }

      const songInfo = {
        title: data.title,
        artist: data.uploader || "YouTube Artist",
        album: "YouTube Upload",
        duration: durationStr,
        source: "youtube" as const,
        thumbnailUrl: thumbUrl,
      };
      setAnalyzedSong(songInfo);
      if (onPreviewSong) {
        onPreviewSong(songInfo);
      }

      setStep(3); // Step 3: Show Metadata (Ready for Audio Download)
      setProgress(100);
      setStatusText("");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to parse metadata. Please verify the URL and try again.");
      setStep(1);
      setProgress(0);
      setStatusText("");
      setAnalyzedSong(null);
      if (onPreviewSong) {
        onPreviewSong(null);
      }
    }
  }

  const handleAnalyzeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    runAnalysis(urlInput)
  }

  const handleConvert = async () => {
    if (!analyzedSong) return
    setStep(3) // Step 3: Download Audio starts
    setProgress(0)
    setStatusText("Initiating audio stream download...")

    // Simulate progress increments during backend conversion
    const progressInterval = setInterval(() => {
      setProgress((prev: number) => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }

        const nextProgress = prev + 5;

        // Map progress boundaries to numeric pipeline steps
        if (nextProgress < 50) {
          setStep(3) // Step 3: Download Audio
          setStatusText("Downloading audio stream chunks...")
        } else if (nextProgress >= 50 && nextProgress < 85) {
          setStep(4) // Step 4: Convert MP3 (FFmpeg transcoding)
          setStatusText(`Invoking FFmpeg to transcode stream to ${quality}kbps MP3...`)
        } else if (nextProgress >= 85) {
          setStep(5) // Step 5: Save File (Temp caching)
          setStatusText("Express API packaging metadata and saving temporary file...")
        }

        return nextProgress;
      });
    }, 400);

    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: urlInput,
          quality,
        }),
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Transcoding failed on server");
      }

      const data = await res.json();

      setProgress(100);
      setStep(6); // Step 6: Download Ready
      setStatusText("Conversion completed successfully!");
      setDownloadFileName(data.fileName || `${analyzedSong.title}.mp3`);
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error(err);
      alert(err.message || "Conversion failed. Please try again.");
      setStep(3);
      setProgress(0);
      setStatusText("Conversion failed.");
    }
  }

  const handleSaveToLibrary = () => {
    if (!analyzedSong) return

    // Stream download path from our local server
    const downloadUrl = `/api/download?file=${encodeURIComponent(downloadFileName)}`;

    // Add real stream pointer to local library playlist
    onAddSong({
      title: analyzedSong.title,
      artist: analyzedSong.artist,
      duration: analyzedSong.duration,
      type: "downloaded",
      coverArt: analyzedSong.thumbnailUrl,
    }, downloadUrl);

    // Trigger browser file download anchor programmatically
    const a = document.createElement("a");
    a.href = `${downloadUrl}&download=true`;
    a.download = downloadFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setStep(7) // Step 7: Completed State
    setTimeout(() => {
      setUrlInput("")
      setStep(1)
      setAnalyzedSong(null)
      if (onPreviewSong) {
        onPreviewSong(null)
      }
      setProgress(0)
      setStatusText("")
      setDownloadFileName("")
    }, 2500)
  }



  return (
    <div className="max-w-6xl w-full bg-[#f9f8fa] border-[3px] border-black dark:border-[#334155] shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-[2rem] p-6 md:p-8 flex flex-col gap-6 text-black dark:text-slate-100 font-retro">
      
      {/* Title */}
      <div className="text-black dark:text-slate-100">
        <h1 className="text-2xl font-bold tracking-wide">Converter & Downloader</h1>
        <p className="text-black/50 text-xs mt-1">Convert YouTube links to high-quality MP3 format.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: URL Inputs & Pipeline Stepper (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Paste URL Form */}
          <div className="bg-white dark:bg-[#1e293b] border-2 border-black dark:border-[#334155] rounded-2xl p-5 shadow-[2px_2px_0px_black] text-black dark:text-slate-100">
            <h3 className="font-bold text-sm mb-3 uppercase">Paste YouTube URL</h3>
            
            <form onSubmit={handleAnalyzeSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <span className="text-[10px] text-black/50 font-bold px-1 uppercase">URL Link</span>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(e.target.value)}
                  onPaste={handlePaste}
                  disabled={step === 2 || (step >= 3 && step < 6)}
                  placeholder="Paste YouTube track link here..."
                  className="w-full bg-[#d5d4d9] border-2 border-black dark:border-[#334155] rounded-xl px-4 py-2.5 text-xs text-black dark:text-slate-100 placeholder-black/45 focus:outline-none focus:bg-[#c2c0c5] transition-all font-sans min-w-0"
                />
              </div>

              {/* Quality Select Dropdown */}
              <div className="flex flex-col gap-1.5 sm:w-28">
                <span className="text-[10px] text-black/50 font-bold px-1 uppercase">Audio Quality</span>
                <select
                  value={quality}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setQuality(e.target.value as any)}
                  disabled={step === 2 || (step >= 3 && step < 6)}
                  className="bg-[#d5d4d9] border-2 border-black dark:border-[#334155] rounded-xl px-3 py-2.5 text-xs text-black dark:text-slate-100 focus:outline-none focus:bg-[#c2c0c5] transition-all font-sans cursor-pointer font-bold"
                >
                  <option value="128" className="bg-[#f9f8fa] text-black dark:text-slate-100 font-bold">128 kbps</option>
                  <option value="192" className="bg-[#f9f8fa] text-black dark:text-slate-100 font-bold">192 kbps</option>
                  <option value="320" className="bg-[#f9f8fa] text-black dark:text-slate-100 font-bold">320 kbps</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={!urlInput.trim() || step === 2 || (step >= 3 && step < 6)}
                  className="w-full sm:w-auto bg-black text-white hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold px-5 py-2.5 border-2 border-black dark:border-[#334155] rounded-xl shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5 h-[38px]"
                >
                  {step === 2 ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Analyze</span>
                </button>
              </div>
            </form>

            {/* Quick Demo Links */}
            <div className="flex gap-2.5 mt-3 px-1">
              <span className="text-[10px] text-black/50 self-center font-bold">Try Demo:</span>
              <button
                type="button"
                onClick={() => handleDemoLink("youtube")}
                className="text-[9px] bg-[#e63b3b]/10 hover:bg-[#e63b3b]/20 text-[#e63b3b] border-2 border-black dark:border-[#334155] px-2.5 py-1 rounded-lg transition-colors font-bold cursor-pointer"
              >
                YouTube Link
              </button>
            </div>
          </div>

          {/* Progress / Status display */}
          {(step === 2 || (step >= 3 && step < 6) || statusText) && (
            <div className="bg-white dark:bg-[#1e293b] border-2 border-black dark:border-[#334155] rounded-2xl p-5 flex flex-col justify-center items-center py-6 shadow-[2px_2px_0px_black]">
              {(step >= 3 && step < 6) ? (
                <div className="w-full max-w-md flex flex-col items-center">
                  <span className="text-black dark:text-slate-100 text-xs font-bold mb-2 uppercase">Converting stream ({progress}%)</span>
                  <div className="w-full h-3 bg-[#d5d4d9] border border-black/40 rounded-full overflow-hidden shadow-inner">
                    <div
                      style={{ width: `${progress}%` }}
                      className="h-full bg-gradient-to-r from-[#e63b3b] to-red-600 transition-all duration-150"
                    />
                  </div>
                </div>
              ) : (
                <Loader2 className="w-6 h-6 text-black/40 animate-spin mb-2" />
              )}
              <span className="text-[10px] text-black/60 font-bold mt-3 animate-pulse text-center font-mono">
                {statusText}
              </span>
            </div>
          )}

        </div>

        {/* Right Side: Metadata / Action Card (5 cols) */}
        <div className="lg:col-span-5">
          {analyzedSong ? (
            <div className="bg-white dark:bg-[#1e293b] border-2 border-black dark:border-[#334155] rounded-2xl p-5 flex flex-col h-full justify-between gap-6 shadow-[2px_2px_0px_black] text-black dark:text-slate-100">
              
              {/* Media Card Details */}
              <div>
                <h3 className="font-bold text-sm mb-4 uppercase">Metadata Analysis</h3>
                
                <div className="flex flex-col gap-4 p-4 bg-[#e2e1e6] dark:bg-[#020617] border-2 border-black dark:border-[#334155] rounded-xl shadow-inner">
                  {/* Thumbnail Cover Preview */}
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden border-2 border-black dark:border-[#334155] shadow-md group bg-black/40">
                    <Image
                      src={analyzedSong.thumbnailUrl || "/images/karan-aujla-album.png"}
                      alt="Thumbnail preview"
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized
                    />
                    {/* Shadow overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    {/* Duration badge */}
                    <span className="absolute bottom-2.5 right-2.5 bg-black/85 px-2 py-0.5 rounded text-[9px] font-mono font-bold text-white tracking-wider border border-white/15">
                      {analyzedSong.duration}
                    </span>
                    {/* YouTube tag */}
                    <span className="absolute top-2.5 left-2.5 flex items-center gap-1 text-[8px] font-bold px-2.5 py-1 rounded-lg border-2 bg-white dark:bg-[#1e293b] border-black dark:border-[#334155] text-black dark:text-slate-100">
                      <Youtube className="w-2.5 h-2.5 text-red-600" />
                      <span className="uppercase tracking-widest">{analyzedSong.source}</span>
                    </span>
                  </div>

                  <div className="flex flex-col justify-center min-w-0 px-1">
                    <span className="text-sm font-bold text-black dark:text-slate-100 truncate">{analyzedSong.title}</span>
                    <span className="text-[10px] text-black/55 truncate mt-0.5">{analyzedSong.artist}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs px-1">
                    <span className="text-black/50 font-bold">Artist Name</span>
                    <span className="text-black dark:text-slate-100 font-bold">{analyzedSong.artist}</span>
                  </div>
                  <div className="flex justify-between text-xs px-1">
                    <span className="text-black/50 font-bold">Album Name</span>
                    <span className="text-black dark:text-slate-100 font-bold truncate max-w-[150px] text-right">{analyzedSong.album}</span>
                  </div>
                  <div className="flex justify-between text-xs px-1">
                    <span className="text-black/50 font-bold">Track Name</span>
                    <span className="text-black dark:text-slate-100 font-bold">{analyzedSong.title}</span>
                  </div>
                  <div className="flex justify-between text-xs px-1 border-t-2 border-dashed border-black/15 pt-2 mt-2">
                    <span className="text-black/50 font-bold">Source Platform</span>
                    <span className="text-black dark:text-slate-100 font-bold flex items-center gap-1 capitalize">
                      <Youtube className="w-3.5 h-3.5 text-red-600" /> YouTube
                    </span>
                  </div>
                  <div className="flex justify-between text-xs px-1">
                    <span className="text-black/50 font-bold">Conversion Quality</span>
                    <span className="text-black dark:text-slate-100 font-mono font-bold">{quality}kbps MP3</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                {step === 3 && (
                  <button
                    onClick={handleConvert}
                    className="w-full bg-[#4a689d] text-white text-xs font-bold py-2.5 border-2 border-black dark:border-[#334155] rounded-xl transition-all shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-none cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Convert Audio</span>
                  </button>
                )}

                {step === 6 && (
                  <button
                    onClick={handleSaveToLibrary}
                    className="w-full bg-[#e63b3b] text-white text-xs font-bold py-2.5 border-2 border-black dark:border-[#334155] rounded-xl transition-all shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-none cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download MP3 & Stream Instantly</span>
                  </button>
                )}

                {step === 7 && (
                  <div className="w-full bg-green-500/10 border-2 border-green-500 text-green-700 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Imported successfully! Streaming now...</span>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white dark:bg-[#1e293b] border-2 border-dashed border-black/25 bg-[#d5d4d9] rounded-2xl p-5 flex flex-col justify-center items-center py-16 h-full text-center">
              <span className="text-xs text-black/60 font-bold uppercase">Ready to Convert</span>
              <span className="text-[10px] text-black/50 mt-1 max-w-[200px] leading-relaxed font-bold">
                Paste a YouTube track link on the left to start the conversion.
              </span>
            </div>
          )}
        </div>

      </div>

    </div>
  )
}
