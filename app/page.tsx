"use client"

import Link from "next/link"
import Image from "next/image"
import { Play, Shield, FolderUp, ListMusic, Volume2, ArrowRight } from "lucide-react"
import dynamic from "next/dynamic"

const FlowingMenu = dynamic(() => import("@/components/FlowingMenu"), { ssr: false })

export default function LandingPage() {
  return (
    <div
      className="min-h-screen retro-grid flex flex-col justify-between p-6 md:p-12 relative overflow-x-hidden select-none font-sans"
    >
      {/* Header */}
      <header className="z-10 w-full max-w-6xl mx-auto flex items-center justify-between bg-[#e2e1e6] dark:bg-[#020617] border-[3px] border-black dark:border-[#334155] shadow-[4px_4px_0px_rgba(0,0,0,0.35)] rounded-2xl px-6 py-4 text-black dark:text-slate-100">
        <div className="flex items-center gap-3">
          <Image
            src="/images/hv-logo.svg"
            alt="HV Logo"
            width={74}
            height={24}
            className="object-contain"
          />
          <span className="text-black dark:text-slate-100 font-retro font-bold tracking-[0.2em] text-[12px] uppercase">HeavenVerse V2</span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center my-auto py-12 md:py-16">


        {/* Hero Title */}
        <h1 className="text-5xl md:text-8xl font-pixel text-white uppercase tracking-wider leading-tight max-w-4xl drop-shadow-[5px_5px_0px_rgba(0,0,0,0.4)]">
          Keep it local. <span className="text-red-400">Keep it private.</span> Keep it loud.
        </h1>

        {/* Subtitle */}
        <p className="text-white/80 text-xs md:text-sm font-retro max-w-xl mt-6 leading-relaxed">
          HeavenVerse V2 is a private local music player that runs in your browser, plays your files, and keeps your listening experience clean, fast, and 100% offline-first. No accounts, no servers, zero trackers.
        </p>

        {/* CTA Button */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/player" className="group relative px-8 py-4 bg-[#e63b3b] hover:bg-[#d82a2a] text-white font-retro font-bold rounded-2xl text-sm uppercase tracking-wider flex items-center gap-2.5 shadow-[4px_4px_0px_black] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer border-2 border-black dark:border-[#334155]">
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Open Player</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full mt-20">
          {[
            {
              icon: <FolderUp className="w-6 h-6 text-black dark:text-slate-100" />,
              title: "Local Import",
              desc: "Drag & drop files or choose directories. Songs are stored in your local sandbox."
            },
            {
              icon: <Shield className="w-6 h-6 text-black dark:text-slate-100" />,
              title: "Privacy Locked",
              desc: "No online databases or cloud sync. Your data stays entirely on your physical storage."
            },
            {
              icon: <ListMusic className="w-6 h-6 text-black dark:text-slate-100" />,
              title: "Smart Playlists",
              desc: "Organize custom local playlists. Save queue, tracks list, and preferences automatically."
            },
            {
              icon: <Volume2 className="w-6 h-6 text-black dark:text-slate-100" />,
              title: "Canvas Visualizer",
              desc: "Real-time equalizer spectrum visualizer dancing to the rhythm on a Canvas element."
            }
          ].map((feat, i) => (
            <div
              key={i}
              className="bg-[#f9f8fa] border-[3px] border-black dark:border-[#334155] shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-3xl p-6 text-left flex flex-col gap-3.5 hover:translate-y-[-4px] transition-transform text-black dark:text-slate-100 font-retro"
            >
              <div className="p-3 bg-[#e2e1e6] dark:bg-[#020617] border-2 border-black dark:border-[#334155] rounded-2xl w-fit">
                {feat.icon}
              </div>
              <h3 className="font-bold text-sm tracking-wide uppercase text-black dark:text-slate-100">{feat.title}</h3>
              <p className="text-black/60 text-[11px] leading-relaxed font-semibold">{feat.desc}</p>
            </div>
          ))}
        </div>

        {/* Navigation Menu Showcase */}
        <div className="w-full max-w-4xl mx-auto mt-20 border-[3px] border-black dark:border-[#334155] rounded-3xl overflow-hidden shadow-[6px_6px_0px_rgba(0,0,0,0.3)] bg-[#e2e1e6] dark:bg-[#020617] font-retro text-black dark:text-slate-100">
          <div className="px-6 py-4 border-b-2 border-black dark:border-[#334155] flex items-center justify-between bg-[#d5d4d9]">
            <span className="font-bold tracking-wider text-[10px] uppercase">Interactive Shortcuts</span>
            <span className="text-xs text-black/50">Hover to preview</span>
          </div>
          <div style={{ height: '320px', position: 'relative' }}>
            <FlowingMenu
              items={[
                { link: '/player', text: 'Music Player', image: '/images/karan-aujla-album.png' },
                { link: '/player', text: 'Converter Studio', image: '/images/making-memories-album.jpg' }
              ]}
              speed={12}
              bgColor="transparent"
              textColor="#000000"
              marqueeBgColor="#e63b3b"
              marqueeTextColor="#ffffff"
              borderColor="rgba(0, 0, 0, 0.15)"
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="z-10 w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 mt-8 bg-[#e2e1e6] dark:bg-[#020617] border-2 border-black dark:border-[#334155] rounded-2xl px-6 py-4 text-xs text-black dark:text-slate-100 font-retro shadow-[3px_3px_0px_rgba(0,0,0,0.15)]">
        <p className="font-medium">
          Designed and Developed with <span className="text-red-500 animate-pulse inline-block">❤️</span> by{" "}
          <span className="text-black dark:text-slate-100 font-semibold">Vansh</span>
        </p>
        <p className="font-medium">HeavenVerse © 2026. All rights reserved.</p>
      </footer>
    </div>
  )
}
