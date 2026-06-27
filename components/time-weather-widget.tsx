"use client"

import { useState, useEffect, useCallback } from "react"
import {
  RefreshCw,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Wind,
  CloudDrizzle,
  CloudLightning,
  CloudFog,
  Droplets,
  Eye,
  Thermometer,
  MapPin,
  FolderUp,
  Loader2,
  CloudSun,
  Moon,
  CloudMoon,
} from "lucide-react"

interface WeatherData {
  location: {
    name: string
    region: string
    country: string
    localtime: string
  }
  current: {
    temp_c: number
    temp_f: number
    feelslike_c: number
    feelslike_f: number
    humidity: number
    wind_kph: number
    wind_mph: number
    wind_dir: string
    pressure_mb: number
    uv: number
    vis_km: number
    cloud: number
    condition: {
      text: string
      icon: string
      code: number
    }
    is_day: number
  }
}

interface TimeWeatherWidgetProps {
  onAddFiles?: (files: File[]) => void
}

// Map WeatherAPI condition codes to lucide icons and colors
function getWeatherVisuals(code: number, isDay: boolean) {
  // Sunny / Clear
  if (code === 1000) {
    return isDay
      ? { icon: Sun, color: "text-amber-600", glow: "", bg: "bg-[#e2e1e6] border-2 border-black" }
      : { icon: Moon, color: "text-indigo-800", glow: "", bg: "bg-[#e2e1e6] border-2 border-black" }
  }
  // Partly cloudy
  if (code === 1003) {
    return isDay
      ? { icon: CloudSun, color: "text-amber-600", glow: "", bg: "bg-[#e2e1e6] border-2 border-black" }
      : { icon: CloudMoon, color: "text-indigo-800", glow: "", bg: "bg-[#e2e1e6] border-2 border-black" }
  }
  // Cloudy / Overcast
  if (code === 1006 || code === 1009) {
    return { icon: Cloud, color: "text-zinc-700", glow: "", bg: "bg-[#e2e1e6] border-2 border-black" }
  }
  // Mist / Fog
  if (code === 1030 || code === 1135 || code === 1147) {
    return { icon: CloudFog, color: "text-zinc-600", glow: "", bg: "bg-[#e2e1e6] border-2 border-black" }
  }
  // Drizzle / Light rain
  if ([1063, 1150, 1153, 1168, 1171, 1180, 1183].includes(code)) {
    return { icon: CloudDrizzle, color: "text-sky-700", glow: "", bg: "bg-[#e2e1e6] border-2 border-black" }
  }
  // Rain / Heavy rain
  if ([1186, 1189, 1192, 1195, 1198, 1201, 1240, 1243, 1246].includes(code)) {
    return { icon: CloudRain, color: "text-blue-700", glow: "", bg: "bg-[#e2e1e6] border-2 border-black" }
  }
  // Snow
  if ([1066, 1069, 1072, 1114, 1117, 1204, 1207, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1249, 1252, 1255, 1258, 1261, 1264].includes(code)) {
    return { icon: Snowflake, color: "text-sky-600", glow: "", bg: "bg-[#e2e1e6] border-2 border-black" }
  }
  // Thunderstorm
  if ([1087, 1273, 1276, 1279, 1282].includes(code)) {
    return { icon: CloudLightning, color: "text-amber-700", glow: "", bg: "bg-[#e2e1e6] border-2 border-black" }
  }
  // Default — windy / other
  return { icon: Wind, color: "text-teal-700", glow: "", bg: "bg-[#e2e1e6] border-2 border-black" }
}

