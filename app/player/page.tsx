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
  Shield,
  Maximize2,
  Minimize2
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
  const [isFullscreenMode, setIsFullscreenMode] = useState(false)

  // Visualizer settings customizer state
  const [vizPattern, setVizPattern] = useState<"bars" | "wave" | "retro" | "particles">("bars")
  const [vizColor, setVizColor] = useState<"sunset" | "cyan" | "cyberpunk" | "emerald" | "mono">("sunset")
  const [vizGlow, setVizGlow] = useState<"none" | "low" | "high">("high")
  const [showVizCustomizer, setShowVizCustomizer] = useState(false)

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
  const fullscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const objectUrlsRef = useRef<Record<string, string>>({})
  const particlesRef = useRef<{ x: number; y: number; size: number; speedY: number; alpha: number; color: string }[]>([])
  const isInitialLoadRef = useRef(true)

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

    const savedVizPattern = localStorage.getItem("hv_viz_pattern")
    if (savedVizPattern) setVizPattern(savedVizPattern as any)

    const savedVizColor = localStorage.getItem("hv_viz_color")
    if (savedVizColor) setVizColor(savedVizColor as any)

    const savedVizGlow = localStorage.getItem("hv_viz_glow")
    if (savedVizGlow) setVizGlow(savedVizGlow as any)

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

  const updateVizPattern = (pattern: "bars" | "wave" | "retro" | "particles") => {
    setVizPattern(pattern)
    localStorage.setItem("hv_viz_pattern", pattern)
  }
  const updateVizColor = (color: "sunset" | "cyan" | "cyberpunk" | "emerald" | "mono") => {
    setVizColor(color)
    localStorage.setItem("hv_viz_color", color)
  }
  const updateVizGlow = (glow: "none" | "low" | "high") => {
    setVizGlow(glow)
    localStorage.setItem("hv_viz_glow", glow)
  }

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
        isInitialLoadRef.current = false
      } else {
        isInitialLoadRef.current = false
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
        if (isInitialLoadRef.current) {
          const savedTimeStr = localStorage.getItem("hv_last_timestamp")
          const savedTrackId = localStorage.getItem("hv_last_track_id")
          if (savedTrackId === currentTrackId && savedTimeStr) {
            const parsedTime = parseFloat(savedTimeStr)
            if (!isNaN(parsedTime) && parsedTime > 0) {
              audio.currentTime = parsedTime
            }
          }
          isInitialLoadRef.current = false
        } else {
          audio.currentTime = 0
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
    if (!visualizerOn) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      return
    }

    const renderLoop = () => {
      animationRef.current = requestAnimationFrame(renderLoop)

      const canvas = canvasRef.current
      const fsCanvas = fullscreenCanvasRef.current

      const drawCanvas = (c: HTMLCanvasElement, isFS: boolean) => {
        const ctx = c.getContext("2d")
        if (!ctx) return

        const width = c.width
        const height = c.height
        ctx.clearRect(0, 0, width, height)

        const bufferLength = analyserRef.current ? analyserRef.current.frequencyBinCount : 32
        const dataArray = new Uint8Array(bufferLength)

        if (analyserRef.current && isPlaying) {
          analyserRef.current.getByteFrequencyData(dataArray)
        } else {
          // Simulated wave/movement when playing or static when paused
          for (let i = 0; i < bufferLength; i++) {
            dataArray[i] = isPlaying
              ? Math.sin(Date.now() * 0.008 + i) * 35 + 50
              : Math.max(3, 8 - i * 0.2) // slowly drop to zero
          }
        }

        // 1. Get colors based on settings
        const gradient = ctx.createLinearGradient(0, height, 0, 0)
        let topColor = "rgba(168, 85, 247, 1)"
        let strokeColor = "rgba(236, 72, 153, 1)"

        const alpha1 = isFS ? 0.05 : 0.15
        const alpha2 = isFS ? 0.65 : 0.8
        const alpha3 = isFS ? 0.95 : 1

        if (vizColor === "sunset") {
          gradient.addColorStop(0, `rgba(220, 38, 38, ${alpha1})`) // red
          gradient.addColorStop(0.5, `rgba(236, 72, 153, ${alpha2})`) // pink
          gradient.addColorStop(1, `rgba(168, 85, 247, ${alpha3})`) // purple
          topColor = "rgba(168, 85, 247, 1)"
          strokeColor = "rgba(236, 72, 153, 1)"
        } else if (vizColor === "cyan") {
          gradient.addColorStop(0, `rgba(59, 130, 246, ${alpha1})`) // blue
          gradient.addColorStop(0.5, `rgba(6, 182, 212, ${alpha2})`) // cyan
          gradient.addColorStop(1, `rgba(20, 184, 166, ${alpha3})`) // teal
          topColor = "rgba(20, 184, 166, 1)"
          strokeColor = "rgba(6, 182, 212, 1)"
        } else if (vizColor === "cyberpunk") {
          gradient.addColorStop(0, `rgba(124, 58, 237, ${alpha1})`) // violet
          gradient.addColorStop(0.5, `rgba(168, 85, 247, ${alpha2})`) // purple
          gradient.addColorStop(1, `rgba(244, 63, 94, ${alpha3})`) // neon pink
          topColor = "rgba(244, 63, 94, 1)"
          strokeColor = "rgba(168, 85, 247, 1)"
        } else if (vizColor === "emerald") {
          gradient.addColorStop(0, `rgba(16, 185, 129, ${alpha1})`) // emerald
          gradient.addColorStop(0.5, `rgba(34, 197, 94, ${alpha2})`) // mint
          gradient.addColorStop(1, `rgba(132, 204, 22, ${alpha3})`) // lime
          topColor = "rgba(132, 204, 22, 1)"
          strokeColor = "rgba(34, 197, 94, 1)"
        } else if (vizColor === "mono") {
          gradient.addColorStop(0, `rgba(75, 85, 99, ${alpha1})`) // dark gray
          gradient.addColorStop(0.5, `rgba(156, 163, 175, ${alpha2})`) // light gray
          gradient.addColorStop(1, `rgba(255, 255, 255, ${alpha3})`) // white
          topColor = "rgba(255, 255, 255, 1)"
          strokeColor = "rgba(209, 213, 219, 1)"
        }

        // 2. Set shadow/glow intensity
        ctx.save()
        if (vizGlow === "high") {
          ctx.shadowBlur = isFS ? 16 : 8
          ctx.shadowColor = strokeColor
        } else if (vizGlow === "low") {
          ctx.shadowBlur = isFS ? 6 : 3
          ctx.shadowColor = strokeColor
        } else {
          ctx.shadowBlur = 0
        }

        // 3. Render patterns
        if (vizPattern === "bars") {
          const barWidth = (width / bufferLength) * 1.6
          let barHeight
          let x = 0
          for (let i = 0; i < bufferLength; i++) {
            barHeight = (dataArray[i] / 255) * height * (isFS ? 0.95 : 0.85)
            if (barHeight < 3) barHeight = 3

            ctx.fillStyle = gradient
            ctx.beginPath()
            ctx.roundRect(x, height - barHeight, barWidth - (isFS ? 3.5 : 2.5), barHeight, isFS ? 4 : 2.5)
            ctx.fill()
            x += barWidth
          }
        } 
        else if (vizPattern === "wave") {
          // Draw fill under wave
          ctx.beginPath()
          ctx.moveTo(0, height)
          for (let i = 0; i < bufferLength; i++) {
            const val = dataArray[i]
            const x = (width / (bufferLength - 1)) * i
            const y = height - (val / 255) * height * (isFS ? 0.92 : 0.82) - (isFS ? 6 : 3)
            
            if (i === 0) {
              ctx.lineTo(x, y)
            } else {
              const prevX = (width / (bufferLength - 1)) * (i - 1)
              const prevY = height - (dataArray[i - 1] / 255) * height * (isFS ? 0.92 : 0.82) - (isFS ? 6 : 3)
              const cpX = (prevX + x) / 2
              ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2)
            }
          }
          ctx.lineTo(width, height)
          ctx.closePath()
          ctx.fillStyle = gradient
          ctx.fill()

          // Draw main wave stroke
          ctx.beginPath()
          for (let i = 0; i < bufferLength; i++) {
            const val = dataArray[i]
            const x = (width / (bufferLength - 1)) * i
            const y = height - (val / 255) * height * (isFS ? 0.92 : 0.82) - (isFS ? 6 : 3)
            
            if (i === 0) {
              ctx.moveTo(x, y)
            } else {
              const prevX = (width / (bufferLength - 1)) * (i - 1)
              const prevY = height - (dataArray[i - 1] / 255) * height * (isFS ? 0.92 : 0.82) - (isFS ? 6 : 3)
              const cpX = (prevX + x) / 2
              ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2)
            }
          }
          ctx.strokeStyle = strokeColor
          ctx.lineWidth = isFS ? 3 : 2
          ctx.stroke()
        } 
        else if (vizPattern === "retro") {
          const barWidth = (width / bufferLength) * 1.6
          const gap = isFS ? 3.5 : 2.5
          const blockHeight = isFS ? 5 : 3
          const blockGap = isFS ? 2 : 1.5
          let x = 0

          for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * height * (isFS ? 0.95 : 0.85)
            const numBlocks = Math.floor(barHeight / (blockHeight + blockGap))

            for (let j = 0; j < numBlocks; j++) {
              const blockY = height - j * (blockHeight + blockGap) - blockHeight
              ctx.fillStyle = gradient
              ctx.fillRect(x, blockY, barWidth - gap, blockHeight)
            }
            x += barWidth
          }
        } 
        else if (vizPattern === "particles") {
          const particles = particlesRef.current

          // Spawn new particles based on frequencies
          if (isPlaying) {
            for (let i = 0; i < bufferLength; i += 2) {
              const freq = dataArray[i]
              if (freq > 70 && Math.random() < 0.25) {
                const segmentWidth = width / bufferLength
                const spawnX = (i + Math.random()) * segmentWidth * 1.6
                const size = (freq / 255) * (isFS ? 8 : 4.5) + 1.5
                const speedY = (freq / 255) * (isFS ? 2 : 1.2) + 0.4
                
                particles.push({
                  x: spawnX,
                  y: height,
                  size,
                  speedY,
                  alpha: 1,
                  color: topColor
                })
              }
            }
          } else {
            // Idle gentle particles float
            if (Math.random() < 0.1) {
              particles.push({
                x: Math.random() * width,
                y: height,
                size: Math.random() * (isFS ? 4 : 2) + 1.5,
                speedY: Math.random() * 0.5 + 0.2,
                alpha: 1,
                color: topColor
              })
            }
          }

          // Update & draw particles
          for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i]
            p.y -= p.speedY
            p.alpha -= isFS ? 0.008 : 0.015

            if (p.y < 0 || p.alpha <= 0) {
              particles.splice(i, 1)
              continue
            }

            const rgbMatch = p.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
            const fillStyle = rgbMatch 
              ? `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${p.alpha})`
              : p.color

            ctx.fillStyle = fillStyle
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
            ctx.fill()
          }
        }

        ctx.restore()
      }

      if (canvas) drawCanvas(canvas, false)
      if (isFullscreenMode && fsCanvas) drawCanvas(fsCanvas, true)
    }

    renderLoop()

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [visualizerOn, isPlaying, isFullscreenMode, vizPattern, vizColor, vizGlow])

  // Sync Native Fullscreen with React State
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeFS = !!document.fullscreenElement
      if (!isNativeFS) {
        setIsFullscreenMode(false)
      }
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  const toggleFullscreenMode = () => {
    if (!isFullscreenMode) {
      setIsFullscreenMode(true)
      const docEl = document.documentElement
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch((err) => {
          console.warn("Could not enter native fullscreen", err)
        })
      }
    } else {
      setIsFullscreenMode(false)
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => {
          console.warn("Could not exit native fullscreen", err)
        })
      }
    }
  }

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
        case "escape":
          setIsFullscreenMode(false)
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {})
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentTrackId, queue, isPlaying, isMuted, volume, isFullscreenMode])

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
      className="min-h-screen max-h-screen retro-grid flex flex-col relative text-black select-none overflow-hidden font-sans"
    >
      {/* Main Content Area */}
      <div className="z-10 flex-1 flex overflow-hidden">
        
        {/* Left Navigation Sidebar */}
        <aside className="w-16 lg:w-60 bg-[#e2e1e6] border-r-4 border-black flex flex-col justify-between py-6 text-black font-retro">
          <div className="flex flex-col gap-8">
            
            {/* Logo */}
            <div
              onClick={() => {
                setActiveTab("home")
                setSelectedPlaylistId(null)
              }}
              className="flex items-center gap-3 px-4 lg:px-6 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <Image
                src="/images/hv-logo.svg"
                alt="HV Logo"
                width={56}
                height={18}
                className="object-contain shrink-0"
              />
              <span className="text-[11px] font-retro font-bold uppercase tracking-[0.15em] hidden lg:block text-black">
                Verse 2 Player
              </span>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex flex-col gap-1.5 px-2 lg:px-3">
              {[
                { id: "home", label: "Home", icon: <Home className="w-4.5 h-4.5" /> },
                { id: "library", label: "Library", icon: <Music className="w-4.5 h-4.5" /> },
                { id: "playlists", label: "Playlists", icon: <ListMusic className="w-4.5 h-4.5" /> },
                { id: "converter", label: "Converter", icon: <Youtube className="w-4.5 h-4.5" /> },
                { id: "settings", label: "Settings", icon: <SettingsIcon className="w-4.5 h-4.5" /> },
                { id: "about", label: "About", icon: <Info className="w-4.5 h-4.5" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any)
                    setSelectedPlaylistId(null)
                  }}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-retro font-bold uppercase transition-all cursor-pointer border-2 ${
                    activeTab === tab.id
                      ? "bg-[#4a689d] text-white border-black shadow-[2px_2px_0px_black]"
                      : "text-black border-transparent hover:bg-black/5"
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
              className="flex items-center justify-center lg:justify-start gap-3.5 px-4 py-3 rounded-xl text-xs font-retro font-bold uppercase text-black/50 hover:text-black hover:bg-black/5 transition-all border-2 border-transparent"
            >
              <Sliders className="w-4.5 h-4.5" />
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
                      <div className="bg-[#f9f8fa] border-2 border-black shadow-[3px_3px_0px_black] rounded-3xl p-6 flex flex-col justify-center text-black font-retro">
                        <h1 className="text-xl lg:text-2xl font-bold tracking-wide">
                          {getGreeting()}, Listener!
                        </h1>
                        <p className="text-black/60 text-xs mt-1.5 leading-relaxed">
                          Welcome back to HeavenVerse. Stream your downloaded music offline, organize your playlists, and enjoy private listening.
                        </p>
                      </div>

                      {/* Recently Played Songs Section */}
                      <div className="bg-[#f9f8fa] border-2 border-black shadow-[3px_3px_0px_black] rounded-3xl p-6 flex flex-col gap-4 text-black font-retro">
                        <div className="flex justify-between items-center">
                          <h2 className="text-sm font-bold uppercase tracking-wider text-black/70">Recently Played</h2>
                          {recentlyPlayedTracks.length > 0 && (
                            <button
                              onClick={clearRecentlyPlayed}
                              className="text-[10px] text-black/40 hover:text-black transition-colors font-bold uppercase tracking-wide cursor-pointer"
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
                                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-black/5 border-2 border-transparent hover:border-black/10 cursor-pointer bg-white/50 transition-all group shadow-sm"
                              >
                                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-black/20 flex items-center justify-center bg-slate-900 relative">
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
                                  <span className="text-xs font-bold text-black truncate group-hover:text-[#4a689d] transition-colors">
                                    {track.title}
                                  </span>
                                  <span className="text-[10px] text-black/50 truncate mt-0.5">{track.artist}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-8 text-center border-2 border-dashed border-black/25 rounded-2xl">
                            <span className="text-xs text-black/40 italic">No recently played tracks. Start playing from your library!</span>
                          </div>
                        )}
                      </div>

                      {/* Local Storage Widget */}
                      <div className="bg-[#f9f8fa] border-2 border-black shadow-[3px_3px_0px_black] rounded-3xl p-6 flex flex-col gap-4 text-black font-retro">
                        <div className="flex justify-between items-center">
                          <h2 className="text-sm font-bold uppercase tracking-wider text-black/70">Local Storage</h2>
                          <button
                            onClick={updateStorageEstimate}
                            className="text-[10px] text-black/45 hover:text-black transition-colors font-bold uppercase tracking-wide cursor-pointer flex items-center gap-1"
                          >
                            Refresh
                          </button>
                        </div>
                        {storageInfo ? (
                          <div className="flex flex-col gap-2 mt-1">
                            <div className="flex justify-between text-[11px] text-black/60 font-bold mb-1">
                              <span>{(storageInfo.usage / (1024 * 1024)).toFixed(2)} MB Used</span>
                              <span>{(storageInfo.quota / (1024 * 1024 * 1024)).toFixed(2)} GB Total</span>
                            </div>
                            <div className="h-3 w-full bg-[#d5d4d9] border border-black/35 rounded-full overflow-hidden shadow-inner">
                              <div
                                  className="h-full bg-gradient-to-r from-[#4a689d] to-indigo-600 rounded-full transition-all duration-1000 ease-out"
                                  style={{ width: `${Math.min((storageInfo.usage / storageInfo.quota) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-[9px] text-black/40 text-right mt-0.5 font-bold tracking-wide">
                              {((storageInfo.usage / storageInfo.quota) * 100).toFixed(1)}% Sandbox Usage
                            </span>
                          </div>
                        ) : (
                          <div className="py-6 text-center border-2 border-dashed border-black/25 rounded-2xl">
                            <span className="text-xs text-black/40 italic">Calculating storage usage...</span>
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
                  <div className="flex justify-between items-center text-black font-retro">
                    <div>
                      <h1 className="text-xl lg:text-2xl font-bold tracking-wide">Your Library</h1>
                      <p className="text-black/50 text-[11px] mt-0.5">Manage local tracks stored inside your browser sandbox.</p>
                    </div>
                    <button
                      onClick={handleSelectFiles}
                      className="bg-white border-2 border-black hover:bg-zinc-100 text-black text-[11px] font-bold px-4 py-2 rounded-xl shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center gap-1.5"
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
                    className={`border-2 border-dashed rounded-2xl p-6 lg:p-10 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all duration-300 ${
                      isDragging
                        ? "border-black bg-[#c2c0c5] scale-[1.01]"
                        : "border-black/30 bg-[#d5d4d9] hover:bg-[#c2c0c5] hover:border-black"
                    }`}
                  >
                    <FolderUp className="w-8 h-8 text-black/50" />
                    <div className="text-center">
                      <span className="text-xs font-bold text-black block">
                        {uploadStatus ? uploadStatus : "Drag and drop music files here"}
                      </span>
                      <span className="text-[10px] text-black/50 block mt-0.5 font-bold">
                        Supports MP3, WAV, FLAC, M4A (Processed entirely offline)
                      </span>
                    </div>
                  </div>

                  {/* Search and Sort controls */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#f9f8fa] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_black] text-black font-retro">
                    <div className="w-full sm:max-w-xs relative">
                      <Search className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-black/40" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search songs or artists..."
                        className="w-full bg-[#d5d4d9] border-2 border-black rounded-xl pl-9.5 pr-4 py-2 text-xs text-black placeholder-black/45 focus:outline-none focus:bg-[#c2c0c5] transition-all"
                      />
                    </div>

                    <div className="flex gap-2 self-end sm:self-center">
                      {(["recent", "name", "duration"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setSortBy(opt)}
                          className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer border-2 ${
                            sortBy === opt
                              ? "bg-[#4a689d] text-white border-black"
                              : "bg-white text-black border-transparent hover:bg-black/5"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tracks List */}
                  <div className="space-y-1.5 text-black font-retro">
                    {filteredTracks.map((track) => (
                      <div
                        key={track.id}
                        onClick={() => selectAndPlayTrack(track.id, filteredTracks.map((t) => t.id))}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border-2 ${
                          currentTrackId === track.id
                            ? "bg-[#4a689d]/10 border-black shadow-[2px_2px_0px_black]"
                            : "hover:bg-black/5 border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          
                          {/* Artwork / Icon */}
                          <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 shadow-sm border border-black/20 flex items-center justify-center bg-slate-900">
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
                                className="bg-[#d5d4d9] border-2 border-black rounded px-2.5 py-1 text-xs text-black placeholder-black/40 focus:outline-none min-w-0 flex-1 font-bold"
                                placeholder="Track Title"
                              />
                              <input
                                type="text"
                                value={editArtist}
                                onChange={(e) => setEditArtist(e.target.value)}
                                className="bg-[#d5d4d9] border-2 border-black rounded px-2.5 py-1 text-xs text-black placeholder-black/40 focus:outline-none min-w-0 flex-1"
                                placeholder="Artist"
                              />
                              <button
                                onClick={() => saveRenameTrack(track.id)}
                                className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col min-w-0">
                              <span className={`text-xs font-bold truncate ${currentTrackId === track.id ? "text-[#4a689d]" : "text-black"}`}>
                                {track.title}
                              </span>
                              <span className="text-[10px] text-black/50 truncate mt-0.5">
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
                          <span className="text-[10.5px] text-black/60 font-mono tracking-tight font-bold">
                            {track.duration}
                          </span>
                          
                          <button
                            onClick={() => toggleLikeTrack(track.id)}
                            className={`p-1.5 rounded-lg border-2 border-transparent hover:border-black/10 transition-all ${
                              likedTrackIds.includes(track.id) ? "text-[#e63b3b]" : "text-black/40 hover:text-black"
                            }`}
                          >
                            <Heart className="w-3.5 h-3.5" fill={likedTrackIds.includes(track.id) ? "currentColor" : "none"} />
                          </button>

                          {/* Playlist add trigger */}
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenuTrackId(activeMenuTrackId === track.id ? null : track.id)}
                              className="p-1.5 rounded-full text-black/40 hover:text-black hover:bg-black/5 transition-colors border border-transparent"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {/* Dropdown Menu */}
                            {activeMenuTrackId === track.id && (
                              <div className="absolute right-0 mt-1.5 w-44 bg-[#f9f8fa] border-2 border-black rounded-xl shadow-[3px_3px_0px_black] z-20 py-1.5 animate-fade-in text-black font-retro">
                                <button
                                  onClick={() => startRenameTrack(track)}
                                  className="w-full text-left px-3.5 py-2 text-[10.5px] font-bold text-black hover:bg-black/5 transition-colors flex items-center gap-2"
                                >
                                  <Edit2 className="w-3.5 h-3.5" /> Rename Track
                                </button>
                                <button
                                  onClick={() => handleDeleteTrack(track.id)}
                                  className="w-full text-left px-3.5 py-2 text-[10.5px] font-bold text-[#e63b3b] hover:bg-red-500/10 transition-colors flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete Track
                                </button>
                                
                                {playlists.length > 0 && (
                                  <>
                                    <div className="border-t-2 border-dashed border-black/10 my-1.5" />
                                    <div className="px-3.5 py-1 text-[8.5px] uppercase font-bold text-black/40 tracking-widest">
                                      Add to Playlist:
                                    </div>
                                    {playlists.map((pl) => (
                                      <button
                                        key={pl.id}
                                        onClick={() => addTrackToPlaylist(track.id, pl.id)}
                                        className="w-full text-left px-3.5 py-1.5 text-[10px] font-bold text-black/60 hover:text-black hover:bg-black/5 transition-colors truncate"
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
                      <div className="py-16 text-center border-2 border-dashed border-black/20 rounded-2xl bg-white/40">
                        <span className="text-xs text-black/40 italic block">No tracks matched your query.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Playlists Tab */}
              {activeTab === "playlists" && (
                <div className="flex flex-col gap-6 animate-fade-in text-black font-retro">
                  
                  {!selectedPlaylistId ? (
                    // Default Playlists Grid list
                    <>
                      <div className="flex justify-between items-center text-black font-retro">
                        <div>
                          <h1 className="text-xl lg:text-2xl font-bold tracking-wide">Playlists</h1>
                          <p className="text-black/50 text-[11px] mt-0.5">Organize and group songs in local custom mix sheets.</p>
                        </div>
                        <button
                          onClick={handleCreatePlaylist}
                          className="bg-white border-2 border-black hover:bg-zinc-100 text-black text-[11px] font-bold px-4 py-2 rounded-xl shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center gap-1.5"
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
                            className="bg-[#f9f8fa] border-2 border-black shadow-[3px_3px_0px_black] rounded-2xl p-5 hover:translate-y-[-2px] transition-transform cursor-pointer flex flex-col justify-between h-40 group"
                          >
                            <div className="flex justify-between items-start">
                              <div className="p-3 bg-[#e2e1e6] border-2 border-black rounded-xl">
                                <ListMusic className="w-5 h-5 text-[#4a689d] group-hover:scale-105 transition-transform" />
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeletePlaylist(pl.id)
                                }}
                                className="p-1.5 rounded-lg text-black/40 hover:text-[#e63b3b] hover:bg-red-500/10 transition-all border border-transparent hover:border-black/15"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div>
                              <h3 className="text-black font-bold text-sm truncate tracking-wide">{pl.name}</h3>
                              <span className="text-[10px] text-black/55 mt-1 block font-bold">
                                {pl.trackIds.length} {pl.trackIds.length === 1 ? "track" : "tracks"} • Stored Locally
                              </span>
                            </div>
                          </div>
                        ))}

                        {playlists.length === 0 && (
                          <div
                            onClick={handleCreatePlaylist}
                            className="border-2 border-dashed border-black/25 bg-[#d5d4d9] rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-[#c2c0c5] hover:border-black transition-all text-center h-40 w-full"
                          >
                            <Plus className="w-7 h-7 text-black/40" />
                            <span className="text-xs font-bold text-black/60">Create your first playlist</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    // Single Playlist Detail View
                    <div className="flex flex-col gap-6 text-black font-retro">
                      
                      {/* Back button */}
                      <button
                        onClick={() => setSelectedPlaylistId(null)}
                        className="text-[11px] font-bold text-black/60 hover:text-black flex items-center gap-1.5 w-fit border border-transparent hover:border-black/10 px-2 py-1 rounded-lg"
                      >
                        ← Back to Playlists
                      </button>

                      {/* Header details */}
                      {activePlaylist && (
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b-2 border-black/10 pb-6">
                          <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-[#e2e1e6] border-2 border-black flex items-center justify-center text-[#4a689d] shadow-sm">
                              <ListMusic className="w-8 h-8" />
                            </div>
                            <div>
                              <h1 className="text-2xl font-bold tracking-wide">{activePlaylist.name}</h1>
                              <p className="text-black/50 text-xs mt-1">
                                Created on {new Date(activePlaylist.createdAt).toLocaleDateString()} • {activePlaylist.trackIds.length} tracks
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {activePlaylist.trackIds.length > 0 && (
                              <button
                                onClick={() => selectAndPlayTrack(activePlaylist.trackIds[0], activePlaylist.trackIds)}
                                className="bg-[#4a689d] text-white text-[11px] font-bold px-4 py-2 border-2 border-black rounded-xl transition-all shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-none flex items-center gap-1.5 cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" /> Play Mix
                              </button>
                            )}
                            <button
                              onClick={() => handleDeletePlaylist(activePlaylist.id)}
                              className="bg-[#e63b3b]/10 hover:bg-[#e63b3b]/20 border-2 border-black text-[#e63b3b] text-[11px] font-bold px-4 py-2 rounded-xl transition-all active:scale-[0.98] cursor-pointer"
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
                                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border-2 ${
                                  currentTrackId === track.id
                                    ? "bg-[#4a689d]/10 border-black shadow-[2px_2px_0px_black]"
                                    : "hover:bg-black/5 border-transparent"
                                }`}
                              >
                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                  <div className="text-[10px] text-black/40 w-5 text-center font-mono font-bold">
                                    {idx + 1}
                                  </div>
                                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-black/20 flex items-center justify-center bg-slate-900">
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
                                    <span className="text-xs font-bold text-black truncate">{track.title}</span>
                                    <span className="text-[10px] text-black/50 truncate mt-0.5">{track.artist}</span>
                                  </div>
                                </div>

                                <div
                                  className="flex items-center gap-3.5 shrink-0 ml-4"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="text-[10.5px] text-black/60 font-mono font-bold">{track.duration}</span>
                                  
                                  {/* Reorder actions */}
                                  <div className="flex flex-col gap-0.5">
                                    <button
                                      disabled={idx === 0}
                                      onClick={() => movePlaylistTrack(activePlaylist.id, idx, "up")}
                                      className="p-0.5 text-black/40 hover:text-black disabled:opacity-20 transition-colors cursor-pointer"
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      disabled={idx === activePlaylist.trackIds.length - 1}
                                      onClick={() => movePlaylistTrack(activePlaylist.id, idx, "down")}
                                      className="p-0.5 text-black/40 hover:text-black disabled:opacity-20 transition-colors cursor-pointer"
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => removeTrackFromPlaylist(track.id, activePlaylist.id)}
                                    className="p-1.5 rounded-lg text-black/40 hover:text-[#e63b3b] hover:bg-red-500/10 transition-colors border border-transparent hover:border-black/15 cursor-pointer"
                                    title="Remove from playlist"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}

                          {activePlaylist.trackIds.length === 0 && (
                            <div className="py-16 text-center border-2 border-dashed border-black/25 bg-[#d5d4d9] rounded-2xl">
                              <span className="text-xs text-black/55 italic block mb-3 font-bold">This playlist is empty.</span>
                              <button
                                onClick={() => setActiveTab("library")}
                                className="bg-[#4a689d] text-white text-[10.5px] font-bold px-3 py-1.5 border-2 border-black rounded-lg hover:bg-indigo-600 transition-all cursor-pointer shadow-[1.5px_1.5px_0px_black] active:translate-y-0.5 active:shadow-none"
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
                <div className="flex flex-col gap-6 animate-fade-in max-w-2xl text-black font-retro">
                  <div>
                    <h1 className="text-xl lg:text-2xl font-bold tracking-wide">Settings</h1>
                    <p className="text-black/50 text-[11px] mt-0.5">Customize your local listening preferences.</p>
                  </div>

                  <div className="bg-[#f9f8fa] border-2 border-black rounded-2xl p-5 shadow-[3px_3px_0px_black] space-y-6">
                    {/* Autoplay toggle */}
                    <div className="flex justify-between items-center pb-4 border-b border-black/10">
                      <div>
                        <h3 className="text-xs font-bold text-black tracking-wide">Autoplay Next</h3>
                        <p className="text-[10px] text-black/50 mt-0.5">Automatically stream upcoming song list on track completion.</p>
                      </div>
                      <button
                        onClick={() => {
                          const nextVal = !autoplay
                          setAutoplay(nextVal)
                          localStorage.setItem("hv_autoplay", nextVal.toString())
                        }}
                        className={`w-12 h-6 rounded-full p-1 transition-all border-2 border-black cursor-pointer ${
                          autoplay ? "bg-[#4a689d]" : "bg-[#d5d4d9]"
                        }`}
                      >
                        <div className={`w-4 h-4 bg-white border border-black rounded-full shadow transition-transform ${
                          autoplay ? "translate-x-5" : "translate-x-0"
                        }`} />
                      </button>
                    </div>

                    {/* Equalizer toggle */}
                    <div className="flex justify-between items-center pb-4 border-b border-black/10">
                      <div>
                        <h3 className="text-xs font-bold text-black tracking-wide">Equalizer Visualizer</h3>
                        <p className="text-[10px] text-black/50 mt-0.5">Render dancing canvas frequency bars in the Right Panel.</p>
                      </div>
                      <button
                        onClick={() => {
                          const nextVal = !visualizerOn
                          setVisualizerOn(nextVal)
                          localStorage.setItem("hv_visualizer", nextVal.toString())
                        }}
                        className={`w-12 h-6 rounded-full p-1 transition-all border-2 border-black cursor-pointer ${
                          visualizerOn ? "bg-[#4a689d]" : "bg-[#d5d4d9]"
                        }`}
                      >
                        <div className={`w-4 h-4 bg-white border border-black rounded-full shadow transition-transform ${
                          visualizerOn ? "translate-x-5" : "translate-x-0"
                        }`} />
                      </button>
                    </div>

                    {/* Shortcuts Reference */}
                    <div>
                      <h3 className="text-xs font-bold text-black tracking-wide mb-3">Global Keyboard Shortcuts</h3>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-black/60 font-bold font-mono">
                        <div className="flex justify-between border-b border-black/10 py-1.5 pr-4">
                          <span>[Space]</span>
                          <span className="text-black">Play / Pause</span>
                        </div>
                        <div className="flex justify-between border-b border-black/10 py-1.5 pl-4">
                          <span>[ArrowUp/Down]</span>
                          <span className="text-black">Volume +/-</span>
                        </div>
                        <div className="flex justify-between border-b border-black/10 py-1.5 pr-4">
                          <span>[ArrowLeft/Right]</span>
                          <span className="text-black">Seek +/- 5s</span>
                        </div>
                        <div className="flex justify-between border-b border-black/10 py-1.5 pl-4">
                          <span>[M]</span>
                          <span className="text-black">Mute / Unmute</span>
                        </div>
                        <div className="flex justify-between border-b border-black/10 py-1.5 pr-4">
                          <span>[N]</span>
                          <span className="text-black">Next Track</span>
                        </div>
                        <div className="flex justify-between border-b border-black/10 py-1.5 pl-4">
                          <span>[P]</span>
                          <span className="text-black">Previous Track</span>
                        </div>
                        <div className="flex justify-between border-b border-black/10 py-1.5 pr-4">
                          <span>[L]</span>
                          <span className="text-black">Like/Favorite</span>
                        </div>
                      </div>
                    </div>

                    {/* Wipe storage */}
                    <div className="border-t border-black/10 pt-5 flex justify-between items-center">
                      <div>
                        <h3 className="text-xs font-bold text-[#e63b3b] tracking-wide">Wipe Sandbox Data</h3>
                        <p className="text-[10px] text-black/50 mt-0.5">Delete all local uploaded songs and playlists permanently from the browser.</p>
                      </div>
                      <button
                        onClick={handleWipeDatabase}
                        className="px-4 py-2 bg-[#e63b3b] hover:bg-[#d82a2a] border-2 border-black text-white text-[10.5px] font-bold rounded-xl transition-all cursor-pointer shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-none"
                      >
                        Reset Storage
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* About Tab */}
              {activeTab === "about" && (
                <div className="flex flex-col gap-6 animate-fade-in max-w-2xl text-black font-retro">
                  <div>
                    <h1 className="text-xl lg:text-2xl font-bold tracking-wide">About HeavenVerse</h1>
                    <p className="text-black/50 text-[11px] mt-0.5">Your private, offline-first personal music space.</p>
                  </div>

                  <div className="bg-[#f9f8fa] border-2 border-black rounded-2xl p-6 shadow-[3px_3px_0px_black] space-y-5 text-xs leading-relaxed text-black/75 font-bold">
                    <p>
                      HeavenVerse V2 is built around a simple idea: your music should belong to you. Against typical streaming platforms that require accounts, log your activity, and track what you listen to, HeavenVerse keeps everything completely local and private.
                    </p>
                    
                    <div className="space-y-4 mt-2">
                      <div className="flex gap-3">
                        <div className="p-2 bg-[#e2e1e6] border-2 border-black rounded-xl h-fit text-black shrink-0">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="text-black block text-[11.5px] font-bold uppercase">100% Private & Local</strong>
                          <span className="text-black/55 text-[10.5px]">Your files never leave your device. They are kept securely inside your browser's private sandbox, ensuring nobody else can ever track or access them.</span>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="p-2 bg-[#e2e1e6] border-2 border-black rounded-xl h-fit text-black shrink-0">
                          <Sliders className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="text-black block text-[11.5px] font-bold uppercase">Offline Freedom</strong>
                          <span className="text-black/55 text-[10.5px]">Your songs and playlists are saved directly to your browser memory. Once imported, you can disconnect from the internet and listen to your music anywhere.</span>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="p-2 bg-[#e2e1e6] border-2 border-black rounded-xl h-fit text-black shrink-0">
                          <Music className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="text-black block text-[11.5px] font-bold uppercase">No Accounts, No Tracking</strong>
                          <span className="text-black/55 text-[10.5px]">No logins, no passwords, and no trackers. You open the page, drop your music, and start listening instantly. Simple as that.</span>
                        </div>
                      </div>
                    </div>

                    <p className="pt-4 border-t-2 border-dashed border-black/10 text-[10px] text-black/55">
                      Designed and developed by Vansh. Built for private, clean, and fast local audio listening.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* Right Panel (Now Playing, Visualizer & Queue) */}
        <section className="hidden xl:flex w-80 bg-[#e2e1e6] border-l-4 border-black flex-col p-6 overflow-y-auto custom-scrollbar gap-6 text-black font-retro">
          
          {/* Now Playing Widget */}
          <div className="bg-[#f9f8fa] border-2 border-black rounded-[1.5rem] p-5 shadow-[3px_3px_0px_black] flex flex-col gap-4">
            <h3 className="text-[10px] font-bold text-black/55 uppercase tracking-widest px-0.5 font-retro">Now Playing</h3>
            
            {/* Mini 3D CRT Monitor Frame */}
            <div className="relative bg-[#1a1c23] border-4 border-[#3a3d46] rounded-2xl p-2.5 shadow-[inset_0_4px_10px_rgba(0,0,0,0.8),_3px_3px_0px_black] overflow-hidden group">
              {/* Scanlines effect overlay */}
              <div className="absolute inset-0 scanlines pointer-events-none z-10" />
              {/* Screen reflection glass overlay */}
              <div className="absolute inset-0 crt-curve pointer-events-none z-10 bg-gradient-to-tr from-white/0 via-white/5 to-white/15 opacity-40" />
              {/* Phosphor glow effect */}
              <div className={`absolute inset-0 pointer-events-none z-0 bg-blue-500/5 mix-blend-color-dodge transition-opacity ${isPlaying ? "crt-glow animate-crt-flicker" : "opacity-20"}`} />

              <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-black flex items-center justify-center bg-zinc-950 z-0">
                {isUrl(currentTrack?.coverArt) ? (
                  <img
                    src={currentTrack?.coverArt}
                    alt="Cover Art"
                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isPlaying ? "animate-spin-slow" : ""}`}
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${currentTrack ? getCoverGradient(currentTrack.coverArt) : "from-[#0f172a] to-[#1e293b]"} flex items-center justify-center`}>
                    <Music className={`w-12 h-12 text-white/35 group-hover:scale-105 transition-transform duration-500 ${isPlaying ? "animate-pulse" : ""}`} />
                  </div>
                )}
                
                {/* Mini Japanese corner stamp */}
                <div className="absolute top-2 left-2 bg-[#e63b3b] text-white text-[8px] font-retro px-1 border border-black leading-none uppercase select-none">
                  再生
                </div>
              </div>
              
              {/* LCD-style text labels inside the CRT monitor frame */}
              <div className="mt-3 p-2 bg-[#090b10] border border-[#2a2c35] rounded-lg flex flex-col font-mono text-[10px] text-emerald-400 select-none">
                <span className="truncate font-bold uppercase">
                  {currentTrack?.title || "NO MEDIA"}
                </span>
                <span className="text-[8.5px] text-emerald-500/60 truncate mt-0.5">
                  {currentTrack?.artist || "STANDBY"}
                </span>
              </div>
            </div>

            {/* Canvas Frequency Visualizer */}
            {visualizerOn && (
              <div className="flex flex-col gap-2">
                <div className="relative group/viz h-20 bg-[#d5d4d9] rounded-xl border-2 border-black p-2 flex items-center justify-center overflow-hidden shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={260}
                    height={68}
                    className="w-full h-full object-contain"
                  />
                  
                  {/* Visualizer Settings Button */}
                  <button
                    onClick={() => setShowVizCustomizer(!showVizCustomizer)}
                    className={`absolute top-1.5 right-1.5 p-1 bg-white hover:bg-zinc-100 border-2 border-black rounded-lg transition-all cursor-pointer shadow-[1.5px_1.5px_0px_black] active:translate-y-0.5 active:shadow-none z-20 ${
                      showVizCustomizer ? "opacity-100 text-red-500" : "opacity-0 group-hover/viz:opacity-100 text-black/50"
                    }`}
                    title="Customize Visualizer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Visualizer Customizer Panel */}
                {showVizCustomizer && (
                  <div className="bg-[#f9f8fa] border-2 border-black rounded-xl p-3 shadow-[3px_3px_0px_black] text-xs space-y-3 animate-fade-in z-20 text-black">
                    <div className="flex justify-between items-center pb-1.5 border-b border-black/10">
                      <span className="font-bold text-black text-[10.5px] uppercase tracking-wider">Visualizer Styles</span>
                      <button 
                        onClick={() => setShowVizCustomizer(false)}
                        className="text-black/50 hover:text-black font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    
                    {/* Pattern selector */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-black/55 uppercase font-bold">Pattern</span>
                      <div className="grid grid-cols-4 gap-1">
                        {(["bars", "wave", "retro", "particles"] as const).map((pat) => (
                          <button
                            key={pat}
                            onClick={() => updateVizPattern(pat)}
                            className={`py-1 text-[9px] font-bold rounded-lg border-2 capitalize transition-all cursor-pointer ${
                              vizPattern === pat
                                ? "bg-[#4a689d] border-black text-white"
                                : "bg-white border-black/25 text-black hover:bg-zinc-100"
                            }`}
                          >
                            {pat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color Scheme selector */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-black/55 uppercase font-bold">Colors</span>
                      <div className="grid grid-cols-5 gap-1">
                        {(["sunset", "cyan", "cyberpunk", "emerald", "mono"] as const).map((col) => (
                          <button
                            key={col}
                            onClick={() => updateVizColor(col)}
                            className={`py-0.5 text-[8px] font-bold rounded-lg border-2 capitalize transition-all cursor-pointer ${
                              vizColor === col
                                ? "bg-[#4a689d] border-black text-white"
                                : "bg-white border-black/25 text-black hover:bg-zinc-100"
                            }`}
                          >
                            {col}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Glow intensity selector */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-black/55 uppercase font-bold">Glow Effect</span>
                      <div className="grid grid-cols-3 gap-1">
                        {(["none", "low", "high"] as const).map((glow) => (
                          <button
                            key={glow}
                            onClick={() => updateVizGlow(glow)}
                            className={`py-1 text-[9px] font-bold rounded-lg border-2 capitalize transition-all cursor-pointer ${
                              vizGlow === glow
                                ? "bg-[#4a689d] border-black text-white"
                                : "bg-white border-black/25 text-black hover:bg-zinc-100"
                            }`}
                          >
                            {glow}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Queue List Widget */}
          <div className="flex-1 flex flex-col gap-3 min-h-[220px]">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-bold text-black/50 uppercase tracking-widest font-retro">Next Up (Queue)</span>
              {queue.length > 0 && (
                <button
                  onClick={() => setQueue([currentTrackId || ""])}
                  className="text-[9.5px] font-bold text-black/50 hover:text-black transition-colors cursor-pointer"
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
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border-2 ${
                      isCurrent
                        ? "bg-[#4a689d]/10 border-black shadow-[1.5px_1.5px_0px_black]"
                        : "hover:bg-black/5 border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-black/20 flex items-center justify-center bg-slate-900">
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
                        <span className={`text-xs font-bold truncate ${isCurrent ? "text-[#4a689d]" : "text-black"}`}>
                          {track.title}
                        </span>
                        <span className="text-[10.5px] text-black/50 truncate mt-0.5">{track.artist}</span>
                      </div>
                    </div>

                    <span className="text-[9.5px] text-black/60 font-mono font-bold">{track.duration}</span>
                  </div>
                )
              })}

              {queue.length === 0 && (
                <div className="h-full flex items-center justify-center py-12 border-2 border-dashed border-black/20 rounded-xl">
                  <span className="text-[10px] text-black/40 italic">Playback queue is empty</span>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Persistent Audio Control Bar */}
      <footer className="z-20 bg-[#e2e1e6] border-t-4 border-black py-4 px-6 flex items-center justify-between shadow-[0_-4px_10px_rgba(0,0,0,0.15)] text-black font-retro relative">
        
        {/* Left Side: Brief track info / LCD panel */}
        <div className="flex items-center gap-3.5 w-1/4 min-w-0">
          {currentTrack ? (
            <>
              {/* Mini cassette/album art frame */}
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border-2 border-black shadow-[1.5px_1.5px_0px_black] flex items-center justify-center bg-slate-900 relative">
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
              
              {/* Inset LCD text display */}
              <div className="flex-1 min-w-0 bg-[#090b10] border-2 border-black rounded-xl px-3 py-1.5 font-sans text-[10px] text-emerald-400 select-none shadow-[inset_0_2px_5px_rgba(0,0,0,0.7)]">
                <span className="text-[8px] text-emerald-400 block font-bold tracking-widest uppercase opacity-75">TRACK DECK</span>
                <div className="truncate font-bold uppercase mt-0.5 text-emerald-400 text-[10px] tracking-wide">
                  {currentTrack.title}
                </div>
                <div className="text-[9px] text-[#ff8000] font-bold truncate mt-0.5 tracking-wide">
                  {currentTrack.artist}
                </div>
              </div>

              <button
                onClick={() => toggleLikeTrack(currentTrack.id)}
                className={`p-1.5 rounded-lg border-2 border-transparent hover:border-black/10 transition-all shrink-0 ${
                  likedTrackIds.includes(currentTrack.id) ? "text-[#e63b3b]" : "text-black/40 hover:text-black"
                }`}
              >
                <Heart className="w-3.5 h-3.5" fill={likedTrackIds.includes(currentTrack.id) ? "currentColor" : "none"} />
              </button>
            </>
          ) : (
            <div className="bg-[#090b10] border-2 border-black rounded-xl px-3 py-2.5 font-mono text-[10px] text-emerald-500/40 select-none w-full">
              SYSTEM STANDBY • NO MEDIA
            </div>
          )}
        </div>

        {/* Center: Playback Controls + Seek bar */}
        <div className="flex flex-col items-center gap-2 w-2/5 text-black">
          {/* Action buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                const nextVal = !shuffleOn
                setShuffleOn(nextVal)
                localStorage.setItem("hv_shuffle", nextVal.toString())
              }}
              className={`p-1.5 rounded-lg border-2 border-black shadow-[1.5px_1.5px_0px_black] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer ${
                shuffleOn ? "bg-[#4a689d] text-white" : "bg-white text-black hover:bg-zinc-100"
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={playPrevTrack}
              disabled={queue.length === 0}
              className="p-1.5 rounded-lg bg-white border-2 border-black shadow-[1.5px_1.5px_0px_black] active:translate-y-0.5 active:shadow-none text-black hover:bg-zinc-100 transition-all disabled:opacity-30 disabled:pointer-events-none shrink-0"
              title="Previous"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={!currentTrackId}
              className={`w-9 h-9 rounded-xl border-2 border-black shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center cursor-pointer shrink-0 disabled:opacity-30 disabled:pointer-events-none ${
                isPlaying ? "bg-[#e63b3b] text-white" : "bg-white text-black hover:bg-zinc-100"
              }`}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={playNextTrack}
              disabled={queue.length === 0}
              className="p-1.5 rounded-lg bg-white border-2 border-black shadow-[1.5px_1.5px_0px_black] active:translate-y-0.5 active:shadow-none text-black hover:bg-zinc-100 transition-all disabled:opacity-30 disabled:pointer-events-none shrink-0"
              title="Next"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={() => {
                const cycles: ("off" | "all" | "one")[] = ["off", "all", "one"]
                const nextIdx = (cycles.indexOf(repeatMode) + 1) % cycles.length
                const nextVal = cycles[nextIdx]
                setRepeatMode(nextVal)
                localStorage.setItem("hv_repeat", nextVal)
              }}
              className={`p-1.5 rounded-lg border-2 border-black shadow-[1.5px_1.5px_0px_black] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer relative ${
                repeatMode !== "off" ? "bg-[#4a689d] text-white" : "bg-white text-black hover:bg-zinc-100"
              }`}
              title={`Repeat: ${repeatMode}`}
            >
              <Repeat className="w-3.5 h-3.5" />
              {repeatMode === "one" && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#e63b3b] text-white text-[7.5px] rounded-full flex items-center justify-center font-bold border border-black">
                  1
                </span>
              )}
            </button>
          </div>

          {/* Progress bar slider */}
          <div className="w-full flex items-center gap-2 px-1">
            <span className="text-[10px] text-black/60 font-mono font-bold w-8 text-right select-none">
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
                className="w-full h-1.5 bg-[#d5d4d9] border border-black/40 rounded-full appearance-none cursor-pointer focus:outline-none"
                style={{
                  background: `linear-gradient(to right, #4a689d ${
                    duration > 0 ? (currentTime / duration) * 100 : 0
                  }%, #d5d4d9 ${duration > 0 ? (currentTime / duration) * 100 : 0}%)`
                }}
              />
            </div>
            <span className="text-[10px] text-black/60 font-mono font-bold w-8 text-left select-none">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right Side: Volume Controls & Full Screen Visualizer Toggle */}
        <div className="flex items-center justify-end gap-3 w-1/4">
          <button
            onClick={() => {
              const nextVal = !isMuted
              setIsMuted(nextVal)
              localStorage.setItem("hv_muted", nextVal.toString())
            }}
            className="text-black/50 hover:text-black transition-colors cursor-pointer shrink-0"
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
              className="w-full h-1.5 bg-[#d5d4d9] border border-black/40 rounded-full appearance-none cursor-pointer focus:outline-none"
              style={{
                background: `linear-gradient(to right, #4a689d ${
                  isMuted ? 0 : volume
                }%, #d5d4d9 ${isMuted ? 0 : volume}%)`
              }}
            />
          </div>

          <button
            onClick={toggleFullscreenMode}
            disabled={!currentTrackId}
            className="p-1 rounded-lg bg-white border-2 border-black shadow-[1.5px_1.5px_0px_black] active:translate-y-0.5 active:shadow-none text-black hover:bg-zinc-100 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none ml-2"
            title="Fullscreen Mode"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>

      {/* Fullscreen Overlay */}
      {isFullscreenMode && (
        <div className="fixed inset-0 z-50 retro-grid flex flex-col justify-between p-6 md:p-10 select-none overflow-hidden animate-fade-in">
          
          {/* Top Bar: Title & Minimize Button */}
          <header className="z-10 flex items-center justify-between border-b border-white/20 pb-4">
            <div className="flex items-center gap-3">
              <Image
                src="/images/hv-logo.svg"
                alt="HV Logo"
                width={44}
                height={14}
                className="object-contain text-white"
              />
              <span className="text-[12px] font-retro text-white tracking-widest uppercase">
                HEAVENVERSE • ANALOG
              </span>
            </div>
            
            <button
              onClick={toggleFullscreenMode}
              className="p-2 rounded-xl bg-white hover:bg-zinc-100 border-2 border-black text-black text-xs font-retro shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center gap-2"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Minimize</span>
            </button>
          </header>

          {/* Main Visualizer Workspace (Vintage CRT + Details) */}
          <main className="z-10 flex-1 flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16 my-8 overflow-y-auto custom-scrollbar">
            
            {/* 3D CRT Monitor Block */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
              
              {/* Vintage Monitor Bezel Frame */}
              <div className="relative w-72 h-72 sm:w-96 sm:h-96 bg-[#e2e0e5] border-[5px] border-[#1e1e24] rounded-[2.5rem] p-6 shadow-[10px_10px_0px_rgba(0,0,0,0.3)] flex flex-col justify-between items-center">
                
                {/* CRT Screen Tube Container */}
                <div className="relative w-full h-[88%] bg-zinc-950 border-[4px] border-[#a09fa4] rounded-2xl overflow-hidden flex flex-col items-center justify-center crt-glow shadow-inner">
                  
                  {/* Scanlines & Glow Flicker */}
                  <div className="scanlines crt-flicker" />
                  <div className="crt-curve" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.08] pointer-events-none z-20" />
                  
                  {/* Spinning Vinyl Record Inside CRT */}
                  <div 
                    className="relative w-40 h-40 sm:w-52 sm:h-52 rounded-full bg-[#121115] border-4 border-black/40 flex items-center justify-center shadow-2xl transition-all duration-700 animate-[spin_20s_linear_infinite]"
                    style={{ animationPlayState: isPlaying ? "running" : "paused" }}
                  >
                    {/* Grooves */}
                    <div className="absolute inset-2 rounded-full border border-white/[0.03]" />
                    <div className="absolute inset-5 rounded-full border border-white/[0.02]" />
                    <div className="absolute inset-8 rounded-full border border-white/[0.03]" />
                    <div className="absolute inset-11 rounded-full border border-white/[0.02]" />
                    <div className="absolute inset-14 rounded-full border border-white/[0.03]" />
                    <div className="absolute inset-17 rounded-full border border-white/[0.02]" />
                    <div className="absolute inset-20 rounded-full border border-white/[0.03]" />

                    {/* Album Art Label */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-[4px] border-[#18171b] relative flex items-center justify-center bg-zinc-900 shadow-inner">
                      {currentTrack && isUrl(currentTrack.coverArt) ? (
                        <img
                          src={currentTrack.coverArt}
                          alt="Cover Art"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${currentTrack ? getCoverGradient(currentTrack.coverArt) : "from-[#1e293b] to-[#0f172a]"} flex items-center justify-center`}>
                          <Music className="w-6 h-6 text-white/50" />
                        </div>
                      )}
                      {/* Vinyl center pin hole */}
                      <div className="absolute w-3.5 h-3.5 rounded-full bg-black border-2 border-white/20 shadow-inner" />
                    </div>
                  </div>

                </div>

                {/* Speaker vents & power led */}
                <div className="w-full h-4 flex justify-between items-center px-4 mt-2 border-t border-black/5 pt-1">
                  <div className="flex gap-1.5">
                    <div className="w-5 h-1.5 bg-black/30 rounded" />
                    <div className="w-5 h-1.5 bg-black/30 rounded" />
                    <div className="w-5 h-1.5 bg-black/30 rounded" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[7px] font-retro text-black/50 uppercase tracking-wider">POWER</span>
                    <div className={`w-2.5 h-2.5 rounded-full border border-black/20 ${isPlaying ? "bg-green-500 shadow-[0_0_6px_#22c55e]" : "bg-red-500 shadow-[0_0_6px_#ef4444]"}`} />
                  </div>
                </div>

              </div>

              {/* Monitor Pedestal Base Stand */}
              <div className="w-48 h-4 bg-[#c2c0c5] border-x-[5px] border-b-[5px] border-[#1e1e24] rounded-b-2xl shadow-md" />

            </div>

            {/* Metadata, Info & Visualizer */}
            <div className="flex-1 w-full max-w-xl flex flex-col gap-6 justify-center">
              
              {/* Song Information Block */}
              <div className="flex flex-col gap-2 text-center lg:text-left">
                <h1 className="text-5xl sm:text-7xl font-pixel text-white uppercase tracking-wider drop-shadow-[4px_4px_0px_rgba(0,0,0,0.4)]">
                  STEREO ROOM
                </h1>
                
                <div className="flex items-center justify-center lg:justify-start gap-4 mt-2">
                  <h2 className="text-xl sm:text-2xl font-retro tracking-widest text-[#a6bde8] uppercase">
                    {currentTrack?.title || "No Track Selected"}
                  </h2>
                  {currentTrack && (
                    <button
                      onClick={() => toggleLikeTrack(currentTrack.id)}
                      className={`p-1.5 rounded-lg bg-white border-2 border-black shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer ${
                        likedTrackIds.includes(currentTrack.id) ? "text-red-500" : "text-black/60 hover:text-black"
                      }`}
                    >
                      <Heart className="w-4 h-4" fill={likedTrackIds.includes(currentTrack.id) ? "currentColor" : "none"} />
                    </button>
                  )}
                </div>
                
                <p className="text-xs sm:text-sm font-retro text-white/60 tracking-wider mt-0.5 truncate uppercase">
                  BY: {currentTrack?.artist || "Offline Library"}
                </p>

                {/* Stylized Retro Description Box */}
                <div className="border-t-2 border-dashed border-white/20 pt-4 mt-2 max-w-md text-white/70 text-[11px] font-retro leading-relaxed text-left">
                  <p>
                    Vinyl you'll want to hold in your hands — from local uploads to rare offline conversions. Immersive spatial graphics, offline freedom, and mindful listening.
                  </p>
                  <span className="block mt-2 text-[#a6bde8] font-bold">Mindful listening starts here ↘</span>
                </div>
              </div>

              {/* Large Audio Visualizer Canvas */}
              {visualizerOn && (
                <div className="relative group/fs-viz h-28 md:h-36 bg-black/45 border-2 border-white/20 rounded-2xl p-3 flex items-center justify-center overflow-hidden shadow-inner">
                  {/* Floating particles background / coordinate grid grid dots */}
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                  
                  <canvas
                    ref={fullscreenCanvasRef}
                    width={480}
                    height={120}
                    className="w-full h-full object-contain"
                  />

                  {/* Settings Button */}
                  <button
                    onClick={() => setShowVizCustomizer(!showVizCustomizer)}
                    className={`absolute top-2.5 right-2.5 p-1.5 bg-black/80 hover:bg-black border-2 border-white/10 rounded-xl transition-all cursor-pointer shadow-md z-20 ${
                      showVizCustomizer ? "opacity-100 text-red-400" : "opacity-0 group-hover/fs-viz:opacity-100 text-white/50 hover:text-white"
                    }`}
                    title="Customize Visualizer"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>

                  {/* Fullscreen Visualizer Customizer Panel */}
                  {showVizCustomizer && (
                    <div className="absolute inset-x-3 bottom-3 top-3 bg-[#1c2a42]/95 border-2 border-white/15 rounded-xl p-3 flex flex-col md:flex-row justify-between gap-4 shadow-2xl text-[11px] font-retro text-white z-30 animate-fade-in">
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex justify-between items-center border-b border-white/10 pb-1">
                          <span className="font-bold text-white uppercase tracking-wider text-[9px]">Visualizer Customizer</span>
                          <button 
                            onClick={() => setShowVizCustomizer(false)}
                            className="text-white/40 hover:text-white md:hidden font-bold"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="flex gap-4 mt-2">
                          {/* Pattern */}
                          <div className="flex-1 space-y-1">
                            <span className="text-[8px] text-white/40 uppercase font-semibold">Pattern</span>
                            <div className="grid grid-cols-2 gap-1">
                              {(["bars", "wave", "retro", "particles"] as const).map((pat) => (
                                <button
                                  key={pat}
                                  onClick={() => updateVizPattern(pat)}
                                  className={`py-0.5 text-[9px] font-bold rounded-lg border capitalize transition-all cursor-pointer ${
                                    vizPattern === pat
                                      ? "bg-red-500/10 border-red-500/40 text-red-400"
                                      : "bg-white/5 border-white/5 text-white/55 hover:bg-white/10 hover:text-white"
                                  }`}
                                >
                                  {pat}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Color Scheme */}
                          <div className="flex-1 space-y-1">
                            <span className="text-[8px] text-white/40 uppercase font-semibold">Colors</span>
                            <div className="grid grid-cols-3 gap-1">
                              {(["sunset", "cyan", "cyberpunk", "emerald", "mono"] as const).map((col) => (
                                <button
                                  key={col}
                                  onClick={() => updateVizColor(col)}
                                  className={`py-0.5 text-[8px] font-bold rounded-lg border capitalize transition-all cursor-pointer ${
                                    vizColor === col
                                      ? "bg-red-500/10 border-red-500/40 text-red-400"
                                      : "bg-white/5 border-white/5 text-white/55 hover:bg-white/10 hover:text-white"
                                  }`}
                                >
                                  {col}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Glow */}
                          <div className="flex-1 space-y-1">
                            <span className="text-[8px] text-white/40 uppercase font-semibold">Glow</span>
                            <div className="grid grid-cols-3 gap-1">
                              {(["none", "low", "high"] as const).map((glow) => (
                                <button
                                  key={glow}
                                  onClick={() => updateVizGlow(glow)}
                                  className={`py-0.5 text-[9px] font-bold rounded-lg border capitalize transition-all cursor-pointer ${
                                    vizGlow === glow
                                      ? "bg-red-500/10 border-red-500/40 text-red-400"
                                      : "bg-white/5 border-white/5 text-white/55 hover:bg-white/10 hover:text-white"
                                  }`}
                                >
                                  {glow}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowVizCustomizer(false)}
                        className="hidden md:flex self-start p-1 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          </main>

          {/* Decorative Vertical Japanese Column */}
          <div className="hidden xl:flex absolute right-10 top-1/4 bottom-1/4 w-12 flex-col justify-between items-center text-white/15 select-none pointer-events-none font-retro tracking-[0.5em] text-[11px] uppercase writing-mode-vertical text-center">
            <span>ヘブンバース</span>
            <div className="h-20 w-0.5 bg-white/10" />
            <span>音楽スペース</span>
            <div className="h-20 w-0.5 bg-white/10" />
            <span>アナログ音源</span>
          </div>

          {/* Controls Console (Tactile Retro Beige Deck) */}
          <footer className="z-10 bg-[#e2e1e6] border-[4px] border-[#1e1e24] rounded-3xl p-5 md:p-6 shadow-[6px_6px_0px_rgba(0,0,0,0.3)] flex flex-col gap-4 text-black font-retro">
            
            {/* Timeline Progress Bar */}
            <div className="w-full flex items-center gap-4">
              <span className="text-[11px] text-black font-bold font-mono w-10 text-right select-none">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1 relative flex items-center group h-4">
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
                  className="w-full h-2 bg-[#b8b6bc] rounded-full appearance-none cursor-pointer accent-[#1e1e24] focus:outline-none border-2 border-black"
                  style={{
                    background: `linear-gradient(to right, #4a689d ${
                      duration > 0 ? (currentTime / duration) * 100 : 0
                    }%, #b8b6bc ${duration > 0 ? (currentTime / duration) * 100 : 0}%)`
                  }}
                />
              </div>
              <span className="text-[11px] text-black font-bold font-mono w-10 text-left select-none">
                {formatTime(duration)}
              </span>
            </div>

            {/* Playback Controls (Tactile Button Row) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
              
              {/* Left Display Screen: LCD Indicator */}
              <div className="w-full sm:w-1/3 flex justify-center sm:justify-start items-center">
                {currentTrack ? (
                  <div className="w-full bg-[#121115] border-2 border-[#b8b6bc] rounded-xl px-3 py-2 flex items-center gap-2 shadow-inner overflow-hidden max-w-xs">
                    {/* Glowing LED display dot */}
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0 shadow-[0_0_8px_#f59e0b]" />
                    <span className="text-amber-500 text-xs font-mono tracking-wider truncate uppercase">
                      PLAYING: {currentTrack.title}
                    </span>
                  </div>
                ) : (
                  <div className="w-full bg-[#121115] border-2 border-[#b8b6bc] rounded-xl px-3 py-2 flex items-center gap-2 shadow-inner overflow-hidden max-w-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-600 shrink-0" />
                    <span className="text-zinc-500 text-xs font-mono tracking-wider uppercase">
                      DECK IDLE
                    </span>
                  </div>
                )}
              </div>

              {/* Center control buttons (Tactile pushable bevels) */}
              <div className="flex items-center gap-4 shrink-0">
                {/* Shuffle */}
                <button
                  onClick={() => {
                    const nextVal = !shuffleOn
                    setShuffleOn(nextVal)
                    localStorage.setItem("hv_shuffle", nextVal.toString())
                  }}
                  className={`p-2.5 rounded-xl border-2 border-black transition-all cursor-pointer shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-none ${
                    shuffleOn ? "bg-[#4a689d] text-white" : "bg-white text-black hover:bg-zinc-100"
                  }`}
                  title="Shuffle"
                >
                  <Shuffle className="w-4.5 h-4.5" />
                </button>

                {/* Prev */}
                <button
                  onClick={playPrevTrack}
                  disabled={queue.length === 0}
                  className="p-2.5 rounded-xl bg-white text-black hover:bg-zinc-100 border-2 border-black transition-all cursor-pointer shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-none disabled:opacity-30 disabled:pointer-events-none"
                  title="Previous"
                >
                  <SkipBack className="w-4.5 h-4.5 fill-current" />
                </button>

                {/* Play/Pause (Bevel Master key) */}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={!currentTrackId}
                  className="w-12 h-12 rounded-xl bg-[#e63b3b] text-white hover:bg-[#d82a2a] border-[3px] border-black transition-all cursor-pointer shadow-[3px_3px_0px_black] active:translate-y-0.5 active:shadow-none disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center animate-[pulse_3s_infinite_alternate]"
                  style={{ animationPlayState: isPlaying ? "paused" : "running" }}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                {/* Next */}
                <button
                  onClick={playNextTrack}
                  disabled={queue.length === 0}
                  className="p-2.5 rounded-xl bg-white text-black hover:bg-zinc-100 border-2 border-black transition-all cursor-pointer shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-none disabled:opacity-30 disabled:pointer-events-none"
                  title="Next"
                >
                  <SkipForward className="w-4.5 h-4.5 fill-current" />
                </button>

                {/* Repeat */}
                <button
                  onClick={() => {
                    const cycles: ("off" | "all" | "one")[] = ["off", "all", "one"]
                    const nextIdx = (cycles.indexOf(repeatMode) + 1) % cycles.length
                    const nextVal = cycles[nextIdx]
                    setRepeatMode(nextVal)
                    localStorage.setItem("hv_repeat", nextVal)
                  }}
                  className={`p-2.5 rounded-xl border-2 border-black transition-all cursor-pointer relative shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-none ${
                    repeatMode !== "off" ? "bg-[#4a689d] text-white" : "bg-white text-black hover:bg-zinc-100"
                  }`}
                  title={`Repeat: ${repeatMode}`}
                >
                  <Repeat className="w-4.5 h-4.5" />
                  {repeatMode === "one" && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 text-white text-[8px] rounded-full flex items-center justify-center font-bold border border-black shadow">
                      1
                    </span>
                  )}
                </button>
              </div>

              {/* Right Side: Volume knob / slider */}
              <div className="w-full sm:w-1/4 flex items-center justify-center sm:justify-end gap-3">
                <button
                  onClick={() => {
                    const nextVal = !isMuted
                    setIsMuted(nextVal)
                    localStorage.setItem("hv_muted", nextVal.toString())
                  }}
                  className="p-2 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_black] text-black hover:bg-zinc-100 transition-colors cursor-pointer shrink-0"
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
                
                <div className="w-28 flex items-center h-4 relative">
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
                    className="w-full h-2 bg-[#b8b6bc] rounded-full appearance-none cursor-pointer accent-[#1e1e24] focus:outline-none border-2 border-black"
                    style={{
                      background: `linear-gradient(to right, #4a689d ${
                        isMuted ? 0 : volume
                      }%, #b8b6bc ${isMuted ? 0 : volume}%)`
                    }}
                  />
                </div>
              </div>

            </div>
          </footer>
        </div>
      )}
    </div>
  )
}
