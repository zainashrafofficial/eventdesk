import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { ExternalApiError, searchPlaces } from "@/lib/services/open-meteo";

const querySchema = z.object({
  q: z.string().trim().min(2, "Type at least 2 characters.").max(100, "That search is too long."),
});

/** GET /api/geocode?q=Lahore  (signed-in users only) */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to search locations." }, { status: 401 });

  const parsed = querySchema.safeParse({ q: request.nextUrl.searchParams.get("q") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid search." }, { status: 400 });
  }

  try {
    const places = await searchPlaces(parsed.data.q);
    return NextResponse.json({ places });
  } catch (err) {
    if (err instanceof ExternalApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/geocode]", err);
    return NextResponse.json({ error: "Location search failed. Try again." }, { status: 500 });
  }
}