export function TimeWeatherWidget({ onAddFiles }: TimeWeatherWidgetProps) {
  const [mounted, setMounted] = useState(false)
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchWeather = useCallback(async () => {
    setWeatherLoading(true)
    setWeatherError(null)

    try {
      // Try to get user's geolocation
      let url = "/api/weather"
      if ("geolocation" in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: false,
              maximumAge: 300000, // 5 min cache
            })
          })
          url = `/api/weather?lat=${position.coords.latitude}&lon=${position.coords.longitude}`
        } catch {
          // Geolocation denied/unavailable, fallback to IP-based
        }
      }

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Weather API returned ${response.status}`)
      }

      const data: WeatherData = await response.json()
      setWeather(data)
      setLastRefresh(new Date())
    } catch (err) {
      console.warn("Failed to fetch weather:", err instanceof Error ? err.message : err)
      setWeatherError("Unable to load weather")
    } finally {
      setWeatherLoading(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    // Fetch weather on mount
    fetchWeather()

    // Auto-refresh weather every 15 minutes
    const weatherInterval = setInterval(fetchWeather, 15 * 60 * 1000)

    return () => {
      clearInterval(timer)
      clearInterval(weatherInterval)
    }
  }, [fetchWeather])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

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
      if (file.type.startsWith("audio/")) {
        setUploadedFile(file.name)
        if (onAddFiles) {
          onAddFiles([file])
        }
        setTimeout(() => setUploadedFile(null), 4000)
      } else {
        setUploadedFile("Error: Audio files only")
        setTimeout(() => setUploadedFile(null), 3000)
      }
    }
  }

  const handleFileSelect = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "audio/*"
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      if (target.files && target.files[0]) {
        const file = target.files[0]
        setUploadedFile(file.name)
        if (onAddFiles) {
          onAddFiles([file])
        }
        setTimeout(() => setUploadedFile(null), 4000)
      }
    }
    input.click()
  }

  if (!mounted) {
    return (
      <div className="w-full max-w-[340px] h-[520px] bg-white/10 dark:bg-[#0e1622]/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl rounded-3xl p-6 flex items-center justify-center">
        <span className="text-white/60 text-sm animate-pulse">Loading dashboard...</span>
      </div>
    )
  }

  const isDay = weather?.current?.is_day ?? 1
  const visuals = weather
    ? getWeatherVisuals(weather.current.condition.code, isDay === 1)
    : { icon: Sun, color: "text-amber-600", glow: "", bg: "bg-[#e2e1e6] border-2 border-black" }
  const WeatherIcon = visuals.icon

  return (
    <div className="w-full max-w-[340px] h-[520px] bg-[#f9f8fa] border-[3px] border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-[2rem] p-6 flex flex-col justify-between hover:translate-y-[-2px] transition-transform text-black font-retro">
      
      {/* Clock Section */}
      <div>
        <div className="text-3xl font-bold font-mono tracking-tight tabular-nums text-black">
          {formatTime(currentTime).toUpperCase()}
        </div>
        <div className="text-[11px] text-black/60 mt-1">
          {formatDate(currentTime)}
        </div>
      </div>

      {/* Weather Section */}
      <div className="border-t-2 border-dashed border-black/20 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <h3 className="text-black/50 text-[11px] font-bold tracking-wider uppercase">Weather</h3>
            {weather && (
              <div className="flex items-center gap-1 text-[9px] text-black/60">
                <MapPin className="w-2.5 h-2.5" />
                <span className="truncate max-w-[120px]">{weather.location.name}</span>
              </div>
            )}
          </div>
          <button
            onClick={fetchWeather}
            disabled={weatherLoading}
            className="p-1 rounded-lg bg-white border-2 border-black shadow-[1.5px_1.5px_0px_black] active:translate-y-0.5 active:shadow-none text-black hover:bg-zinc-100 transition-all cursor-pointer disabled:opacity-30"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${weatherLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {weatherLoading && !weather ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-black/40" />
          </div>
        ) : weatherError && !weather ? (
          <div className="py-4 text-center">
            <span className="text-[10px] text-black/50 italic">{weatherError}</span>
            <button
              onClick={fetchWeather}
              className="block mx-auto mt-2 text-[10px] text-black/70 hover:text-black font-bold underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : weather ? (
          <>
            <div className={`flex items-center gap-4 p-3 rounded-2xl ${visuals.bg} transition-all duration-500`}>
              <div className="relative">
                <WeatherIcon className={`w-12 h-12 ${visuals.color} transition-all duration-500`} />
                {weatherLoading && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-sky-500 rounded-full animate-pulse" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-black/50 font-bold uppercase">{weather.current.condition.text}</span>
                <span className="text-2xl font-bold text-black tracking-tight">
                  {Math.round(weather.current.temp_c)}°C
                </span>
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-black/50 font-semibold flex items-center gap-1.5">
                  <Thermometer className="w-3 h-3" /> Feels like
                </span>
                <span className="text-black font-mono font-bold tabular-nums">
                  {Math.round(weather.current.feelslike_c)}°C
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-black/50 font-semibold flex items-center gap-1.5">
                  <Droplets className="w-3 h-3" /> Humidity
                </span>
                <span className="text-black font-mono font-bold tabular-nums">
                  {weather.current.humidity}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-black/50 font-semibold flex items-center gap-1.5">
                  <Wind className="w-3 h-3" /> Wind
                </span>
                <span className="text-black font-mono font-bold tabular-nums">
                  {Math.round(weather.current.wind_kph)} km/h {weather.current.wind_dir}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-black/50 font-semibold flex items-center gap-1.5">
                  <Eye className="w-3 h-3" /> Visibility
                </span>
                <span className="text-black font-mono font-bold tabular-nums">
                  {weather.current.vis_km} km
                </span>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Upload from Local Section */}
      <div className="border-t-2 border-dashed border-black/20 pt-4">
        <h3 className="text-black text-xs font-bold uppercase">Upload from Local</h3>
        <p className="text-[10px] text-black/50 font-normal mt-0.5 leading-tight">
          Upload your songs and stream anywhere
        </p>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleFileSelect}
          className={`border-2 border-dashed rounded-xl p-3 flex items-center justify-center gap-3 mt-2.5 cursor-pointer transition-all duration-300 ${
            isDragging
              ? "border-black bg-[#c2c0c5]"
              : "border-black/30 bg-[#d5d4d9] hover:bg-[#c2c0c5] hover:border-black"
          }`}
        >
          <FolderUp className="w-5 h-5 text-black/50 shrink-0" />
          <span className="text-[10px] text-black/60 font-semibold leading-normal select-none">
            {uploadedFile ? (
              <span className="text-black font-bold truncate max-w-[200px] block">
                {uploadedFile}
              </span>
            ) : (
              "Drag & drop your files here or click to browse"
            )}
          </span>
        </div>
      </div>

    </div>
  )
}
