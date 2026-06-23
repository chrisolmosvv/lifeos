import { useEffect, useState } from 'react'

// Live city + weather for the masthead — the ONLY networked part of the header,
// sealed in here so it can't leak. Two FREE, no-key, HTTPS services:
//   • ipapi.co/json  → approximate city + lat/lon from the connection (no prompt)
//   • open-meteo.com → current temperature + a WMO weather code for that lat/lon
// Returns { city, temp, condition, sunny, loading, error }. Never touches app data.
// On any failure it returns a quiet error and the header simply renders no weather
// rather than guessing. Refreshes every 30 minutes.

// WMO weather code → a short label + whether it reads as a clear/sunny look (the
// masthead dot is terracotta when sunny, muted-grey otherwise).
function describe(code) {
  if (code === 0) return { label: 'Clear', sunny: true }
  if (code === 1) return { label: 'Mostly sunny', sunny: true }
  if (code === 2) return { label: 'Partly cloudy', sunny: false }
  if (code === 3) return { label: 'Overcast', sunny: false }
  if (code === 45 || code === 48) return { label: 'Fog', sunny: false }
  if (code >= 51 && code <= 57) return { label: 'Drizzle', sunny: false }
  if (code >= 61 && code <= 67) return { label: 'Rain', sunny: false }
  if (code >= 71 && code <= 77) return { label: 'Snow', sunny: false }
  if (code >= 80 && code <= 82) return { label: 'Showers', sunny: false }
  if (code >= 85 && code <= 86) return { label: 'Snow showers', sunny: false }
  if (code >= 95) return { label: 'Thunderstorm', sunny: false }
  return { label: 'Cloudy', sunny: false }
}

export function useWeather() {
  const [state, setState] = useState({ loading: true, error: false })

  useEffect(() => {
    let alive = true
    async function run() {
      try {
        const loc = await fetch('https://ipapi.co/json/').then((r) => r.json())
        const { city, latitude, longitude } = loc
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}` +
          `&longitude=${longitude}&current=temperature_2m,weather_code`
        const wx = await fetch(url).then((r) => r.json())
        const { label, sunny } = describe(wx?.current?.weather_code)
        if (alive)
          setState({
            loading: false,
            error: false,
            city,
            temp: Math.round(wx?.current?.temperature_2m),
            condition: label,
            sunny,
          })
      } catch {
        if (alive) setState({ loading: false, error: true })
      }
    }
    run()
    const id = setInterval(run, 30 * 60 * 1000) // refresh every 30 minutes
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  return state
}
