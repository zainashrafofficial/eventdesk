/** WMO weather interpretation codes used by Open-Meteo -> human label + icon key. */
export type WeatherIcon = "sun" | "moon" | "partly" | "cloud" | "fog" | "drizzle" | "rain" | "snow" | "storm";

export function describeWeather(code: number, isDay = true): { label: string; icon: WeatherIcon } {
  if (code === 0) return { label: "Clear sky", icon: isDay ? "sun" : "moon" };
  if (code === 1) return { label: "Mainly clear", icon: isDay ? "sun" : "moon" };
  if (code === 2) return { label: "Partly cloudy", icon: "partly" };
  if (code === 3) return { label: "Overcast", icon: "cloud" };
  if (code === 45 || code === 48) return { label: "Fog", icon: "fog" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", icon: "drizzle" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return { label: code >= 80 ? "Rain showers" : "Rain", icon: "rain" };
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: "Snow", icon: "snow" };
  if (code >= 95) return { label: "Thunderstorm", icon: "storm" };
  return { label: "Unknown", icon: "cloud" };
}
