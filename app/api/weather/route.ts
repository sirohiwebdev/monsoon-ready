import { NextResponse } from "next/server";
import {
  geocodePlace,
  getWeatherSummary,
  reverseGeocode,
  WeatherError,
} from "@/lib/weather";
import { createLogger } from "@/lib/logger";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const log = createLogger("/api/weather");

// GET /api/weather?place=Pune
//     /api/weather?lat=18.52&lon=73.85
// Returns a WeatherSummary shaped for the plan prompt.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const place = searchParams.get("place")?.trim();
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!rateLimit(getClientIp(req))) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  try {
    if (lat && lon) {
      const latitude = Number(lat);
      const longitude = Number(lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return NextResponse.json(
          { error: "Invalid coordinates." },
          { status: 400 },
        );
      }
      const { place: name, state } = await reverseGeocode(latitude, longitude);
      const summary = await getWeatherSummary(latitude, longitude, name, state);
      return NextResponse.json(summary, {
        headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
      });
    }

    if (place) {
      if (place.length > 200) {
        return NextResponse.json(
          { error: "Place name is too long. Please try a shorter name." },
          { status: 400 },
        );
      }
      const geo = await geocodePlace(place);
      const summary = await getWeatherSummary(
        geo.latitude,
        geo.longitude,
        geo.place,
        geo.state,
      );
      return NextResponse.json(summary, {
        headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
      });
    }

    return NextResponse.json(
      { error: "Provide a place name or coordinates." },
      { status: 400 },
    );
  } catch (err) {
    if (err instanceof WeatherError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    log.error("unexpected error", { error: String(err) });
    return NextResponse.json(
      { error: "Something went wrong fetching the weather." },
      { status: 500 },
    );
  }
}
