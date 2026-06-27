"use client"

import type React from "react"
import { useState } from "react"
import { Heart, Volume2, VolumeX, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat } from "lucide-react"
import Image from "next/image"

interface Song {
  id: string
  title: string
  artist: string
  duration: string
  streamUrl?: string
}

interface AppleMusicWidgetProps {
  currentSong: Song
  isPlaying: boolean
  setIsPlaying: (isPlaying: boolean) => void
  currentTime: number
  duration: number
  onSeek: (percentage: number) => void
  onNext: () => void
  onPrev: () => void
  volume: number
  setVolume: (volume: number) => void
  isMuted: boolean
  setIsMuted: (isMuted: boolean) => void
}

export function AppleMusicWidget({
  currentSong,
  isPlaying,
  setIsPlaying,
  currentTime,
  duration,
  onSeek,
  onNext,
  onPrev,
  volume,
  setVolume,
  isMuted,
  setIsMuted,
}: AppleMusicWidgetProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [isShuffled, setIsShuffled] = useState(false)
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("one")
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = (clickX / rect.width) * 100
    onSeek(Math.max(0, Math.min(100, percentage)))
  }

  return (
    <div className="w-full max-w-[340px] h-[520px] bg-white/10 dark:bg-[#0e1622]/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl rounded-3xl p-6 flex flex-col justify-between hover:bg-white/15 dark:hover:bg-[#0e1622]/45 transition-all duration-300">
      {/* Album Art (HV Logo) with Waveform Overlay */}
      <div className="relative group w-full aspect-square rounded-2xl overflow-hidden bg-white dark:bg-[#1e293b] flex items-center justify-center p-8">
        <Image
          src="/images/hv-logo.svg"
          alt="Heavenverse Logo"
          width={292}
          height={292}
          className={`w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.03] ${
            isPlaying ? "scale-[0.96]" : ""
          }`}
        />
        
        {/* Dynamic Waveform Visualizer */}
        <div className="absolute bottom-4 left-4 right-4 bg-black/55 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2.5 flex items-end justify-center gap-1 h-12 shadow-lg z-10">
          {Array.from({ length: 18 }).map((_, i) => {
            // Organic height factors for a premium equalizer design
            const heightMultiplier = [0.2, 0.45, 0.7, 0.35, 0.85, 0.95, 0.5, 0.8, 0.4, 0.65, 0.9, 0.75, 0.3, 0.8, 0.55, 0.7, 0.4, 0.2][i]
            return (
              <span
                key={i}
                style={{
                  height: `${heightMultiplier * 100}%`,
                  animationDelay: `${i * 0.05}s`,
                  animationDuration: `${0.8 + heightMultiplier * 0.4}s`,
                }}
                className={`w-[4px] bg-red-500 rounded-full transition-all ${
                  isPlaying ? "animate-soundwave" : "h-[3px] opacity-30"
                }`}
              />
            )
          })}
        </div>
        
        <div className="absolute inset-0 bg-black/5 transition-opacity duration-300" />
      </div>

      {/* Song Info & Quick Actions */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex flex-col min-w-0 flex-1 pr-4">
          <h3 className="text-white text-lg font-semibold truncate tracking-wide">
            {currentSong?.title || "Admirin You"}
          </h3>
          <p className="text-white/50 text-sm font-normal truncate mt-0.5">
            {currentSong?.artist || "Karan Aujla"}
          </p>
        </div>

        <div className="flex items-center shrink-0">
          <button
            onClick={() => setIsLiked(!isLiked)}
            className={`p-2 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 hover:bg-white/5 ${
              isLiked ? "text-red-400" : "text-white/60 hover:text-white"
            }`}
          >
            <Heart className="w-5 h-5" fill={isLiked ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full mt-2">
        <div
          className="relative h-1 bg-white/10 rounded-full cursor-pointer hover:h-1.5 transition-all duration-200"
          onClick={handleProgressClick}
        >
          <div
            className="absolute top-0 left-0 h-full bg-white dark:bg-[#1e293b] rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-white/40 mt-1.5 font-sans">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-2 mt-2">
        <button
          onClick={() => setIsShuffled(!isShuffled)}
          className={`p-2 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 hover:bg-white/5 ${
            isShuffled ? "text-white" : "text-white/40 hover:text-white"
          }`}
        >
          <Shuffle className="w-4 h-4" />
        </button>

        <button
          onClick={onPrev}
          className="p-2 rounded-full text-white/60 hover:text-white transition-all duration-200 hover:scale-110 active:scale-95 hover:bg-white/5"
        >
          <SkipBack className="w-5 h-5 fill-current" />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-12 h-12 rounded-full bg-white dark:bg-[#1e293b] text-black dark:text-slate-100 hover:bg-white/90 transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center shadow-lg cursor-pointer"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        <button
          onClick={onNext}
          className="p-2 rounded-full text-white/60 hover:text-white transition-all duration-200 hover:scale-110 active:scale-95 hover:bg-white/5"
        >
          <SkipForward className="w-5 h-5 fill-current" />
        </button>

        <button
          onClick={() => setRepeatMode(repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off")}
          className={`p-2 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 relative hover:bg-white/5 ${
            repeatMode !== "off" ? "text-white" : "text-white/40 hover:text-white"
          }`}
        >
          <Repeat className="w-4 h-4" />
          {repeatMode === "one" && (
            <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-white dark:bg-[#1e293b] text-black dark:text-slate-100 text-[9px] rounded-full flex items-center justify-center font-bold border border-[#0e1622]/40 shadow-sm">
              1
            </span>
          )}
        </button>
      </div>

      {/* Sleek, Premium Horizontal Volume Slider */}
      <div className="flex items-center gap-3 px-2 mt-3 mb-1">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="text-white/50 hover:text-white transition-colors cursor-pointer"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4.5 h-4.5" />
          ) : (
            <Volume2 className="w-4.5 h-4.5" />
          )}
        </button>
        <div className="flex-1 relative flex items-center">
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(Number(e.target.value))
              if (isMuted) setIsMuted(false)
            }}
            className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white focus:outline-none"
            style={{
              background: `linear-gradient(to right, rgba(255, 255, 255, 0.75) ${isMuted ? 0 : volume}%, rgba(255, 255, 255, 0.15) ${isMuted ? 0 : volume}%)`
            }}
          />
        </div>
      </div>
    </div>
  )
}
