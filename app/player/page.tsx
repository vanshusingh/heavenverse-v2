"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { useTheme } from "next-themes"
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Search,
  Trash2,
  FolderUp,
  ListMusic,
  Settings as SettingsIcon,
  Plus,
  Heart,
  Info,
  Music,
  Home,
  MoreVertical,
  Sliders,
  X,
  ChevronRight,
  Youtube,
  Download,
  Loader2,
  HelpCircle,
  Edit2,
  Check,
  Volume1,
  User,
  ArrowUp,
  ArrowDown,
  Shield
} from "lucide-react"

import {
  LocalTrack,
  LocalPlaylist,
  saveTrack,
  getAllTracks,
  deleteTrack,
  savePlaylist,
  getAllPlaylists,
  deletePlaylist,
  clearAllData
} from "@/lib/db"

import { ConverterDownloader } from "@/components/converter-downloader"
import { TimeWeatherWidget } from "@/components/time-weather-widget"

// Default tracks to seed if user library is empty
const INITIAL_DEMO_TRACKS: Omit<LocalTrack, "id" | "addedAt">[] = []

export default function PlayerPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Layout Tab View: "home" | "library" | "playlists" | "converter" | "settings" | "about"
  const [activeTab, setActiveTab] = useState<"home" | "library" | "playlists" | "converter" | "settings" | "about">("home")

  // Recently played track tracking
  const [recentlyPlayedIds, setRecentlyPlayedIds] = useState<string[]>([])

  // Library lists & storage state
  const [tracks, setTracks] = useState<LocalTrack[]>([])
  const [playlists, setPlaylists] = useState<LocalPlaylist[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "duration" | "recent">("recent")

  // Selected Playlist sub-view detail
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null)

  // Playback state
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null)
  const [queue, setQueue] = useState<string[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(75)
  const [isMuted, setIsMuted] = useState(false)
  const [shuffleOn, setShuffleOn] = useState(false)
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off")
  const [likedTrackIds, setLikedTrackIds] = useState<string[]>([])
  const [autoplay, setAutoplay] = useState(true)
  const [visualizerOn, setVisualizerOn] = useState(true)

  // Upload/Drag-drop UI State
  const [isDragging, setIsDragging] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)

  // Editing metadata state
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editArtist, setEditArtist] = useState("")

  // Playlists Context Menu / Options
  const [activeMenuTrackId, setActiveMenuTrackId] = useState<string | null>(null)

  // References
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const objectUrlsRef = useRef<Record<string, string>>({})

  // Audio Context references for equalizer
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)

  // Storage Info State
  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number } | null>(null)

  const updateStorageEstimate = async () => {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate()
        setStorageInfo({
          usage: estimate.usage || 0,
          quota: estimate.quota || 1
        })
      } catch (err) {
        console.error("Failed to estimate storage", err)
      }
    }
  }

  // Keep storage estimate in sync when tracks change
  useEffect(() => {
    if (mounted) {
      updateStorageEstimate()
    }
  }, [tracks, mounted])

  // Mount logic
  useEffect(() => {
    setMounted(true)
    loadDatabase()
    updateStorageEstimate()

    // Restore state from localStorage
    const savedVolume = localStorage.getItem("hv_volume")
    if (savedVolume) setVolume(Number(savedVolume))

    const savedMute = localStorage.getItem("hv_muted")
    if (savedMute) setIsMuted(savedMute === "true")

    const savedShuffle = localStorage.getItem("hv_shuffle")
    if (savedShuffle) setShuffleOn(savedShuffle === "true")

    const savedRepeat = localStorage.getItem("hv_repeat")
    if (savedRepeat) setRepeatMode(savedRepeat as any)

    const savedAutoplay = localStorage.getItem("hv_autoplay")
    if (savedAutoplay) setAutoplay(savedAutoplay === "true")

    const savedVisualizer = localStorage.getItem("hv_visualizer")
    if (savedVisualizer) setVisualizerOn(savedVisualizer === "true")

    const savedLikes = localStorage.getItem("hv_liked_tracks")
    if (savedLikes) {
      try {
        setLikedTrackIds(JSON.parse(savedLikes))
      } catch (_) {}
    }

    const savedRecents = localStorage.getItem("hv_recently_played")
    if (savedRecents) {
      try {
        setRecentlyPlayedIds(JSON.parse(savedRecents))
      } catch (_) {}
    }
  }, [])

  // Clean up Object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(objectUrlsRef.current).forEach((url) => {
        URL.revokeObjectURL(url)
      })
    }
  }, [])

  // Load database and populate demo tracks if empty
  const loadDatabase = async () => {
    setIsLoading(true)
    try {
      let dbTracks = await getAllTracks()
      
      // Auto-cleanup: remove old demo tracks from user's database if they exist
      const dummyTracks = dbTracks.filter((t) => t.id.startsWith("demo-"))
      if (dummyTracks.length > 0) {
        for (const t of dummyTracks) {
          await deleteTrack(t.id)
        }
        dbTracks = await getAllTracks() // Refresh list after deletion
      }

      if (dbTracks.length === 0) {
        // No initial demo tracks anymore
      }
      setTracks(dbTracks)

      const dbPlaylists = await getAllPlaylists()
      setPlaylists(dbPlaylists)

      // Restore last played session track
      const lastTrackId = localStorage.getItem("hv_last_track_id")
      if (lastTrackId && dbTracks.some((t) => t.id === lastTrackId)) {
        setCurrentTrackId(lastTrackId)
        // Setup initial queue
        setQueue(dbTracks.map((t) => t.id))
        
        // Restore last playback timestamp
        const lastTimestamp = localStorage.getItem("hv_last_timestamp")
        if (lastTimestamp) {
          const parsedTime = parseFloat(lastTimestamp)
          setCurrentTime(parsedTime)
          if (audioRef.current) {
            audioRef.current.currentTime = parsedTime
          }
        }
      } else if (dbTracks.length > 0) {
        setCurrentTrackId(dbTracks[0].id)
        setQueue(dbTracks.map((t) => t.id))
      }
    } catch (err) {
      console.error("Database load error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Add to recently played list
  const addToRecentlyPlayed = (trackId: string) => {
    setRecentlyPlayedIds((prev) => {
      const filtered = prev.filter((id) => id !== trackId)
      const updated = [trackId, ...filtered].slice(0, 10) // keep top 10
      localStorage.setItem("hv_recently_played", JSON.stringify(updated))
      return updated
    })
  }

  // Clear recently played
  const clearRecentlyPlayed = () => {
    setRecentlyPlayedIds([])
    localStorage.removeItem("hv_recently_played")
  }

  // Track state to update recently played
  useEffect(() => {
    if (currentTrackId) {
      addToRecentlyPlayed(currentTrackId)
    }
  }, [currentTrackId])

  // Get recently played LocalTracks
  const recentlyPlayedTracks = useMemo(() => {
    return recentlyPlayedIds
      .map((id) => tracks.find((t) => t.id === id))
      .filter((t): t is LocalTrack => !!t)
  }, [recentlyPlayedIds, tracks])

  // Get greeting based on time of day
  const getGreeting = () => {
    const hr = new Date().getHours()
    if (hr < 12) return "Good Morning"
    if (hr < 18) return "Good Afternoon"
    return "Good Evening"
  }

  // Support file drops/selects on TimeWeatherWidget
  const handleTimeWeatherUpload = (files: File[]) => {
    importFiles(files)
  }

  // Object URL generator / helper
  const getTrackUrl = (track: LocalTrack) => {
    if (track.fileBlob) {
      if (!objectUrlsRef.current[track.id]) {
        objectUrlsRef.current[track.id] = URL.createObjectURL(track.fileBlob)
      }
      return objectUrlsRef.current[track.id]
    }
    return track.streamUrl || ""
  }

  // Unified Playback Engine (HTML5 Audio)
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
    }
    const audio = audioRef.current

    // Sync volume and mute settings
    audio.volume = isMuted ? 0 : volume / 100

    // Sync Audio Source URL
    const activeTrack = tracks.find((t) => t.id === currentTrackId)
    if (activeTrack) {
      const targetUrl = getTrackUrl(activeTrack)
      if (audio.src !== targetUrl && !audio.src.endsWith(targetUrl)) {
        audio.src = targetUrl
        audio.load()
        // If we restored timestamp, seek to it on load
        const savedTimeStr = localStorage.getItem("hv_last_timestamp")
        const savedTrackId = localStorage.getItem("hv_last_track_id")
        if (savedTrackId === currentTrackId && savedTimeStr && currentTime > 0) {
          audio.currentTime = currentTime
        }
      }
    }

    // Play/Pause State Synchronizer
    if (isPlaying && activeTrack) {
      // User clicked play. If AudioContext is not initialized, let's trigger it on user action.
      setupAudioContext()
      audio.play().catch((err) => {
        console.warn("Playback blocked by browser policy:", err)
        setIsPlaying(false)
      })
    } else {
      audio.pause()
    }

    // Tracking Listeners
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      localStorage.setItem("hv_last_timestamp", audio.currentTime.toString())
    }

    const handleDurationChange = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration)
      }
    }

    const handleEnded = () => {
      if (repeatMode === "one") {
        audio.currentTime = 0
        audio.play().catch(() => {})
      } else {
        playNextTrack()
      }
    }

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("durationchange", handleDurationChange)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("durationchange", handleDurationChange)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [isPlaying, currentTrackId, tracks, volume, isMuted, repeatMode])

  // Setup Web Audio Analyser node
  const setupAudioContext = () => {
    if (!audioRef.current || audioContextRef.current) return
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioContextClass()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64 // 32 frequencies, ideal for dashboard equalizer bar styling

      const source = ctx.createMediaElementSource(audioRef.current)
      source.connect(analyser)
      analyser.connect(ctx.destination)

      audioContextRef.current = ctx
      analyserRef.current = analyser
      sourceRef.current = source
    } catch (err) {
      console.warn("AudioContext setup blocked or failed (CORS or platform limits):", err)
    }
  }

  // Canvas visualizer loop
  useEffect(() => {
    if (!visualizerOn || !canvasRef.current) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const bufferLength = analyserRef.current ? analyserRef.current.frequencyBinCount : 32
    const dataArray = new Uint8Array(bufferLength)

    const renderLoop = () => {
      animationRef.current = requestAnimationFrame(renderLoop)

      const width = canvas.width
      const height = canvas.height
      ctx.clearRect(0, 0, width, height)

      if (analyserRef.current && isPlaying) {
        analyserRef.current.getByteFrequencyData(dataArray)
      } else {
        // Simulated wave or flat bars when paused
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = isPlaying
            ? Math.sin(Date.now() * 0.008 + i) * 35 + 50
            : Math.max(3, 8 - i * 0.2) // slowly drop to zero
        }
      }

      const barWidth = (width / bufferLength) * 1.6
      let barHeight
      let x = 0

      // Premium glowing linear gradient
      const gradient = ctx.createLinearGradient(0, height, 0, 0)
      gradient.addColorStop(0, "rgba(220, 38, 38, 0.15)") // deep red glow
      gradient.addColorStop(0.4, "rgba(236, 72, 153, 0.8)") // glowing magenta
      gradient.addColorStop(1, "rgba(99, 102, 241, 1)") // neon indigo

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height * 0.85
        if (barHeight < 3) barHeight = 3

        ctx.fillStyle = gradient
        ctx.beginPath()
        // Draw bars with rounded tops
        ctx.roundRect(x, height - barHeight, barWidth - 2.5, barHeight, 2.5)
        ctx.fill()

        x += barWidth
      }
    }

    renderLoop()

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [visualizerOn, isPlaying])

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.getAttribute("contenteditable") === "true")) {
        return
      }

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault()
          setIsPlaying((prev) => !prev)
          break
        case "arrowleft":
          e.preventDefault()
          seekOffset(-5)
          break
        case "arrowright":
          e.preventDefault()
          seekOffset(5)
          break
        case "arrowup":
          e.preventDefault()
          adjustVolume(5)
          break
        case "arrowdown":
          e.preventDefault()
          adjustVolume(-5)
          break
        case "m":
          setIsMuted((prev) => !prev)
          localStorage.setItem("hv_muted", (!isMuted).toString())
          break
        case "n":
          playNextTrack()
          break
        case "p":
          playPrevTrack()
          break
        case "l":
          if (currentTrackId) toggleLikeTrack(currentTrackId)
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentTrackId, queue, isPlaying, isMuted, volume])

  const seekOffset = (seconds: number) => {
    if (audioRef.current) {
      let target = audioRef.current.currentTime + seconds
      if (target < 0) target = 0
      if (target > duration) target = duration
      audioRef.current.currentTime = target
      setCurrentTime(target)
    }
  }

  const adjustVolume = (percent: number) => {
    setVolume((prev) => {
      const target = Math.max(0, Math.min(100, prev + percent))
      localStorage.setItem("hv_volume", target.toString())
      return target
    })
    setIsMuted(false)
    localStorage.setItem("hv_muted", "false")
  }

  // Playback Navigation Helpers
  const playNextTrack = () => {
    if (queue.length === 0) return
    const currentIndex = queue.indexOf(currentTrackId || "")

    if (shuffleOn) {
      const randomIndex = Math.floor(Math.random() * queue.length)
      const targetId = queue[randomIndex]
      setCurrentTrackId(targetId)
      setIsPlaying(true)
      localStorage.setItem("hv_last_track_id", targetId)
      return
    }

    if (currentIndex !== -1 && currentIndex < queue.length - 1) {
      const targetId = queue[currentIndex + 1]
      setCurrentTrackId(targetId)
      setIsPlaying(true)
      localStorage.setItem("hv_last_track_id", targetId)
    } else if (repeatMode === "all") {
      const targetId = queue[0]
      setCurrentTrackId(targetId)
      setIsPlaying(true)
      localStorage.setItem("hv_last_track_id", targetId)
    } else {
      setIsPlaying(false)
    }
  }

  const playPrevTrack = () => {
    if (queue.length === 0) return
    const currentIndex = queue.indexOf(currentTrackId || "")

    if (currentIndex > 0) {
      const targetId = queue[currentIndex - 1]
      setCurrentTrackId(targetId)
      setIsPlaying(true)
      localStorage.setItem("hv_last_track_id", targetId)
    } else if (repeatMode === "all") {
      const targetId = queue[queue.length - 1]
      setCurrentTrackId(targetId)
      setIsPlaying(true)
      localStorage.setItem("hv_last_track_id", targetId)
    } else {
      // Replay first song from beginning
      if (audioRef.current) audioRef.current.currentTime = 0
    }
  }

  const selectAndPlayTrack = (trackId: string, trackList: string[]) => {
    setQueue(trackList)
    setCurrentTrackId(trackId)
    setIsPlaying(true)
    localStorage.setItem("hv_last_track_id", trackId)
  }

  // Search and Sort Filtered Tracks computation
  const filteredTracks = useMemo(() => {
    let result = [...tracks]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
      )
    }

    // Sorting
    if (sortBy === "name") {
      result.sort((a, b) => a.title.localeCompare(b.title))
    } else if (sortBy === "duration") {
      result.sort((a, b) => {
        const getSecs = (dur: string) => {
          const parts = dur.split(":").map(Number)
          return parts.length === 2 ? parts[0] * 60 + parts[1] : 0
        }
        return getSecs(a.duration) - getSecs(b.duration)
      })
    } else {
      result.sort((a, b) => b.addedAt - a.addedAt)
    }

    return result
  }, [tracks, searchQuery, sortBy])

  // Track actions
  const handleDeleteTrack = async (id: string) => {
    // Revoke object URL
    if (objectUrlsRef.current[id]) {
      URL.revokeObjectURL(objectUrlsRef.current[id])
      delete objectUrlsRef.current[id]
    }

    await deleteTrack(id)

    // Remove from active playlists
    const updatedPlaylists = playlists.map((p) => {
      if (p.trackIds.includes(id)) {
        const nextIds = p.trackIds.filter((tid) => tid !== id)
        const updated = { ...p, trackIds: nextIds }
        savePlaylist(updated)
        return updated
      }
      return p
    })
    setPlaylists(updatedPlaylists)

    // Reset playing state if deleted active song
    if (currentTrackId === id) {
      setIsPlaying(false)
      setCurrentTrackId(null)
      setCurrentTime(0)
    }

    // Refresh state
    setTracks((prev) => prev.filter((t) => t.id !== id))
    setQueue((prev) => prev.filter((qid) => qid !== id))
  }

  const startRenameTrack = (track: LocalTrack) => {
    setEditingTrackId(track.id)
    setEditTitle(track.title)
    setEditArtist(track.artist)
  }

  const saveRenameTrack = async (id: string) => {
    const updated = tracks.map((t) => {
      if (t.id === id) {
        const next = { ...t, title: editTitle || t.title, artist: editArtist || t.artist }
        saveTrack(next)
        return next
      }
      return t
    })
    setTracks(updated)
    setEditingTrackId(null)
  }

  // Like track
  const toggleLikeTrack = (id: string) => {
    setLikedTrackIds((prev) => {
      const next = prev.includes(id) ? prev.filter((tid) => tid !== id) : [...prev, id]
      localStorage.setItem("hv_liked_tracks", JSON.stringify(next))
      return next
    })
  }

  // File Upload Dialog / Drag-Drop handlers
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      importFiles(e.dataTransfer.files)
    }
  }

  const handleSelectFiles = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "audio/*"
    input.multiple = true
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      if (target.files && target.files.length > 0) {
        importFiles(target.files)
      }
    }
    input.click()
  }

  const importFiles = async (files: FileList | File[]) => {
    setUploadStatus("Processing files...")
    let successCount = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith("audio/")) continue

      try {
        // Read file duration asynchronously
        const durationStr = await new Promise<string>((resolve) => {
          const audio = new Audio()
          audio.src = URL.createObjectURL(file)
          audio.addEventListener("loadedmetadata", () => {
            const minutes = Math.floor(audio.duration / 60)
            const seconds = Math.floor(audio.duration % 60)
            resolve(`${minutes}:${seconds.toString().padStart(2, "0")}`)
            URL.revokeObjectURL(audio.src)
          })
          audio.addEventListener("error", () => {
            resolve("3:15")
          })
        })

        // Format clean metadata
        const baseName = file.name.replace(/\.[^/.]+$/, "") // strip extension
        let title = baseName
        let artist = "Local Artist"

        if (baseName.includes("-")) {
          const parts = baseName.split("-")
          artist = parts[0].trim()
          title = parts.slice(1).join("-").trim()
        }

        const newId = `track-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        const gradientIndex = Math.floor(Math.random() * 5) + 1

        const localTrack: LocalTrack = {
          id: newId,
          title,
          artist,
          album: "Local Upload",
          duration: durationStr,
          type: "uploaded",
          fileBlob: file,
          coverArt: `gradient-${gradientIndex}`,
          addedAt: Date.now()
        }

        await saveTrack(localTrack)
        setTracks((prev) => [localTrack, ...prev])
        successCount++
      } catch (err) {
        console.error("Failed to parse file:", file.name, err)
      }
    }

    setUploadStatus(successCount > 0 ? `Successfully imported ${successCount} tracks!` : "Failed to import tracks.")
    setTimeout(() => setUploadStatus(null), 3500)
  }

  // YouTube downloader success integration
  const handleAddConvertedSong = async (newSong: any, streamUrl?: string) => {
    let fileBlob: Blob | undefined
    if (streamUrl) {
      try {
        const response = await fetch(streamUrl)
        if (response.ok) {
          fileBlob = await response.blob()
        }
      } catch (err) {
        console.warn("Could not download audio blob for offline storage, using streamUrl fallback:", err)
      }
    }

    const newId = `yt-${Date.now()}`
    const gradientIndex = Math.floor(Math.random() * 5) + 1

    const localTrack: LocalTrack = {
      id: newId,
      title: newSong.title,
      artist: newSong.artist || "YouTube Artist",
      album: "YouTube Download",
      duration: newSong.duration,
      type: "downloaded",
      fileBlob,
      streamUrl,
      coverArt: newSong.coverArt || `gradient-${gradientIndex}`,
      addedAt: Date.now()
    }

    await saveTrack(localTrack)
    setTracks((prev) => [localTrack, ...prev])
    setQueue((prev) => [newId, ...prev])
    setCurrentTrackId(newId)
    setIsPlaying(true)
  }

  // Playlists CRUD
  const handleCreatePlaylist = async () => {
    const name = prompt("Enter playlist name:")
    if (!name || !name.trim()) return

    const newPlaylist: LocalPlaylist = {
      id: `playlist-${Date.now()}`,
      name: name.trim(),
      trackIds: [],
      createdAt: Date.now()
    }

    await savePlaylist(newPlaylist)
    setPlaylists((prev) => [...prev, newPlaylist])
  }

  const handleDeletePlaylist = async (id: string) => {
    if (!confirm("Are you sure you want to delete this playlist?")) return
    await deletePlaylist(id)
    setPlaylists((prev) => prev.filter((p) => p.id !== id))
    if (selectedPlaylistId === id) setSelectedPlaylistId(null)
  }

  const addTrackToPlaylist = async (trackId: string, playlistId: string) => {
    const playlist = playlists.find((p) => p.id === playlistId)
    if (!playlist) return

    if (playlist.trackIds.includes(trackId)) {
      alert("Track is already in this playlist")
      return
    }

    const updated = {
      ...playlist,
      trackIds: [...playlist.trackIds, trackId]
    }

    await savePlaylist(updated)
    setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? updated : p)))
    setActiveMenuTrackId(null)
  }

  const removeTrackFromPlaylist = async (trackId: string, playlistId: string) => {
    const playlist = playlists.find((p) => p.id === playlistId)
    if (!playlist) return

    const updated = {
      ...playlist,
      trackIds: playlist.trackIds.filter((id) => id !== trackId)
    }

    await savePlaylist(updated)
    setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? updated : p)))
  }

  const movePlaylistTrack = async (playlistId: string, index: number, direction: "up" | "down") => {
    const playlist = playlists.find((p) => p.id === playlistId)
    if (!playlist) return

    const nextIds = [...playlist.trackIds]
    const targetIndex = direction === "up" ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= nextIds.length) return

    // swap
    const temp = nextIds[index]
    nextIds[index] = nextIds[targetIndex]
    nextIds[targetIndex] = temp

    const updated = {
      ...playlist,
      trackIds: nextIds
    }

    await savePlaylist(updated)
    setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? updated : p)))
  }

  // Clear data
  const handleWipeDatabase = async () => {
    if (!confirm("CAUTION: This will permanently delete all uploaded songs and custom playlists from your browser. Are you sure?")) {
      return
    }

    // Stop playback
    setIsPlaying(false)
    setCurrentTrackId(null)
    setQueue([])
    setCurrentTime(0)

    // Clear Audio references
    if (audioRef.current) {
      audioRef.current.src = ""
    }

    // Clear Object URLs
    Object.values(objectUrlsRef.current).forEach((url) => {
      URL.revokeObjectURL(url)
    })
    objectUrlsRef.current = {}

    await clearAllData()
    setTracks([])
    setPlaylists([])
    setSelectedPlaylistId(null)
    alert("Database successfully reset!")
  }

  // Helper formatting durations
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Render cover gradient colors
  const getCoverGradient = (coverKey?: string) => {
    switch (coverKey) {
      case "gradient-1":
        return "from-[#dc2626] to-[#ec4899]" // red to pink
      case "gradient-2":
        return "from-[#818cf8] to-[#6366f1]" // indigo
      case "gradient-3":
        return "from-[#fbbf24] to-[#f59e0b]" // amber
      case "gradient-4":
        return "from-[#34d399] to-[#059669]" // emerald
      case "gradient-5":
        return "from-[#a855f7] to-[#7c3aed]" // purple
      default:
        return "from-[#1e293b] to-[#0f172a]" // slate
    }
  }

  const isUrl = (path?: string) => {
    if (!path) return false
    return path.startsWith("http://") || path.startsWith("https://") || path.startsWith("//") || path.startsWith("data:") || path.startsWith("/")
  }

  // Computed fields
  const currentTrack = useMemo(() => {
    return tracks.find((t) => t.id === currentTrackId)
  }, [currentTrackId, tracks])

  const activePlaylist = useMemo(() => {
    return playlists.find((p) => p.id === selectedPlaylistId)
  }, [selectedPlaylistId, playlists])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen max-h-screen bg-slate-950 bg-gradient-to-br from-[#0e1622] via-[#081f2f] to-[#070b12] bg-cover bg-center bg-no-repeat flex flex-col relative text-white select-none overflow-hidden font-sans"
      style={{
        backgroundImage: "url('/images/bgg1.jpg')"
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/25 dark:bg-black/65 backdrop-blur-[2px] pointer-events-none transition-all duration-500" />

      {/* Main Content Area */}
      <div className="z-10 flex-1 flex overflow-hidden">
        
        {/* Left Navigation Sidebar */}
        <aside className="w-16 lg:w-60 bg-black/25 backdrop-blur-3xl border-r border-white/10 flex flex-col justify-between py-6">
          <div className="flex flex-col gap-8">
            
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 lg:px-6">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center p-1.5 shadow-md shrink-0">
                <Image
                  src="/images/hv-logo.png"
                  alt="HV Logo"
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.2em] hidden lg:block text-white/90">
                Verse 2 Player
              </span>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex flex-col gap-1.5 px-2 lg:px-3">
              {[
                { id: "home", label: "Home", icon: <Home className="w-4 h-4" /> },
                { id: "library", label: "Library", icon: <Music className="w-4 h-4" /> },
                { id: "playlists", label: "Playlists", icon: <ListMusic className="w-4 h-4" /> },
                { id: "converter", label: "Converter", icon: <Youtube className="w-4 h-4" /> },
                { id: "settings", label: "Settings", icon: <SettingsIcon className="w-4 h-4" /> },
                { id: "about", label: "About", icon: <Info className="w-4 h-4" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any)
                    setSelectedPlaylistId(null)
                  }}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold tracking-wider capitalize transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-white/10 text-white shadow-sm border-l-2 border-red-500 rounded-l-none"
                      : "text-white/45 hover:text-white/85 hover:bg-white/5"
                  }`}
                >
                  {tab.icon}
                  <span className="hidden lg:block">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Quick Exit/Landing Link */}
          <div className="px-3">
            <Link
              href="/"
              className="flex items-center justify-center lg:justify-start gap-3.5 px-4 py-3 rounded-xl text-xs font-semibold text-white/35 hover:text-white/70 hover:bg-white/5 transition-all"
            >
              <Sliders className="w-4 h-4" />
              <span className="hidden lg:block">Exit Player</span>
            </Link>
          </div>
        </aside>

        {/* Center Panel (Subviews) */}
        <main className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-6 lg:p-8">
          
          {/* Subview Loader */}
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-white/40" />
              <span className="text-xs text-white/45 font-medium">Reading device sandbox...</span>
            </div>
          ) : (
            <>
              {/* Home Tab */}
              {activeTab === "home" && (
                <div className="flex flex-col gap-6 animate-fade-in">
                  <div className="flex flex-col xl:flex-row gap-6 items-start">
                    
                    {/* Left Column: Greeting, Recently Played & Quick Stats */}
                    <div className="flex-1 flex flex-col gap-6 w-full">
                      
                      {/* Greeting Header */}
                      <div className="bg-white/10 dark:bg-[#0e1622]/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl rounded-3xl p-6 flex flex-col justify-center">
                        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-wide text-white">
                          {getGreeting()}, Listener!
                        </h1>
                        <p className="text-white/50 text-xs mt-1.5 leading-relaxed">
                          Welcome back to HeavenVerse. Stream your downloaded music offline, organize your playlists, and enjoy private listening.
                        </p>
                      </div>

                      {/* Recently Played Songs Section */}
                      <div className="bg-white/10 dark:bg-[#0e1622]/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl rounded-3xl p-6 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                          <h2 className="text-sm font-bold uppercase tracking-wider text-white/70">Recently Played</h2>
                          {recentlyPlayedTracks.length > 0 && (
                            <button
                              onClick={clearRecentlyPlayed}
                              className="text-[10px] text-white/40 hover:text-white transition-colors font-bold uppercase tracking-wide cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        {recentlyPlayedTracks.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {recentlyPlayedTracks.map((track) => (
                              <div
                                key={track.id}
                                onClick={() => selectAndPlayTrack(track.id, tracks.map((t) => t.id))}
                                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 border border-transparent hover:border-white/10 cursor-pointer bg-white/5 transition-all group"
                              >
                                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/5 flex items-center justify-center bg-slate-900 relative">
                                  {isUrl(track.coverArt) ? (
                                    <img
                                      src={track.coverArt}
                                      alt="Cover"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(track.coverArt)} flex items-center justify-center`}>
                                      <Music className="w-4.5 h-4.5 text-white/80" />
                                    </div>
                                  )}
                                  {isPlaying && currentTrackId === track.id && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                      <span className="flex gap-0.5 items-end justify-center w-4 h-4">
                                        <span className="w-0.5 bg-white animate-bounce" style={{ animationDelay: "0.1s", height: "60%" }} />
                                        <span className="w-0.5 bg-white animate-bounce" style={{ animationDelay: "0.3s", height: "90%" }} />
                                        <span className="w-0.5 bg-white animate-bounce" style={{ animationDelay: "0.2s", height: "40%" }} />
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-bold text-white truncate group-hover:text-red-400 transition-colors">
                                    {track.title}
                                  </span>
                                  <span className="text-[10px] text-white/40 truncate mt-0.5">{track.artist}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-8 text-center border border-dashed border-white/10 rounded-2xl">
                            <span className="text-xs text-white/30 italic">No recently played tracks. Start playing from your library!</span>
                          </div>
                        )}
                      </div>

                      {/* Local Storage Widget */}
                      <div className="bg-white/10 dark:bg-[#0e1622]/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl rounded-3xl p-6 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                          <h2 className="text-sm font-bold uppercase tracking-wider text-white/70">Local Storage</h2>
                          <button
                            onClick={updateStorageEstimate}
                            className="text-[10px] text-white/40 hover:text-white transition-colors font-bold uppercase tracking-wide cursor-pointer flex items-center gap-1"
                          >
                            Refresh
                          </button>
                        </div>
                        {storageInfo ? (
                          <div className="flex flex-col gap-2 mt-1">
                            <div className="flex justify-between text-[11px] text-white/60 font-semibold mb-1">
                              <span>{(storageInfo.usage / (1024 * 1024)).toFixed(2)} MB Used</span>
                              <span>{(storageInfo.quota / (1024 * 1024 * 1024)).toFixed(2)} GB Total</span>
                            </div>
                            <div className="h-2 w-full bg-black/20 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
                              <div
                                className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${Math.min((storageInfo.usage / storageInfo.quota) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-[9px] text-white/30 text-right mt-0.5 font-medium tracking-wide">
                              {((storageInfo.usage / storageInfo.quota) * 100).toFixed(1)}% Sandbox Usage
                            </span>
                          </div>
                        ) : (
                          <div className="py-6 text-center border border-dashed border-white/10 rounded-2xl">
                            <span className="text-xs text-white/30 italic">Calculating storage usage...</span>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Right Column: Time & Weather Dashboard Widget */}
                    <div className="w-full xl:w-auto shrink-0 flex justify-center">
                      <TimeWeatherWidget onAddFiles={handleTimeWeatherUpload} />
                    </div>

                  </div>
                </div>
              )}

              {/* Library Tab */}
              {activeTab === "library" && (
                <div className="flex flex-col gap-6 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <div>
                      <h1 className="text-xl lg:text-2xl font-bold tracking-wide">Your Library</h1>
                      <p className="text-white/40 text-[11px] mt-0.5">Manage local tracks stored inside your browser sandbox.</p>
                    </div>
                    <button
                      onClick={handleSelectFiles}
                      className="bg-white/10 hover:bg-white/15 border border-white/10 text-white text-[11px] font-semibold px-4 py-2 rounded-xl transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <FolderUp className="w-3.5 h-3.5" />
                      Import Audio
                    </button>
                  </div>

                  {/* Drag-drop sandbox */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleSelectFiles}
                    className={`border border-dashed rounded-2xl p-6 lg:p-10 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all duration-300 ${
                      isDragging
                        ? "border-white/50 bg-white/10 scale-[1.01]"
                        : "border-white/10 bg-white/0 hover:bg-white/5 hover:border-white/15"
                    }`}
                  >
                    <FolderUp className="w-8 h-8 text-white/35" />
                    <div className="text-center">
                      <span className="text-xs font-bold text-white/70 block">
                        {uploadStatus ? uploadStatus : "Drag and drop music files here"}
                      </span>
                      <span className="text-[10px] text-white/35 block mt-0.5">
                        Supports MP3, WAV, FLAC, M4A (Processed entirely offline)
                      </span>
                    </div>
                  </div>

                  {/* Search and Sort controls */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#0e1622]/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl">
                    <div className="w-full sm:max-w-xs relative">
                      <Search className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-white/30" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search songs or artists..."
                        className="w-full bg-black/20 border border-white/5 rounded-xl pl-9.5 pr-4 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-white/15 transition-all"
                      />
                    </div>

                    <div className="flex gap-2 self-end sm:self-center">
                      {(["recent", "name", "duration"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setSortBy(opt)}
                          className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                            sortBy === opt
                              ? "bg-white/10 text-white shadow-sm border border-white/10"
                              : "text-white/40 hover:text-white/80"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tracks List */}
                  <div className="space-y-1.5">
                    {filteredTracks.map((track) => (
                      <div
                        key={track.id}
                        onClick={() => selectAndPlayTrack(track.id, filteredTracks.map((t) => t.id))}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                          currentTrackId === track.id
                            ? "bg-white/10 border border-white/10 shadow-md"
                            : "hover:bg-white/5 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          
                          {/* Artwork / Icon */}
                          <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 shadow-sm border border-white/5 flex items-center justify-center bg-slate-900">
                            {isUrl(track.coverArt) ? (
                              <img
                                src={track.coverArt}
                                alt="Cover Art"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(track.coverArt)} flex items-center justify-center`}>
                                {isPlaying && currentTrackId === track.id ? (
                                  <span className="flex gap-0.5 items-end justify-center w-4 h-4">
                                    <span className="w-0.5 bg-white animate-bounce" style={{ animationDelay: "0.1s", height: "60%" }} />
                                    <span className="w-0.5 bg-white animate-bounce" style={{ animationDelay: "0.3s", height: "90%" }} />
                                    <span className="w-0.5 bg-white animate-bounce" style={{ animationDelay: "0.2s", height: "40%" }} />
                                  </span>
                                ) : (
                                  <Music className="w-4 h-4 text-white/80" />
                                )}
                              </div>
                            )}
                          </div>

                          {/* Metadata / Inline edit form */}
                          {editingTrackId === track.id ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex gap-2 min-w-0 flex-1"
                            >
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded px-2.5 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/20 min-w-0 flex-1 font-semibold"
                                placeholder="Track Title"
                              />
                              <input
                                type="text"
                                value={editArtist}
                                onChange={(e) => setEditArtist(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded px-2.5 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/20 min-w-0 flex-1"
                                placeholder="Artist"
                              />
                              <button
                                onClick={() => saveRenameTrack(track.id)}
                                className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col min-w-0">
                              <span className={`text-xs font-bold truncate ${currentTrackId === track.id ? "text-white" : "text-white/90"}`}>
                                {track.title}
                              </span>
                              <span className="text-[10px] text-white/40 truncate mt-0.5">
                                {track.artist} • {track.album}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions / Options */}
                        <div
                          className="flex items-center gap-3.5 shrink-0 ml-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[10.5px] text-white/35 font-mono tracking-tight tabular-nums">
                            {track.duration}
                          </span>
                          
                          <button
                            onClick={() => toggleLikeTrack(track.id)}
                            className={`p-1.5 rounded-full hover:bg-white/5 transition-all ${
                              likedTrackIds.includes(track.id) ? "text-red-400" : "text-white/35 hover:text-white"
                            }`}
                          >
                            <Heart className="w-3.5 h-3.5" fill={likedTrackIds.includes(track.id) ? "currentColor" : "none"} />
                          </button>

                          {/* Playlist add trigger */}
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenuTrackId(activeMenuTrackId === track.id ? null : track.id)}
                              className="p-1.5 rounded-full text-white/35 hover:text-white hover:bg-white/5 transition-colors"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {/* Dropdown Menu */}
                            {activeMenuTrackId === track.id && (
                              <div className="absolute right-0 mt-1.5 w-44 bg-[#0e1622] border border-white/10 rounded-xl shadow-2xl z-20 py-1.5 animate-fade-in">
                                <button
                                  onClick={() => startRenameTrack(track)}
                                  className="w-full text-left px-3.5 py-2 text-[10.5px] font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                                >
                                  <Edit2 className="w-3.5 h-3.5" /> Rename Track
                                </button>
                                <button
                                  onClick={() => handleDeleteTrack(track.id)}
                                  className="w-full text-left px-3.5 py-2 text-[10.5px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete Track
                                </button>
                                
                                {playlists.length > 0 && (
                                  <>
                                    <div className="border-t border-white/5 my-1.5" />
                                    <div className="px-3.5 py-1 text-[8.5px] uppercase font-bold text-white/30 tracking-widest">
                                      Add to Playlist:
                                    </div>
                                    {playlists.map((pl) => (
                                      <button
                                        key={pl.id}
                                        onClick={() => addTrackToPlaylist(track.id, pl.id)}
                                        className="w-full text-left px-3.5 py-1.5 text-[10px] font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors truncate"
                                      >
                                        + {pl.name}
                                      </button>
                                    ))}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {filteredTracks.length === 0 && (
                      <div className="py-16 text-center border border-dashed border-white/5 rounded-2xl">
                        <span className="text-xs text-white/35 italic block">No tracks matched your query.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Playlists Tab */}
              {activeTab === "playlists" && (
                <div className="flex flex-col gap-6 animate-fade-in">
                  
                  {!selectedPlaylistId ? (
                    // Default Playlists Grid list
                    <>
                      <div className="flex justify-between items-center">
                        <div>
                          <h1 className="text-xl lg:text-2xl font-bold tracking-wide">Playlists</h1>
                          <p className="text-white/40 text-[11px] mt-0.5">Organize and group songs in local custom mix sheets.</p>
                        </div>
                        <button
                          onClick={handleCreatePlaylist}
                          className="bg-white/10 hover:bg-white/15 border border-white/10 text-white text-[11px] font-semibold px-4 py-2 rounded-xl transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          New Playlist
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                        {playlists.map((pl) => (
                          <div
                            key={pl.id}
                            onClick={() => setSelectedPlaylistId(pl.id)}
                            className="bg-white/5 dark:bg-[#0e1622]/30 backdrop-blur-2xl border border-white/10 dark:border-white/5 shadow-xl rounded-2xl p-5 hover:bg-white/10 dark:hover:bg-[#0e1622]/40 transition-all duration-300 hover:scale-[1.01] cursor-pointer flex flex-col justify-between h-40 group"
                          >
                            <div className="flex justify-between items-start">
                              <div className="p-3 bg-white/5 rounded-xl">
                                <ListMusic className="w-5 h-5 text-indigo-400 group-hover:scale-105 transition-transform" />
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeletePlaylist(pl.id)
                                }}
                                className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div>
                              <h3 className="text-white font-bold text-sm truncate tracking-wide">{pl.name}</h3>
                              <span className="text-[10px] text-white/40 mt-1 block">
                                {pl.trackIds.length} {pl.trackIds.length === 1 ? "track" : "tracks"} • Stored Locally
                              </span>
                            </div>
                          </div>
                        ))}

                        {playlists.length === 0 && (
                          <div
                            onClick={handleCreatePlaylist}
                            className="border border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition-all text-center h-40"
                          >
                            <Plus className="w-7 h-7 text-white/30" />
                            <span className="text-xs font-bold text-white/60">Create your first playlist</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    // Single Playlist Detail View
                    <div className="flex flex-col gap-6">
                      
                      {/* Back button */}
                      <button
                        onClick={() => setSelectedPlaylistId(null)}
                        className="text-[11px] font-bold text-white/55 hover:text-white flex items-center gap-1.5 w-fit"
                      >
                        ← Back to Playlists
                      </button>

                      {/* Header details */}
                      {activePlaylist && (
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/15 pb-6">
                          <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                              <ListMusic className="w-8 h-8" />
                            </div>
                            <div>
                              <h1 className="text-2xl font-black tracking-wide">{activePlaylist.name}</h1>
                              <p className="text-white/40 text-xs mt-1">
                                Created on {new Date(activePlaylist.createdAt).toLocaleDateString()} • {activePlaylist.trackIds.length} tracks
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {activePlaylist.trackIds.length > 0 && (
                              <button
                                onClick={() => selectAndPlayTrack(activePlaylist.trackIds[0], activePlaylist.trackIds)}
                                className="bg-white hover:bg-white/90 text-black text-[11px] font-bold px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" /> Play Mix
                              </button>
                            )}
                            <button
                              onClick={() => handleDeletePlaylist(activePlaylist.id)}
                              className="bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-[11px] font-semibold px-4 py-2 rounded-xl transition-all active:scale-[0.98] cursor-pointer"
                            >
                              Delete Playlist
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Tracks in active playlist */}
                      {activePlaylist && (
                        <div className="space-y-1.5">
                          {activePlaylist.trackIds.map((tid, idx) => {
                            const track = tracks.find((t) => t.id === tid)
                            if (!track) return null
                            return (
                              <div
                                key={track.id}
                                onClick={() => selectAndPlayTrack(track.id, activePlaylist.trackIds)}
                                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                                  currentTrackId === track.id
                                    ? "bg-white/10 border border-white/10 shadow-md"
                                    : "hover:bg-white/5 border border-transparent"
                                }`}
                              >
                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                  <div className="text-[10px] text-white/30 w-5 text-center font-mono">
                                    {idx + 1}
                                  </div>
                                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/5 flex items-center justify-center bg-slate-900">
                                    {isUrl(track.coverArt) ? (
                                      <img
                                        src={track.coverArt}
                                        alt="Cover"
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(track.coverArt)} flex items-center justify-center`}>
                                        {isPlaying && currentTrackId === track.id ? (
                                          <span className="flex gap-0.5 items-end justify-center w-3.5 h-3.5">
                                            <span className="w-0.5 bg-white animate-bounce" style={{ animationDelay: "0.1s", height: "60%" }} />
                                            <span className="w-0.5 bg-white animate-bounce" style={{ animationDelay: "0.3s", height: "90%" }} />
                                            <span className="w-0.5 bg-white animate-bounce" style={{ animationDelay: "0.2s", height: "40%" }} />
                                          </span>
                                        ) : (
                                          <Music className="w-3.5 h-3.5 text-white/80" />
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-white truncate">{track.title}</span>
                                    <span className="text-[10px] text-white/40 truncate mt-0.5">{track.artist}</span>
                                  </div>
                                </div>

                                <div
                                  className="flex items-center gap-3.5 shrink-0 ml-4"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="text-[10.5px] text-white/35 font-mono">{track.duration}</span>
                                  
                                  {/* Reorder actions */}
                                  <div className="flex flex-col gap-0.5">
                                    <button
                                      disabled={idx === 0}
                                      onClick={() => movePlaylistTrack(activePlaylist.id, idx, "up")}
                                      className="p-0.5 text-white/20 hover:text-white disabled:opacity-20 transition-colors"
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      disabled={idx === activePlaylist.trackIds.length - 1}
                                      onClick={() => movePlaylistTrack(activePlaylist.id, idx, "down")}
                                      className="p-0.5 text-white/20 hover:text-white disabled:opacity-20 transition-colors"
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => removeTrackFromPlaylist(track.id, activePlaylist.id)}
                                    className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    title="Remove from playlist"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}

                          {activePlaylist.trackIds.length === 0 && (
                            <div className="py-16 text-center border border-dashed border-white/5 rounded-2xl">
                              <span className="text-xs text-white/35 italic block mb-3">This playlist is empty.</span>
                              <button
                                onClick={() => setActiveTab("library")}
                                className="bg-white/10 text-white text-[10.5px] font-bold px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/15"
                              >
                                Browse Library to Add Songs
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Converter Tab */}
              {activeTab === "converter" && (
                <div className="flex flex-col gap-6 animate-fade-in h-full">
                  <ConverterDownloader onAddSong={handleAddConvertedSong} />
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === "settings" && (
                <div className="flex flex-col gap-6 animate-fade-in max-w-2xl">
                  <div>
                    <h1 className="text-xl lg:text-2xl font-bold tracking-wide">Settings</h1>
                    <p className="text-white/40 text-[11px] mt-0.5">Customize your local listening preferences.</p>
                  </div>

                  <div className="bg-[#0e1622]/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 shadow-2xl space-y-6">
                    {/* Appearance */}
                    <div className="flex justify-between items-center pb-4 border-b border-white/5">
                      <div>
                        <h3 className="text-xs font-bold text-white tracking-wide">Dark Mode</h3>
                        <p className="text-[10px] text-white/45 mt-0.5">Toggle interface design skin colors.</p>
                      </div>
                      <button
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                      >
                        {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                      </button>
                    </div>

                    {/* Autoplay toggle */}
                    <div className="flex justify-between items-center pb-4 border-b border-white/5">
                      <div>
                        <h3 className="text-xs font-bold text-white tracking-wide">Autoplay Next</h3>
                        <p className="text-[10px] text-white/45 mt-0.5">Automatically stream upcoming song list on track completion.</p>
                      </div>
                      <button
                        onClick={() => {
                          const nextVal = !autoplay
                          setAutoplay(nextVal)
                          localStorage.setItem("hv_autoplay", nextVal.toString())
                        }}
                        className={`w-12 h-6 rounded-full p-1 transition-all cursor-pointer ${
                          autoplay ? "bg-red-600" : "bg-white/10"
                        }`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          autoplay ? "translate-x-6" : "translate-x-0"
                        }`} />
                      </button>
                    </div>

                    {/* Equalizer toggle */}
                    <div className="flex justify-between items-center pb-4 border-b border-white/5">
                      <div>
                        <h3 className="text-xs font-bold text-white tracking-wide">Equalizer Visualizer</h3>
                        <p className="text-[10px] text-white/45 mt-0.5">Render dancing canvas frequency bars in the Right Panel.</p>
                      </div>
                      <button
                        onClick={() => {
                          const nextVal = !visualizerOn
                          setVisualizerOn(nextVal)
                          localStorage.setItem("hv_visualizer", nextVal.toString())
                        }}
                        className={`w-12 h-6 rounded-full p-1 transition-all cursor-pointer ${
                          visualizerOn ? "bg-red-600" : "bg-white/10"
                        }`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          visualizerOn ? "translate-x-6" : "translate-x-0"
                        }`} />
                      </button>
                    </div>

                    {/* Shortcuts Reference */}
                    <div>
                      <h3 className="text-xs font-bold text-white tracking-wide mb-3">Global Keyboard Shortcuts</h3>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-white/60 font-medium font-mono">
                        <div className="flex justify-between border-b border-white/5 py-1.5 pr-4">
                          <span>[Space]</span>
                          <span className="text-white/80">Play / Pause</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 py-1.5 pl-4">
                          <span>[ArrowUp/Down]</span>
                          <span className="text-white/80">Volume +/-</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 py-1.5 pr-4">
                          <span>[ArrowLeft/Right]</span>
                          <span className="text-white/80">Seek +/- 5s</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 py-1.5 pl-4">
                          <span>[M]</span>
                          <span className="text-white/80">Mute / Unmute</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 py-1.5 pr-4">
                          <span>[N]</span>
                          <span className="text-white/80">Next Track</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 py-1.5 pl-4">
                          <span>[P]</span>
                          <span className="text-white/80">Previous Track</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 py-1.5 pr-4">
                          <span>[L]</span>
                          <span className="text-white/80">Like/Favorite</span>
                        </div>
                      </div>
                    </div>

                    {/* Wipe storage */}
                    <div className="border-t border-white/10 pt-5 flex justify-between items-center">
                      <div>
                        <h3 className="text-xs font-bold text-red-400 tracking-wide">Wipe Sandbox Data</h3>
                        <p className="text-[10px] text-white/35 mt-0.5">Delete all local uploaded songs and playlists permanently from the browser.</p>
                      </div>
                      <button
                        onClick={handleWipeDatabase}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 border border-red-500/20 text-white text-[10.5px] font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-red-600/10 active:scale-95"
                      >
                        Reset Storage
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* About Tab */}
              {activeTab === "about" && (
                <div className="flex flex-col gap-6 animate-fade-in max-w-2xl">
                  <div>
                    <h1 className="text-xl lg:text-2xl font-bold tracking-wide">About HeavenVerse</h1>
                    <p className="text-white/40 text-[11px] mt-0.5">Your private, offline-first personal music space.</p>
                  </div>

                  <div className="bg-[#0e1622]/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5 text-xs leading-relaxed text-white/70 font-medium">
                    <p>
                      HeavenVerse V2 is built around a simple idea: your music should belong to you. Unlike typical streaming platforms that require accounts, log your activity, and track what you listen to, HeavenVerse keeps everything completely local and private.
                    </p>
                    
                    <div className="space-y-4 mt-2">
                      <div className="flex gap-3">
                        <div className="p-1.5 bg-white/5 rounded-lg h-fit text-red-400 shrink-0">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="text-white block text-[11.5px] font-bold">100% Private & Local</strong>
                          <span className="text-white/55 text-[10.5px]">Your files never leave your device. They are kept securely inside your browser's private sandbox, ensuring nobody else can ever track or access them.</span>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="p-1.5 bg-white/5 rounded-lg h-fit text-indigo-400 shrink-0">
                          <Sliders className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="text-white block text-[11.5px] font-bold">Offline Freedom</strong>
                          <span className="text-white/55 text-[10.5px]">Your songs and playlists are saved directly to your browser memory. Once imported, you can disconnect from the internet and listen to your music anywhere.</span>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="p-1.5 bg-white/5 rounded-lg h-fit text-amber-400 shrink-0">
                          <Music className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="text-white block text-[11.5px] font-bold">No Accounts, No Tracking</strong>
                          <span className="text-white/55 text-[10.5px]">No logins, no passwords, and no trackers. You open the page, drop your music, and start listening instantly. Simple as that.</span>
                        </div>
                      </div>
                    </div>

                    <p className="pt-4 border-t border-white/5 text-[10px] text-white/35">
                      Designed and developed by Vansh. Built for private, clean, and fast local audio listening.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* Right Panel (Now Playing, Visualizer & Queue) */}
        <section className="hidden xl:flex w-80 bg-black/15 backdrop-blur-3xl border-l border-white/10 flex-col p-6 overflow-y-auto custom-scrollbar gap-6">
          
          {/* Now Playing Widget */}
          <div className="bg-[#0e1622]/45 backdrop-blur-3xl border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
            <h3 className="text-[10px] font-bold text-white/35 uppercase tracking-widest px-0.5">Now Playing</h3>
            
            {/* Album Art Cover / Gradient */}
            <div className="relative aspect-square w-full rounded-xl shadow-md overflow-hidden border border-white/5 group flex items-center justify-center bg-slate-900">
              {isUrl(currentTrack?.coverArt) ? (
                <img
                  src={currentTrack?.coverArt}
                  alt="Cover Art"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${currentTrack ? getCoverGradient(currentTrack.coverArt) : "from-[#0f172a] to-[#1e293b]"} flex items-center justify-center`}>
                  <Music className={`w-14 h-14 text-white/35 group-hover:scale-105 transition-transform duration-500 ${isPlaying ? "animate-pulse" : ""}`} />
                </div>
              )}
              
              {/* Overlay title */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 flex flex-col pt-12">
                <span className="text-white font-extrabold text-sm truncate tracking-wide">
                  {currentTrack?.title || "No Track Selected"}
                </span>
                <span className="text-white/50 text-[10.5px] truncate mt-0.5 font-semibold">
                  {currentTrack?.artist || "Upload music to start playing"}
                </span>
              </div>
            </div>

            {/* Canvas Frequency Visualizer */}
            {visualizerOn && (
              <div className="h-20 bg-black/35 rounded-xl border border-white/5 p-2 flex items-center justify-center overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={260}
                  height={68}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>

          {/* Queue List Widget */}
          <div className="flex-1 flex flex-col gap-3 min-h-[220px]">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-bold text-white/35 uppercase tracking-widest">Next Up (Queue)</span>
              {queue.length > 0 && (
                <button
                  onClick={() => setQueue([currentTrackId || ""])}
                  className="text-[9.5px] font-bold text-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  Clear Queue
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-0.5 space-y-1.5 custom-scrollbar max-h-[300px]">
              {queue.map((qid, idx) => {
                const track = tracks.find((t) => t.id === qid)
                if (!track) return null
                const isCurrent = currentTrackId === qid

                return (
                  <div
                    key={`${qid}-${idx}`}
                    onClick={() => selectAndPlayTrack(track.id, queue)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                      isCurrent
                        ? "bg-white/10 border border-white/5"
                        : "hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/5 flex items-center justify-center bg-slate-900">
                        {isUrl(track.coverArt) ? (
                          <img
                            src={track.coverArt}
                            alt="Cover"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(track.coverArt)} flex items-center justify-center`}>
                            <Music className="w-3.5 h-3.5 text-white/70" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-[11.5px] font-bold truncate ${isCurrent ? "text-white" : "text-white/80"}`}>
                          {track.title}
                        </span>
                        <span className="text-[9.5px] text-white/40 truncate mt-0.5">{track.artist}</span>
                      </div>
                    </div>

                    <span className="text-[9.5px] text-white/35 font-mono">{track.duration}</span>
                  </div>
                )
              })}

              {queue.length === 0 && (
                <div className="h-full flex items-center justify-center py-12 border border-dashed border-white/5 rounded-xl">
                  <span className="text-[10px] text-white/30 italic">Playback queue is empty</span>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Persistent Audio Control Bar */}
      <footer className="z-20 bg-[#0e1622]/40 dark:bg-black/35 backdrop-blur-3xl border-t border-white/10 py-4 px-6 flex items-center justify-between shadow-2xl relative">
        
        {/* Left Side: Brief track info */}
        <div className="flex items-center gap-3.5 w-1/4 min-w-0">
          {currentTrack && (
            <>
              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow-inner border border-white/5 flex items-center justify-center bg-slate-900">
                {isUrl(currentTrack.coverArt) ? (
                  <img
                    src={currentTrack.coverArt}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(currentTrack.coverArt)} flex items-center justify-center`}>
                    <Music className="w-4.5 h-4.5 text-white/80" />
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[12px] font-extrabold text-white truncate tracking-wide">
                  {currentTrack.title}
                </span>
                <span className="text-[10px] text-white/40 truncate mt-0.5 font-semibold">
                  {currentTrack.artist}
                </span>
              </div>
              <button
                onClick={() => toggleLikeTrack(currentTrack.id)}
                className={`p-1.5 rounded-full hover:bg-white/5 transition-all shrink-0 ${
                  likedTrackIds.includes(currentTrack.id) ? "text-red-400" : "text-white/35 hover:text-white"
                }`}
              >
                <Heart className="w-3.5 h-3.5" fill={likedTrackIds.includes(currentTrack.id) ? "currentColor" : "none"} />
              </button>
            </>
          )}
        </div>

        {/* Center: Playback Controls + Seek bar */}
        <div className="flex flex-col items-center gap-1.5 w-2/5">
          {/* Action buttons */}
          <div className="flex items-center gap-5">
            <button
              onClick={() => {
                const nextVal = !shuffleOn
                setShuffleOn(nextVal)
                localStorage.setItem("hv_shuffle", nextVal.toString())
              }}
              className={`p-2 rounded-full transition-all hover:scale-110 active:scale-95 ${
                shuffleOn ? "text-red-400" : "text-white/40 hover:text-white"
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={playPrevTrack}
              disabled={queue.length === 0}
              className="p-2 rounded-full text-white/40 hover:text-white transition-all hover:scale-110 active:scale-95 disabled:opacity-20 shrink-0"
              title="Previous"
            >
              <SkipBack className="w-4.5 h-4.5 fill-current" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={!currentTrackId}
              className="w-10 h-10 rounded-full bg-white text-black hover:bg-white/90 disabled:bg-white/10 disabled:text-white/20 transition-all hover:scale-110 active:scale-95 flex items-center justify-center shadow-md cursor-pointer shrink-0"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-4.5 h-4.5 fill-current" />
              ) : (
                <Play className="w-4.5 h-4.5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={playNextTrack}
              disabled={queue.length === 0}
              className="p-2 rounded-full text-white/40 hover:text-white transition-all hover:scale-110 active:scale-95 disabled:opacity-20 shrink-0"
              title="Next"
            >
              <SkipForward className="w-4.5 h-4.5 fill-current" />
            </button>

            <button
              onClick={() => {
                const cycles: ("off" | "all" | "one")[] = ["off", "all", "one"]
                const nextIdx = (cycles.indexOf(repeatMode) + 1) % cycles.length
                const nextVal = cycles[nextIdx]
                setRepeatMode(nextVal)
                localStorage.setItem("hv_repeat", nextVal)
              }}
              className={`p-2 rounded-full transition-all relative hover:scale-110 active:scale-95 ${
                repeatMode !== "off" ? "text-red-400" : "text-white/40 hover:text-white"
              }`}
              title={`Repeat: ${repeatMode}`}
            >
              <Repeat className="w-4 h-4" />
              {repeatMode === "one" && (
                <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 text-white text-[7.5px] rounded-full flex items-center justify-center font-bold">
                  1
                </span>
              )}
            </button>
          </div>

          {/* Progress bar slider */}
          <div className="w-full flex items-center gap-3">
            <span className="text-[10px] text-white/35 font-mono w-8 text-right select-none">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 relative flex items-center group h-3">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  if (audioRef.current) audioRef.current.currentTime = val
                  setCurrentTime(val)
                }}
                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white focus:outline-none"
                style={{
                  background: `linear-gradient(to right, rgba(239, 68, 68, 0.8) ${
                    duration > 0 ? (currentTime / duration) * 100 : 0
                  }%, rgba(255, 255, 255, 0.1) ${duration > 0 ? (currentTime / duration) * 100 : 0}%)`
                }}
              />
            </div>
            <span className="text-[10px] text-white/35 font-mono w-8 text-left select-none">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right Side: Volume Controls & Full Screen Visualizer Toggle */}
        <div className="flex items-center justify-end gap-3.5 w-1/4">
          <button
            onClick={() => {
              const nextVal = !isMuted
              setIsMuted(nextVal)
              localStorage.setItem("hv_muted", nextVal.toString())
            }}
            className="text-white/40 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Mute"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : volume < 35 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          
          <div className="w-20 md:w-28 flex items-center h-3">
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const val = Number(e.target.value)
                setVolume(val)
                localStorage.setItem("hv_volume", val.toString())
                if (isMuted) setIsMuted(false)
              }}
              className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white focus:outline-none"
              style={{
                background: `linear-gradient(to right, rgba(255, 255, 255, 0.7) ${
                  isMuted ? 0 : volume
                }%, rgba(255, 255, 255, 0.1) ${isMuted ? 0 : volume}%)`
              }}
            />
          </div>
        </div>
      </footer>
    </div>
  )
}
