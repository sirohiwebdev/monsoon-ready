import { NextResponse } from "next/server";
import {
  geocodePlace,
  getWeatherSummary,
  reverseGeocode,
  WeatherError,
} from "@/lib/weather";

// GET /api/weather?place=Pune
//     /api/weather?lat=18.52&lon=73.85
// Returns a WeatherSummary shaped for the plan prompt.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const place = searchParams.get("place")?.trim();
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  try {
    if (lat && lon) {
      const latitude = Number(lat);
      const longitude = Number(lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
      }
      const name = await reverseGeocode(latitude, longitude);
      const summary = await getWeatherSummary(latitude, longitude, name);
      return NextResponse.json(summary);
    }

    if (place) {
      const geo = await geocodePlace(place);
      const summary = await getWeatherSummary(geo.latitude, geo.longitude, geo.place);
      return NextResponse.json(summary);
    }

    return NextResponse.json(
      { error: "Provide a place name or coordinates." },
      { status: 400 },
    );
  } catch (err) {
    if (err instanceof WeatherError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[/api/weather] unexpected error:", err);
    return NextResponse.json(
      { error: "Something went wrong fetching the weather." },
      { status: 500 },
    );
  }
}
