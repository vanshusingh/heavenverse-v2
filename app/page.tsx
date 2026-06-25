"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Play, Shield, FolderUp, ListMusic, Volume2, Sparkles, Sun, Moon, ArrowRight } from "lucide-react"
import { useTheme } from "next-themes"
import dynamic from "next/dynamic"

const FlowingMenu = dynamic(() => import("@/components/FlowingMenu"), { ssr: false })

export default function LandingPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const renderThemeToggle = () => {
    if (!mounted) return <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse" />
    const isDark = theme === "dark"
    return (
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="p-3 bg-white/10 dark:bg-[#0e1622]/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl rounded-2xl hover:bg-white/15 dark:hover:bg-[#0e1622]/50 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer text-white flex items-center justify-center w-11 h-11 animate-fade-in"
        title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
      >
        {isDark ? (
          <Sun className="w-5 h-5 text-yellow-400 shrink-0" />
        ) : (
          <Moon className="w-5 h-5 text-indigo-400 shrink-0" />
        )}
      </button>
    )
  }

  return (
    <div
      className="min-h-screen bg-[#020202] bg-gradient-to-br from-[#0d0d0d] via-[#050505] to-[#000000] bg-cover bg-center bg-no-repeat flex flex-col justify-between p-6 md:p-12 relative overflow-x-hidden select-none font-sans"
      style={{
        backgroundImage: "url('/images/bgg1.jpg')",
      }}
    >
      {/* Background overlay for richer contrast */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/75 pointer-events-none transition-all duration-500" />



      {/* Header */}
      <header className="z-10 w-full max-w-6xl mx-auto flex items-center justify-between bg-black/40 border border-white/10 shadow-2xl rounded-2xl px-6 py-4 transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center p-1.5 shadow-md">
            <Image
              src="/images/hv-logo.png"
              alt="HV Logo"
              width={24}
              height={24}
              className="object-contain animate-pulse"
            />
          </div>
          <span className="text-white font-bold tracking-[0.2em] text-[12px] uppercase">HeavenVerse V2</span>
        </div>
        {renderThemeToggle()}
      </header>

      {/* Hero Section */}
      <main className="z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center my-auto py-12 md:py-16">
        {/* Animated Version Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/5 border border-white/15 backdrop-blur-md rounded-full text-white/90 text-[10px] uppercase font-bold tracking-widest mb-6 shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-red-500 animate-spin-slow" />
          <span>Version 2.0 • Browser Offline Edition</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-3xl">
          Your Music. <span className="bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(226,0,21,0.25)]">Your Privacy.</span> Offline-First.
        </h1>

        {/* Subtitle */}
        <p className="text-white/60 text-sm md:text-base font-medium max-w-xl mt-6 leading-relaxed">
          HeavenVerse V2 is a private local music player that runs in your browser, plays your files, and keeps your listening experience clean, fast, and 100% offline-first. No accounts, no servers, zero trackers.
        </p>

        {/* CTA Button */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/player" className="group relative px-8 py-4 bg-white hover:bg-white/95 text-black font-bold rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2.5 shadow-xl shadow-red-950/20 transition-all hover:scale-105 active:scale-95 cursor-pointer overflow-hidden border border-white/10">
            <Play className="w-3.5 h-3.5 fill-current transition-transform group-hover:scale-110" />
            <span>Open Player</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full mt-20">
          {[
            {
              icon: <FolderUp className="w-6 h-6 text-red-600 drop-shadow-[0_0_8px_rgba(226,0,21,0.4)]" />,
              title: "Local Import",
              desc: "Drag & drop files or choose directories. Songs are stored in your local sandbox."
            },
            {
              icon: <Shield className="w-6 h-6 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />,
              title: "Privacy Locked",
              desc: "No online databases or cloud sync. Your data stays entirely on your physical storage."
            },
            {
              icon: <ListMusic className="w-6 h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />,
              title: "Smart Playlists",
              desc: "Organize custom local playlists. Save queue, tracks list, and preferences automatically."
            },
            {
              icon: <Volume2 className="w-6 h-6 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.4)]" />,
              title: "Canvas Visualizer",
              desc: "Real-time equalizer spectrum visualizer dancing to the rhythm on a Canvas element."
            }
          ].map((feat, i) => (
            <div
              key={i}
              className="bg-black/50 dark:bg-black/35 border border-white/10 shadow-lg rounded-2xl p-6 text-left flex flex-col gap-3.5 hover:bg-black/60 dark:hover:bg-black/45 transition-all duration-300 hover:translate-y-[-4px] hover:border-red-950/40"
            >
              <div className="p-3 bg-white/5 rounded-xl w-fit">
                {feat.icon}
              </div>
              <h3 className="text-white font-bold text-sm tracking-wide">{feat.title}</h3>
              <p className="text-white/40 text-[10.5px] leading-relaxed font-medium">{feat.desc}</p>
            </div>
          ))}
        </div>

        {/* Navigation Menu Showcase */}
        <div className="w-full max-w-4xl mx-auto mt-20 border border-white/10 rounded-2xl overflow-hidden shadow-2xl bg-black/50 dark:bg-black/35 backdrop-blur-xl">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <span className="text-white/60 font-semibold tracking-wider text-[10px] uppercase">Interactive Shortcuts</span>
            <span className="text-xs text-white/40">Hover to preview</span>
          </div>
          <div style={{ height: '320px', position: 'relative' }}>
            <FlowingMenu
              items={[
                { link: '/player', text: 'Music Player', image: '/images/karan-aujla-album.png' },
                { link: '/player', text: 'Converter Studio', image: '/images/making-memories-album.jpg' }
              ]}
              speed={12}
              bgColor="transparent"
              textColor="#ffffff"
              marqueeBgColor="#e20015"
              marqueeTextColor="#ffffff"
              borderColor="rgba(226, 0, 21, 0.15)"
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="z-10 w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 mt-8 bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white/50">
        <p className="font-medium">
          Designed and Developed with <span className="text-red-500 animate-pulse inline-block">❤️</span> by{" "}
          <span className="text-white font-semibold">Vansh</span>
        </p>
        <p className="font-medium">HeavenVerse © 2026. All rights reserved.</p>
      </footer>
    </div>
  )
}
