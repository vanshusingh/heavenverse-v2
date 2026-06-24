import { NextRequest, NextResponse } from "next/server"

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"

// Convert wind degrees to cardinal direction
function degreesToDirection(deg: number): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
  const index = Math.round(deg / 22.5) % 16
  return directions[index]
}

// Map WMO weather codes to WeatherAPI-compatible codes for the widget icon mapper
function mapWMOCodeToWeatherAPICode(wmoCode: number): { code: number; text: string } {
  // WMO Weather interpretation codes (WW)
  // https://open-meteo.com/en/docs
  if (wmoCode === 0) return { code: 1000, text: "Clear sky" }
  if (wmoCode === 1) return { code: 1000, text: "Mainly clear" }
  if (wmoCode === 2) return { code: 1003, text: "Partly cloudy" }
  if (wmoCode === 3) return { code: 1009, text: "Overcast" }
  if (wmoCode === 45 || wmoCode === 48) return { code: 1030, text: "Foggy" }
  if (wmoCode === 51) return { code: 1150, text: "Light drizzle" }
  if (wmoCode === 53) return { code: 1153, text: "Moderate drizzle" }
  if (wmoCode === 55) return { code: 1153, text: "Dense drizzle" }
  if (wmoCode === 56 || wmoCode === 57) return { code: 1168, text: "Freezing drizzle" }
  if (wmoCode === 61) return { code: 1183, text: "Light rain" }
  if (wmoCode === 63) return { code: 1189, text: "Moderate rain" }
  if (wmoCode === 65) return { code: 1195, text: "Heavy rain" }
  if (wmoCode === 66 || wmoCode === 67) return { code: 1198, text: "Freezing rain" }
  if (wmoCode === 71) return { code: 1213, text: "Light snow" }
  if (wmoCode === 73) return { code: 1219, text: "Moderate snow" }
  if (wmoCode === 75) return { code: 1225, text: "Heavy snow" }
  if (wmoCode === 77) return { code: 1237, text: "Snow grains" }
  if (wmoCode === 80) return { code: 1240, text: "Light showers" }
  if (wmoCode === 81) return { code: 1243, text: "Moderate showers" }
  if (wmoCode === 82) return { code: 1246, text: "Heavy showers" }
  if (wmoCode === 85 || wmoCode === 86) return { code: 1255, text: "Snow showers" }
  if (wmoCode === 95) return { code: 1087, text: "Thunderstorm" }
  if (wmoCode === 96 || wmoCode === 99) return { code: 1276, text: "Thunderstorm with hail" }
  return { code: 1000, text: "Clear" }
}

// Reverse geocode lat/lon to city name using Open-Meteo's geocoding API
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`,
      {
        headers: { "User-Agent": "HeavenVerseApp/2.0" },
        next: { revalidate: 86400 }, // cache 24h
      }
    )
    if (res.ok) {
      const data = await res.json()
      return data.address?.city || data.address?.town || data.address?.village || data.display_name?.split(",")[0] || "Unknown"
    }
  } catch {}
  return "Unknown"
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lon = searchParams.get("lon")
  const city = searchParams.get("q")

  try {
    let latitude: number
    let longitude: number
    let locationName = "Unknown"

    if (lat && lon) {
      latitude = parseFloat(lat)
      longitude = parseFloat(lon)
      locationName = await reverseGeocode(latitude, longitude)
    } else if (city) {
      // Geocode city name to lat/lon
      const geoRes = await fetch(
        `${GEOCODING_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
        { next: { revalidate: 86400 } }
      )
      if (!geoRes.ok) {
        return NextResponse.json({ error: "Failed to geocode city" }, { status: 400 })
      }
      const geoData = await geoRes.json()
      if (!geoData.results || geoData.results.length === 0) {
        return NextResponse.json({ error: "City not found" }, { status: 404 })
      }
      latitude = geoData.results[0].latitude
      longitude = geoData.results[0].longitude
      locationName = geoData.results[0].name || city
    } else {
      // Fallback: IP-based geolocation
      try {
        const ipRes = await fetch("http://ip-api.com/json/?fields=lat,lon,city", {
          next: { revalidate: 3600 },
        })
        if (ipRes.ok) {
          const ipData = await ipRes.json()
          latitude = ipData.lat
          longitude = ipData.lon
          locationName = ipData.city || "Unknown"
        } else {
          // Ultimate fallback: Delhi
          latitude = 28.6139
          longitude = 77.209
          locationName = "Delhi"
        }
      } catch {
        latitude = 28.6139
        longitude = 77.209
        locationName = "Delhi"
      }
    }

    // Fetch current weather from Open-Meteo
    const weatherUrl = `${OPEN_METEO_URL}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,surface_pressure,visibility&wind_speed_unit=kmh&timezone=auto`

    const response = await fetch(weatherUrl, {
      next: { revalidate: 600 }, // cache 10 minutes
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error")
      console.error("Open-Meteo error:", response.status, errorText)
      return NextResponse.json(
        { error: "Failed to fetch weather data" },
        { status: response.status }
      )
    }

    const data = await response.json()
    const current = data.current

    if (!current) {
      return NextResponse.json({ error: "No current weather data" }, { status: 500 })
    }

    const wmoCode = current.weather_code ?? 0
    const condition = mapWMOCodeToWeatherAPICode(wmoCode)
    const tempC = current.temperature_2m ?? 0
    const feelslikeC = current.apparent_temperature ?? 0
    const windKph = current.wind_speed_10m ?? 0
    const visibilityM = current.visibility ?? 10000

    // Normalize to the shape the widget expects
    const weather = {
      location: {
        name: locationName,
        region: "",
        country: "",
        localtime: new Date().toISOString(),
      },
      current: {
        temp_c: Math.round(tempC * 10) / 10,
        temp_f: Math.round((tempC * 9 / 5 + 32) * 10) / 10,
        feelslike_c: Math.round(feelslikeC * 10) / 10,
        feelslike_f: Math.round((feelslikeC * 9 / 5 + 32) * 10) / 10,
        humidity: current.relative_humidity_2m ?? 0,
        wind_kph: Math.round(windKph * 10) / 10,
        wind_mph: Math.round(windKph * 0.621 * 10) / 10,
        wind_dir: degreesToDirection(current.wind_direction_10m ?? 0),
        pressure_mb: Math.round(current.surface_pressure ?? 0),
        uv: 0,
        vis_km: Math.round(visibilityM / 100) / 10,
        cloud: current.cloud_cover ?? 0,
        condition: {
          text: condition.text,
          icon: "",
          code: condition.code,
        },
        is_day: current.is_day ?? 1,
      },
    }

    return NextResponse.json(weather)
  } catch (err) {
    console.error("Weather fetch error:", err)
    return NextResponse.json(
      { error: "Internal server error while fetching weather" },
      { status: 500 }
    )
  }
}
