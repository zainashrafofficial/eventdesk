import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { isAdminConfigured, isDriveConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DRIVE_STATE_COOKIE,
  ensureDraftsFolder,
  exchangeCodeForTokens,
  fetchGoogleEmail,
  primeAccessToken,
} from "@/lib/services/google-drive";

const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

function sameState(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** GET /api/drive/callback: verify state, exchange the code, store the refresh token, find/create the folder. */
export async function GET(request: NextRequest) {
  const finish = (query: string) => {
    const response = NextResponse.redirect(new URL(`/dashboard?${query}`, request.url));
    response.cookies.set(DRIVE_STATE_COOKIE, "", { path: "/api/drive", maxAge: 0 });
    return response;
  };

  if (!isDriveConfigured() || !isAdminConfigured()) return finish("drive=error&reason=not_configured");

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/dashboard", request.url));

  const params = request.nextUrl.searchParams;
  const expected = request.cookies.get(DRIVE_STATE_COOKIE)?.value ?? "";
  const state = params.get("state") ?? "";
  if (!expected || !state || !sameState(expected, state)) return finish("drive=error&reason=state");

  if (params.get("error")) return finish("drive=error&reason=denied");
  const code = params.get("code");
  if (!code) return finish("drive=error&reason=exchange_failed");

  try {
    const tokens = await exchangeCodeForTokens(code);
    // Granular consent lets people untick the Drive box: treat that as a denial.
    if (tokens.scope && !tokens.scope.split(" ").includes(DRIVE_FILE_SCOPE)) {
      return finish("drive=error&reason=denied");
    }
    if (!tokens.refreshToken) return finish("drive=error&reason=no_refresh_token");

    const [googleEmail, folderId] = await Promise.all([
      fetchGoogleEmail(tokens.accessToken, tokens.idToken),
      ensureDraftsFolder(tokens.accessToken),
    ]);

    const { error } = await createAdminClient()
      .from("drive_connections")
      .upsert(
        {
          user_id: user.id,
          refresh_token: tokens.refreshToken,
          google_email: googleEmail,
          folder_id: folderId,
          connected_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);

    primeAccessToken(user.id, tokens.refreshToken, tokens.accessToken, tokens.expiresIn);
    return finish("drive=connected");
  } catch (error) {
    console.error("[drive] OAuth callback failed", error instanceof Error ? error.message : error);
    return finish("drive=error&reason=exchange_failed");
  }
}
