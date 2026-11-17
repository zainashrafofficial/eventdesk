import "server-only";

/**
 * External API integration: Open-Meteo (https://open-meteo.com).
 *   - Geocoding API: place name -> coordinates (used by the event form)
 *   - Forecast API:  coordinates -> current weather + 16-day forecast (event page)
 * Free production APIs with no key. Every call has a timeout, checks the HTTP
 * status, validates the payload shape and throws a typed error the route maps to JSON.
 */

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 8000;

export class ExternalApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ExternalApiError";
  }
}

/** One automatic retry for transient failures (network blips, 5xx). 4xx errors are not retried. */
async function getJson<T>(url: URL, revalidateSeconds: number): Promise<T> {
  try {
    return await getJsonOnce<T>(url, revalidateSeconds);
  } catch (err) {
    if (err instanceof ExternalApiError && (err.status === 502 || err.status === 504)) {
      await new Promise((r) => setTimeout(r, 400));
      return getJsonOnce<T>(url, revalidateSeconds);
    }
    throw err;
  }
}

async function getJsonOnce<T>(url: URL, revalidateSeconds: number): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: "application/json" },
      next: { revalidate: revalidateSeconds },
    });
  } catch (err) {
    console.error(`[open-meteo] ${url.host}${url.pathname} failed:`, err);
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    throw new ExternalApiError(
      timedOut ? "The weather service took too long to respond." : "Couldn't reach the weather service.",
      timedOut ? 504 : 502,
    );
  }

  if (!res.ok) {
    console.error(`[open-meteo] ${url.host}${url.pathname} returned ${res.status}`);
    let reason = `The weather service returned an error (${res.status}).`;
    try {
      const body = (await res.json()) as { reason?: string };
      if (body?.reason) reason = `Weather service: ${body.reason}`;
    } catch {
      // Non-JSON error body: keep the generic message.
    }
    // Upstream 4xx = our request was rejected (don't retry); 5xx = their outage (retry once).
    throw new ExternalApiError(reason, res.status === 429 ? 429 : res.status < 500 ? 400 : 502);
  }

  try {
    return (await res.json()) as T;
  } catch {
    throw new ExternalApiError("The weather service sent an unreadable response.", 502);
  }
}

/* ------------------------------------------------------------------ */
/*  Geocoding                                                          */
/* ------------------------------------------------------------------ */

export type Place = {
  id: number;
  name: string;
  label: string;
  latitude: number;
  longitude: number;
  country: string | null;
};

type GeocodeResponse = {
  results?: {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    admin1?: string;
  }[];
};

export async function searchPlaces(query: string): Promise<Place[]> {
  const url = new URL(GEOCODE_URL);
  url.searchParams.set("name", query);
  url.searchParams.set("count", "6");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const data = await getJson<GeocodeResponse>(url, 60 * 60 * 24);
  return (data.results ?? [])
    .filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude))
    .map((r) => ({
      id: r.id,
      name: r.name,
      label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
      latitude: r.latitude,
      longitude: r.longitude,
      country: r.country ?? null,
    }));
}

/* ------------------------------------------------------------------ */
/*  Forecast                                                           */
/* ------------------------------------------------------------------ */

export type DailyForecast = {
  date: string; // YYYY-MM-DD in the venue's time zone
  code: number;
  max: number;
  min: number;
  precipChance: number | null;
  windMax: number;
};

export type WeatherReport = {
  source: "Open-Meteo";
  timezone: string;
  current: {
    time: string;
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    code: number;
    isDay: boolean;
  };
  daily: DailyForecast[];
  /** The event's local date at the venue, when an event time was supplied. */
  eventDate: string | null;
  /** Forecast for the event date, if it falls inside the 16-day window. */
  eventDay: DailyForecast | null;
  eventTiming: "past" | "in-range" | "too-far" | null;
};

type ForecastResponse = {
  timezone: string;
  utc_offset_seconds: number;
  current?: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
    is_day: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max?: (number | null)[];
    wind_speed_10m_max: number[];
  };
};

export async function getForecast(latitude: number, longitude: number, eventAt?: string | null): Promise<WeatherReport> {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", latitude.toFixed(4));
  url.searchParams.set("longitude", longitude.toFixed(4));
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day",
  );
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
  );
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "16");

  const data = await getJson<ForecastResponse>(url, 60 * 15);
  if (!data.current || !data.daily?.time?.length) {
    throw new ExternalApiError("The weather service returned no forecast for this location.", 502);
  }

  const d = data.daily;
  const daily: DailyForecast[] = d.time.map((date, i) => ({
    date,
    code: d.weather_code[i],
    max: d.temperature_2m_max[i],
    min: d.temperature_2m_min[i],
    precipChance: d.precipitation_probability_max?.[i] ?? null,
    windMax: d.wind_speed_10m_max[i],
  }));

  let eventDate: string | null = null;
  let eventDay: DailyForecast | null = null;
  let eventTiming: WeatherReport["eventTiming"] = null;

  if (eventAt && !Number.isNaN(Date.parse(eventAt))) {
    // Shift to the venue's local clock, then take the calendar date.
    eventDate = new Date(Date.parse(eventAt) + data.utc_offset_seconds * 1000).toISOString().slice(0, 10);
    eventDay = daily.find((day) => day.date === eventDate) ?? null;
    eventTiming = eventDay ? "in-range" : eventDate < daily[0].date ? "past" : "too-far";
  }

  return {
    source: "Open-Meteo",
    timezone: data.timezone,
    current: {
      time: data.current.time,
      temperature: data.current.temperature_2m,
      feelsLike: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      code: data.current.weather_code,
      isDay: data.current.is_day === 1,
    },
    daily,
    eventDate,
    eventDay,
    eventTiming,
  };
}
