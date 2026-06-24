"use client"

import { useState } from "react"
import { FolderUp, Trash2, Edit2, Check, BarChart3, TrendingUp, Music } from "lucide-react"

interface Song {
  id: string
  title: string
  artist: string
  duration: string
  type: "uploaded" | "downloaded"
  streamUrl?: string
}

interface UploadStudioProps {
  songs: Song[]
  onDeleteSong: (id: string) => void
  onRenameSong: (id: string, newTitle: string, newArtist: string) => void
  onUploadSong: (song: Omit<Song, "id">) => void
}

export function UploadStudio({ songs, onDeleteSong, onRenameSong, onUploadSong }: UploadStudioProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editArtist, setEditArtist] = useState("")

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      processFile(file)
    }
  }

  const handleFileSelect = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "audio/*"
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      if (target.files && target.files[0]) {
        processFile(target.files[0])
      }
    }
    input.click()
  }

  const processFile = (file: File) => {
    if (file.type.startsWith("audio/")) {
      setUploadedFile(file.name)
      onUploadSong({
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: "Uploaded Track",
        duration: "3:15",
        type: "uploaded",
      })
      setTimeout(() => setUploadedFile(null), 3000)
    } else {
      setUploadedFile("Error: Audio files only")
      setTimeout(() => setUploadedFile(null), 3000)
    }
  }

  const startEditing = (song: Song) => {
    setEditingId(song.id)
    setEditTitle(song.title)
    setEditArtist(song.artist)
  }

  const saveEdit = (id: string) => {
    onRenameSong(id, editTitle, editArtist)
    setEditingId(null)
  }

  // Filter local uploads
  const uploadedSongs = songs.filter((s) => s.type === "uploaded")

  return (
    <div className="max-w-6xl w-full bg-white/10 dark:bg-[#0e1622]/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl rounded-3xl p-6 md:p-8 flex flex-col gap-6 hover:bg-white/15 dark:hover:bg-[#0e1622]/45 transition-all duration-300">
      
      {/* Title */}
      <div>
        <h1 className="text-white text-2xl font-bold tracking-wide">Upload Studio</h1>
        <p className="text-white/40 text-xs mt-1">Manage local audio uploads and monitor play statistics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Upload & Management (8 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Upload Song Area */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm">Upload & Stream</h3>
            </div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleFileSelect}
              className={`border border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 ${
                isDragging
                  ? "border-white/50 bg-white/10"
                  : "border-white/10 bg-white/0 hover:bg-white/5 hover:border-white/20"
              }`}
            >
              <FolderUp className="w-10 h-10 text-white/40 shrink-0" />
              <div className="text-center">
                <span className="text-xs text-white/60 font-semibold block">
                  {uploadedFile ? uploadedFile : "Drag & drop audio files here"}
                </span>
                <span className="text-[10px] text-white/40 block mt-1">
                  Supports MP3, WAV, FLAC (Max 25MB)
                </span>
              </div>
            </div>
          </div>

          {/* Song Management Area */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-5 flex-1 flex flex-col">
            <h3 className="text-white font-semibold text-sm mb-3">Song Management</h3>
            
            <div className="flex-1 overflow-y-auto max-h-[200px] pr-1 space-y-2 custom-scrollbar">
              {uploadedSongs.map((song) => (
                <div
                  key={song.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/60 shrink-0">
                      <Music className="w-4 h-4" />
                    </div>

                    {editingId === song.id ? (
                      <div className="flex flex-wrap gap-2 flex-1 min-w-0">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="bg-black/30 border border-white/10 rounded px-2 py-0.5 text-xs text-white placeholder-white/30 focus:outline-none min-w-[100px] flex-1"
                          placeholder="Song Title"
                        />
                        <input
                          type="text"
                          value={editArtist}
                          onChange={(e) => setEditArtist(e.target.value)}
                          className="bg-black/30 border border-white/10 rounded px-2 py-0.5 text-xs text-white placeholder-white/30 focus:outline-none min-w-[100px] flex-1"
                          placeholder="Artist"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-white truncate">{song.title}</span>
                        <span className="text-[9px] text-white/40 truncate mt-0.5">{song.artist}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {editingId === song.id ? (
                      <button
                        onClick={() => saveEdit(song.id)}
                        className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => startEditing(song)}
                        className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteSong(song.id)}
                      className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {uploadedSongs.length === 0 && (
                <div className="h-full flex items-center justify-center py-12">
                  <p className="text-xs text-white/30 italic">No uploaded songs found. Upload a track above!</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Side: Analytics (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Analytics Panel */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-5 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">Upload Analytics</h3>
                <BarChart3 className="w-4 h-4 text-white/40" />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3.5 bg-white/5 backdrop-blur-md rounded-xl border border-white/5 shadow-sm hover:bg-white/10 transition-all">
                  <span className="text-[10px] text-white/40 font-medium block">Streams Today</span>
                  <span className="text-xl font-bold text-white tracking-tight block mt-0.5">12,493</span>
                  <span className="text-[9px] text-green-400 font-semibold flex items-center gap-0.5 mt-1.5">
                    <TrendingUp className="w-3 h-3" /> +15.8%
                  </span>
                </div>
                <div className="p-3.5 bg-white/5 backdrop-blur-md rounded-xl border border-white/5 shadow-sm hover:bg-white/10 transition-all">
                  <span className="text-[10px] text-white/40 font-medium block">Downloads</span>
                  <span className="text-xl font-bold text-white tracking-tight block mt-0.5">4,281</span>
                  <span className="text-[9px] text-green-400 font-semibold flex items-center gap-0.5 mt-1.5">
                    <TrendingUp className="w-3 h-3" /> +8.4%
                  </span>
                </div>
              </div>

              {/* Local Storage Indicator */}
              <div className="p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/5 shadow-sm mb-6 hover:bg-white/10 transition-all">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] text-white/40 font-medium">Storage Used</span>
                  <span className="text-[10px] text-white/80 font-bold">7.2 GB / 20 GB</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    style={{ width: "36%" }}
                    className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full"
                  />
                </div>
                <span className="text-[8px] text-white/30 block mt-1.5">36% of total cloud storage consumed.</span>
              </div>
            </div>

            {/* Custom SVG stylized chart */}
            <div>
              <span className="text-[10px] text-white/40 font-medium block mb-2 px-1">Plays Over Time</span>
              <div className="w-full h-32 bg-black/20 rounded-xl p-2.5 flex items-end justify-between gap-1 border border-white/5">
                {[60, 45, 80, 55, 90, 70, 95, 85, 110, 75, 90, 105].map((val, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-1 bg-[#0e1622] text-[8px] text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10">
                      {val * 10}
                    </div>
                    {/* Bar */}
                    <div
                      style={{ height: `${(val / 120) * 100}%` }}
                      className="w-full bg-gradient-to-t from-red-600/60 to-red-500 rounded-sm hover:brightness-125 transition-all duration-300"
                    />
                    {/* Label */}
                    <span className="text-[7px] text-white/30 scale-90">
                      {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][idx]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  )
}
