import { NextResponse } from "next/server";
import { fetchAdvisories } from "@/lib/advisory";

// GET /api/advisory?state=Maharashtra -> { advisories: Advisory[] }
// Always 200. A broken upstream feed must never surface as an app error —
// the card simply renders nothing when there's nothing to show.
export async function GET(req: Request) {
  const state = new URL(req.url).searchParams.get("state")?.trim();
  if (!state) return NextResponse.json({ advisories: [] });
  const advisories = await fetchAdvisories(state).catch(() => []);
  return NextResponse.json({ advisories });
}
