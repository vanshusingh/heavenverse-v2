"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ShoppingCart, Menu, X, BarChart3, Heart } from "lucide-react"

// Boomerang Video Loop component
function BoomerangVideoBg() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [frames, setFrames] = useState<HTMLCanvasElement[]>([])
  const [isVideoFinished, setIsVideoFinished] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const capturedFrames: HTMLCanvasElement[] = []
    let isCapturing = true

    const captureFrame = () => {
      if (!isCapturing) return

      // Create an off-screen canvas to copy the video frame
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (ctx && video.videoWidth > 0) {
        // scale proportionally, max width 960px
        const maxWidth = 960
        const scale = Math.min(1, maxWidth / video.videoWidth)
        canvas.width = video.videoWidth * scale
        canvas.height = video.videoHeight * scale

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        capturedFrames.push(canvas)
      }

      if (typeof (video as any).requestVideoFrameCallback === "function") {
        (video as any).requestVideoFrameCallback(captureFrame)
      } else {
        requestAnimationFrame(captureFrame)
      }
    }

    if (typeof (video as any).requestVideoFrameCallback === "function") {
      (video as any).requestVideoFrameCallback(captureFrame)
    } else {
      video.addEventListener("play", () => {
        const loop = () => {
          const v = video as HTMLVideoElement
          if (!v.paused && !v.ended) {
            captureFrame()
            requestAnimationFrame(loop)
          }
        }
        requestAnimationFrame(loop)
      })
    }

    const handleEnded = () => {
      isCapturing = false
      if (capturedFrames.length > 0) {
        setFrames(capturedFrames)
        setIsVideoFinished(true)
      }
    };

    video.addEventListener("ended", handleEnded)

    // Start loading and playing
    video.muted = true
    video.playsInline = true
    video.crossOrigin = "anonymous"
    video.play().catch((err) => {
      console.warn("Autoplay block or video load failed:", err)
    })

    return () => {
      isCapturing = false
      video.removeEventListener("ended", handleEnded)
    }
  }, [])

  // Handle the boomerang playback at 30fps
  useEffect(() => {
    if (!isVideoFinished || frames.length === 0) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let currentIndex = 0
    let currentDir = 1
    let lastTime = 0
    const interval = 1000 / 30 // 30fps ~ 33.3ms
    let animationId: number

    const renderLoop = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp
      const elapsed = timestamp - lastTime

      if (elapsed >= interval) {
        lastTime = timestamp - (elapsed % interval)

        // Draw the frame
        const frameCanvas = frames[currentIndex]
        if (frameCanvas) {
          canvas.width = frameCanvas.width
          canvas.height = frameCanvas.height
          ctx.drawImage(frameCanvas, 0, 0)
        }

        // Update index for next frame in ping-pong loop
        let nextIndex = currentIndex + currentDir
        if (nextIndex >= frames.length) {
          nextIndex = Math.max(0, frames.length - 2)
          currentDir = -1
        } else if (nextIndex < 0) {
          nextIndex = Math.min(frames.length - 1, 1)
          currentDir = 1
        }
        currentIndex = nextIndex
      }

      animationId = requestAnimationFrame(renderLoop)
    }

    animationId = requestAnimationFrame(renderLoop)

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [isVideoFinished, frames])

  return (
    <div className="absolute inset-0 z-0 scale-[1.08] origin-center overflow-hidden">
      <video
        ref={videoRef}
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260611_183632_c311af08-e4b7-458f-81e7-79847a49b3d3.mp4"
        style={{ display: isVideoFinished ? "none" : "block" }}
        className="w-full h-full object-cover"
        muted
        playsInline
        crossOrigin="anonymous"
      />
      {isVideoFinished && (
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover"
        />
      )}
    </div>
  )
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLiked, setIsLiked] = useState(false)

  return (
    <div className="relative h-screen w-full overflow-hidden font-helvetica bg-black text-white select-none">
      
      {/* Background Boomerang Video Loop */}
      <BoomerangVideoBg />

      {/* Dark tint overlay for better readability */}
      <div className="absolute inset-0 bg-black/10 z-[1] pointer-events-none" />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 md:px-10 md:py-6">
        
        {/* Logo */}
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 fill-white" viewBox="0 0 256 256">
            <path d="M 256 256 L 128 256 C 198.692 256 256 198.692 256 128 C 256 57.308 198.692 0 128 0 C 57.308 0 0 57.308 0 128 C 0 198.692 57.308 256 128 256 L 0 256 L 0 0 L 256 0 Z M 128 104 C 141.255 104 152 114.745 152 128 C 152 141.255 141.255 152 128 152 C 114.745 152 104 141.255 104 128 C 104 114.745 114.745 104 128 104 Z" />
          </svg>
          <span className="text-base tracking-tight text-white font-bold">quietpress</span>
        </div>

        {/* Center Nav Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-8">
          {["Anthology", "Talents", "Sound diary", "Playback salon"].map((link) => (
            <a
              key={link}
              href="#"
              className="text-sm font-medium text-white/90 hover:text-white transition-colors duration-200"
            >
              {link}
            </a>
          ))}
        </nav>

        {/* Right Header Panel */}
        <div className="flex items-center gap-3">
          {/* Cart Pill */}
          <button className="flex items-center gap-2 rounded-xl bg-white p-1 pr-3 sm:pr-4 hover:scale-105 active:scale-95 transition-transform duration-200 shadow-lg cursor-pointer">
            <div className="h-7 w-7 rounded-lg bg-blue-700 flex items-center justify-center text-white shrink-0">
              <ShoppingCart className="w-3.5 h-3.5" strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold text-gray-900">
              <span className="hidden sm:inline">Cart </span>(0)
            </span>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden h-9 w-9 rounded-xl liquid-glass flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
          </button>
        </div>
      </header>

      {/* Mobile Nav Dropdown */}
      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 z-30 mx-4 rounded-2xl p-2 liquid-glass md:hidden animate-fade-in flex flex-col gap-1">
          {["Anthology", "Talents", "Sound diary", "Playback salon"].map((link) => (
            <a
              key={link}
              href="#"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-semibold text-white/90 hover:bg-white/10 transition-colors"
            >
              {link}
            </a>
          ))}
        </div>
      )}

      {/* Hero Content Area */}
      <main className="relative z-10 h-full flex flex-col justify-start items-center text-center pt-28 sm:pt-36 md:pt-44 px-4 sm:px-6">
        
        {/* Tag Badge */}
        <div className="animate-fade-up delay-1 mb-5 sm:mb-6 rounded-lg px-4 py-1.5 text-xs sm:text-sm text-white font-medium shadow-sm liquid-glass" style={{ background: "rgba(255, 255, 255, 0.16)" }}>
          Press 04 . Vernal woods
        </div>

        {/* Title Headline */}
        <h1 className="animate-fade-up delay-2 max-w-3xl text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-white select-none">
          records cut for the<br />calm listener.
        </h1>

        {/* Subtext */}
        <p className="animate-fade-up delay-3 mt-5 sm:mt-6 max-w-md text-sm sm:text-base md:text-lg leading-relaxed text-white/90 font-medium">
          Drone, roots, and nature-captured sound on wax LPs. Every disc cut just once, snag it or miss.
        </p>

        {/* Action Buttons */}
        <div className="animate-fade-up delay-4 mt-8 flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto px-6 sm:px-0">
          <Link
            href="/player"
            className="rounded-xl bg-white px-7 py-2.5 text-sm font-bold text-gray-900 hover:scale-105 active:scale-95 transition-transform duration-200 shadow-md text-center"
          >
            Browse the shelves
          </Link>
          <button className="liquid-glass rounded-xl px-7 py-2.5 text-sm font-bold text-white hover:scale-105 active:scale-95 transition-transform duration-200 text-center cursor-pointer">
            Newest arrivals
          </button>
        </div>

      </main>

      {/* Now Playing Widget */}
      <section className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 md:bottom-8 md:right-10 z-20 max-w-[270px] sm:w-72 flex flex-col gap-2.5 animate-fade-up delay-5">
        
        {/* Track Card */}
        <div className="rounded-2xl bg-white p-2.5 pr-4 shadow-xl flex items-center gap-3">
          {/* Cover Art / Icon block */}
          <div className="h-11 w-11 rounded-xl bg-blue-700 flex items-center justify-center text-white shrink-0 shadow-md">
            <BarChart3 className="w-5 h-5 animate-pulse" strokeWidth={2.5} />
          </div>

          {/* Track details and progress bar */}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-gray-900 truncate">Helia Marsh</span>
              <span className="text-[10px] font-semibold text-gray-500 truncate">Fern Light</span>
            </div>
            {/* Progress line */}
            <div className="flex flex-col gap-1">
              <div className="h-1 w-full rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full w-[30%] bg-blue-700 rounded-full" />
              </div>
              <div className="flex justify-between text-[9px] font-bold text-gray-400 font-mono tracking-tight">
                <span>0:33</span>
                <span>-1:21</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex gap-2">
          <button className="flex-1 rounded-2xl bg-white py-2 text-xs font-bold text-gray-900 shadow-md hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer">
            Prev
          </button>
          
          <button
            onClick={() => setIsLiked(!isLiked)}
            className="h-10 w-10 rounded-full bg-white shadow-md hover:scale-110 active:scale-95 transition-transform duration-200 flex items-center justify-center cursor-pointer shrink-0"
          >
            <Heart 
              className={`w-4 h-4 text-blue-700 transition-colors ${isLiked ? "fill-blue-700" : ""}`} 
              strokeWidth={2.5}
            />
          </button>

          <button className="flex-1 rounded-2xl bg-white py-2 text-xs font-bold text-gray-900 shadow-md hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer">
            Next
          </button>
        </div>

      </section>

    </div>
  )
}
