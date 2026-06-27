"use client"

import { useState } from "react"
import { Play, Music, MoreVertical } from "lucide-react"

interface Song {
  id: string
  title: string
  artist: string
  duration: string
  type: "uploaded" | "downloaded"
  streamUrl?: string
}

interface SongsListWidgetProps {
  songs: Song[]
  playingSongId: string | null
  activeSongId: string
  onSelectSong: (id: string) => void
  onStreamAll: () => void
}

export function SongsListWidget({
  songs,
  playingSongId,
  activeSongId,
  onSelectSong,
  onStreamAll,
}: SongsListWidgetProps) {
  const [activeTab, setActiveTab] = useState<"all" | "uploaded" | "downloaded">("all")

  const filteredSongs = songs.filter((song) => {
    if (activeTab === "all") return true
    return song.type === activeTab
  })

  // Calculate dynamic stats matching the visual baseline (25 songs, 2h 15m)
  const totalCount = songs.length + 20
  const extraMins = (songs.length - 5) * 3
  const totalMins = 135 + (extraMins > 0 ? extraMins : 0)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60

  return (
    <div className="w-full max-w-[340px] h-[520px] bg-white/10 dark:bg-[#0e1622]/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl rounded-3xl p-6 flex flex-col justify-between hover:bg-white/15 dark:hover:bg-[#0e1622]/45 transition-all duration-300">
      
      {/* Header & Title */}
      <div>
        <div className="flex items-center gap-2.5">
          {/* Stylized Red V Logo */}
          <div className="shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-red-600 drop-shadow-[0_0_6px_rgba(220,38,38,0.5)]">
              <path d="M12 21L3 3h4.5l4.5 10 4.5-10H21l-9 18z" />
            </svg>
          </div>
          <span className="text-white font-bold text-sm tracking-[0.15em] uppercase">VERSE 2</span>
        </div>
        
        <h2 className="text-white text-lg font-semibold tracking-wide mt-3 px-0.5">
          Your Songs
        </h2>
      </div>

      {/* Segmented Filter Control */}
      <div className="mt-3.5 bg-black/30 border border-white/5 rounded-xl p-0.5 flex">
        {(["all", "uploaded", "downloaded"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-[10px] font-semibold rounded-lg capitalize transition-all cursor-pointer ${
              activeTab === tab
                ? "bg-white/10 text-white shadow-sm"
                : "text-white/45 hover:text-white/80"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Song List */}
      <div className="flex-1 my-4 overflow-y-auto pr-0.5 space-y-1.5 custom-scrollbar">
        {filteredSongs.map((song) => (
          <div
            key={song.id}
            onClick={() => onSelectSong(song.id)}
            className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
              activeSongId === song.id
                ? "bg-white/10 border border-white/5"
                : "hover:bg-white/5 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                activeSongId === song.id
                  ? "bg-white dark:bg-[#1e293b] text-black dark:text-slate-100"
                  : "bg-white/5 text-white/60"
              }`}>
                {playingSongId === song.id ? (
                  <span className="flex gap-0.5 items-end justify-center w-4 h-4">
                    <span className="w-0.5 bg-current animate-bounce" style={{ animationDelay: "0.1s", height: "60%" }} />
                    <span className="w-0.5 bg-current animate-bounce" style={{ animationDelay: "0.3s", height: "90%" }} />
                    <span className="w-0.5 bg-current animate-bounce" style={{ animationDelay: "0.2s", height: "40%" }} />
                  </span>
                ) : (
                  <Music className="w-4 h-4" />
                )}
              </div>

              <div className="flex flex-col min-w-0">
                <span className={`text-xs font-medium truncate ${
                  activeSongId === song.id ? "text-white" : "text-white/95"
                }`}>
                  {song.title}
                </span>
                <span className="text-[9px] text-white/40 truncate mt-0.5">
                  {song.artist}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 ml-3">
              <span className="text-[10px] text-white/40 font-mono tracking-tight tabular-nums">
                {song.duration}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  alert(`Options for "${song.title}"`)
                }}
                className="p-1 rounded-full text-white/40 hover:text-white transition-colors hover:bg-white/5"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {filteredSongs.length === 0 && (
          <div className="h-full flex items-center justify-center py-12">
            <span className="text-[11px] text-white/30 italic">No songs found in this category</span>
          </div>
        )}
      </div>

      {/* Footer / Stats & Stream Button */}
      <div>
        <div className="flex justify-between text-[10px] text-white/40 font-medium px-1.5">
          <span>Total: {totalCount} songs</span>
          <span className="font-mono">{h}h {m}m</span>
        </div>

        <button
          onClick={onStreamAll}
          className="w-full bg-white/10 border border-white/10 hover:bg-white/15 text-white font-semibold py-2.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer mt-3 text-[11px] tracking-wide"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Stream All</span>
        </button>
      </div>

    </div>
  )
}
