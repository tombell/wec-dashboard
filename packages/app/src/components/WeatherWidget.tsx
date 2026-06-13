import type { WeatherData } from "@/types";

const WEATHER_ICONS: Record<string, string> = {
  sunny: "☀️",
  mostly_sunny: "🌤️",
  cloudy: "☁️",
  partly_cloudy: "⛅",
  clear_day: "☀️",
  clear_night: "🌙",
  rain: "🌧️",
  sleet: "🌨️",
  snow: "❄️",
};

export default function WeatherWidget({ weather }: { weather: WeatherData }) {
  const icon = WEATHER_ICONS[weather.condition] || "🌡️";

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs sm:text-sm">
      <span className="text-lg leading-none" title={weather.condition}>{icon}</span>
      <span className="text-muted">Air:</span>
      <span className="font-semibold tabular-nums">{Math.round(weather.air_temp)}&deg;C</span>
      <span className="text-muted">Track:</span>
      <span className="font-semibold tabular-nums">{Math.round(weather.track_temp)}&deg;C</span>
      <span className="text-muted hidden sm:inline">Humidity:</span>
      <span className="tabular-nums hidden sm:inline">{weather.humidity}%</span>
      <span className="text-muted hidden md:inline">Pressure:</span>
      <span className="tabular-nums hidden md:inline">{weather.pressure} hPa</span>
      <span className="text-muted hidden lg:inline">Wind:</span>
      <span className="tabular-nums hidden lg:inline">{weather.wind_speed} m/s</span>
    </div>
  );
}
