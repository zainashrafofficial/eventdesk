import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { ExternalApiError, getForecast } from "@/lib/services/open-meteo";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  at: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date.")
    .nullable(),
});

/** GET /api/weather?lat=31.55&lon=74.34&at=2026-11-20T10:00:00Z  (signed-in users only) */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to load the forecast." }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse({ lat: sp.get("lat"), lon: sp.get("lon"), at: sp.get("at") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
  }

  try {
    const report = await getForecast(parsed.data.lat, parsed.data.lon, parsed.data.at);
    return NextResponse.json(report, { headers: { "cache-control": "private, max-age=300" } });
  } catch (err) {
    if (err instanceof ExternalApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/weather]", err);
    return NextResponse.json({ error: "Couldn't load the forecast. Try again." }, { status: 500 });
  }
}
