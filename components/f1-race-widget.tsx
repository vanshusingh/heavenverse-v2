"use client"

import { useState, useEffect } from "react"
import { Play } from "lucide-react"
import Image from "next/image"

const drivers = [
  {
    position: 1,
    code: "VER",
    name: "Verstappen",
    team: "Red Bull",
    gap: "Leader",
    tire: "M",
    teamColor: "bg-blue-600",
    logo: "/images/redbull-logo.png",
  },
  { position: 2, code: "PIA", name: "Piastri", team: "McLaren", gap: "+0.785", tire: "M", teamColor: "bg-orange-500" },
  { position: 3, code: "RUS", name: "Russell", team: "Mercedes", gap: "+2.785", tire: "M", teamColor: "bg-gray-400" },
  { position: 4, code: "SAI", name: "Sainz", team: "Ferrari", gap: "+5.785", tire: "H", teamColor: "bg-red-600" },
  { position: 5, code: "NOR", name: "Norris", team: "McLaren", gap: "+0.785", tire: "H", teamColor: "bg-orange-500" },
]

export function F1RaceWidget() {
  const [liveTime, setLiveTime] = useState({ hours: 1, minutes: 29, seconds: 16 })

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime((prev) => {
        let newSeconds = prev.seconds + 1
        let newMinutes = prev.minutes
        let newHours = prev.hours

        if (newSeconds >= 60) {
          newSeconds = 0
          newMinutes += 1
        }
        if (newMinutes >= 60) {
          newMinutes = 0
          newHours += 1
        }

        return { hours: newHours, minutes: newMinutes, seconds: newSeconds }
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatLiveTime = () => {
    return `${liveTime.hours}h:${liveTime.minutes.toString().padStart(2, "0")}m:${liveTime.seconds.toString().padStart(2, "0")}s`
  }

  return (
    <div className="w-80 h-[430px] bg-white/10 backdrop-blur-md border border-white/20 shadow-xl rounded-2xl p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Image src="/images/f1-official-logo.webp" alt="F1 Logo" width={32} height={32} className="w-8 h-8" />
        <span className="text-white font-bold text-lg">RACE</span>
      </div>

      {/* Race Info */}
      <div className="mb-4">
        <h3 className="text-white font-semibold text-lg">Saudi Arabian GP</h3>
        <p className="text-white/70 text-sm">Lap 36 / 50</p>
      </div>

      {/* Driver Standings */}
      <div className="flex-1">
        <div className="space-y-2">
          {drivers.map((driver) => (
            <div key={driver.position} className="flex items-center gap-3 py-2">
              <div className="text-white font-bold text-sm w-4">{driver.position}</div>

              <div className="flex items-center gap-2 flex-1">
                {driver.logo ? (
                  <Image
                    src={driver.logo || "/placeholder.svg"}
                    alt={`${driver.team} logo`}
                    width={20}
                    height={20}
                    className="w-5 h-5"
                  />
                ) : (
                  <div className={`w-5 h-5 rounded-full ${driver.teamColor} flex items-center justify-center`}>
                    {driver.team === "Mercedes" ? (
                      <span className="text-white text-xs font-bold">M</span>
                    ) : driver.team === "Williams" ? (
                      <span className="text-white text-xs font-bold">W</span>
                    ) : driver.team === "Ferrari" ? (
                      <span className="text-white text-xs font-bold">F</span>
                    ) : driver.team === "Alpine" ? (
                      <span className="text-white text-xs font-bold">A</span>
                    ) : driver.team === "RB" ? (
                      <span className="text-white text-xs font-bold">R</span>
                    ) : driver.team === "Haas" ? (
                      <span className="text-white text-xs font-bold">H</span>
                    ) : driver.team === "Aston Martin" ? (
                      <span className="text-white text-xs font-bold">AM</span>
                    ) : driver.team === "Kick Sauber" ? (
                      <span className="text-white text-xs font-bold">K</span>
                    ) : null}
                  </div>
                )}

                <div className="flex-1">
                  <div className="text-white font-semibold text-sm">{driver.code}</div>
                </div>
              </div>

              <div className="text-white/70 text-xs tabular-nums min-w-[60px] text-right">{driver.gap}</div>

              <div
                className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                  driver.tire === "M" ? "bg-yellow-500 text-black" : "bg-red-500 text-white"
                }`}
              >
                {driver.tire}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Watch Live Button */}
      <div className="mt-4 pt-4 border-t border-white/20">
        <button className="w-full bg-gray-700/50 hover:bg-gray-600/50 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2">
          <Play className="w-4 h-4" />
          <span>Watch Live</span>
          <span className="ml-2 font-mono tabular-nums text-sm">{formatLiveTime()}</span>
        </button>
      </div>
    </div>
  )
}
