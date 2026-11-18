import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { isAdminConfigured, isDriveConfigured, serverEnv } from "@/lib/env";
import { DRIVE_SCOPES, DRIVE_STATE_COOKIE, driveRedirectUri } from "@/lib/services/google-drive";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

/** GET /api/drive/connect: start the Google OAuth flow (drive.file scope, offline access, CSRF state cookie). */
export async function GET(request: NextRequest) {
  if (!isDriveConfigured() || !isAdminConfigured()) {
    return NextResponse.redirect(new URL("/dashboard?drive=error&reason=not_configured", request.url));
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/dashboard", request.url));

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: serverEnv().googleClientId,
    redirect_uri: driveRedirectUri(),
    response_type: "code",
    scope: DRIVE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });

  const response = NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  response.cookies.set(DRIVE_STATE_COOKIE, state, {
    httpOnly: true,
    // Secure everywhere except plain-http local dev (Safari drops Secure cookies on http://localhost).
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    maxAge: 600,
    path: "/api/drive",
  });
  return response;
}
