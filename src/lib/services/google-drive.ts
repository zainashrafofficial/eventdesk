import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAdminConfigured, isDriveConfigured, publicEnv, serverEnv } from "@/lib/env";
import { PLATFORM_LABELS, type DriveStatus, type PostRow } from "@/types/db";

/**
 * Google Drive integration over plain REST (no SDK).
 * Scope `drive.file`: Cadence can only see and edit files it created itself, never the rest of the user's Drive.
 * Refresh tokens live in drive_connections.refresh_token, a column only the service-role (admin) client can read.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const DOC_MIME = "application/vnd.google-apps.document";
const TIMEOUT_MS = 15_000;

export const DRIVE_FOLDER_NAME = "Cadence Drafts";
export const DRIVE_SCOPES = "openid email https://www.googleapis.com/auth/drive.file";
export const DRIVE_STATE_COOKIE = "cadence_drive_state";

export function driveRedirectUri(): string {
  return `${publicEnv.siteUrl.replace(/\/+$/, "")}/api/drive/callback`;
}

export function driveFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`;
}

/** Typed error for anything that goes wrong talking to Google. */
export class DriveApiError extends Error {
  status: number;
  code: string | null;
  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = "DriveApiError";
    this.status = status;
    this.code = code;
  }
}

// ---------------------------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------------------------

/** fetch with a 15s timeout and one retry on network errors / 429 / 5xx (only when `retry` is true). */
async function driveFetch(url: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const attempt = () => fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  try {
    const res = await attempt();
    if (retry && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, 400));
      return await attempt();
    }
    return res;
  } catch (error) {
    if (!retry) throw toDriveError(error);
    await new Promise((r) => setTimeout(r, 400));
    try {
      return await attempt();
    } catch (second) {
      throw toDriveError(second);
    }
  }
}

function toDriveError(error: unknown): DriveApiError {
  if (error instanceof DriveApiError) return error;
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return new DriveApiError("Google Drive took too long to respond", 504, "timeout");
  }
  return new DriveApiError("Couldn't reach Google Drive", 502, "network");
}

const googleErrorSchema = z.object({
  error: z.union([
    z.string(),
    z.object({ code: z.number().optional(), message: z.string().optional(), status: z.string().optional() }),
  ]),
  error_description: z.string().optional(),
});

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** Turn a non-2xx Google response into a DriveApiError with a short, readable message. */
async function responseError(res: Response, fallback: string): Promise<DriveApiError> {
  const parsed = googleErrorSchema.safeParse(await readJson(res));
  if (!parsed.success) return new DriveApiError(`${fallback} (HTTP ${res.status})`, res.status);
  const { error, error_description } = parsed.data;
  if (typeof error === "string") {
    return new DriveApiError(error_description ?? `${fallback}: ${error}`, res.status, error);
  }
  return new DriveApiError(error.message ?? `${fallback} (HTTP ${res.status})`, res.status, error.status ?? null);
}

function shortMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : "Google Drive sync failed";
  return msg.length > 200 ? `${msg.slice(0, 197)}...` : msg;
}

// ---------------------------------------------------------------------------------------------
// OAuth
// ---------------------------------------------------------------------------------------------

const tokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().optional(),
  refresh_token: z.string().optional(),
  id_token: z.string().optional(),
  scope: z.string().optional(),
});

export type GoogleTokens = {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  scope: string | null;
  expiresIn: number;
};

async function postToken(params: Record<string, string>): Promise<GoogleTokens> {
  const res = await driveFetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  if (!res.ok) throw await responseError(res, "Google token request failed");
  const parsed = tokenSchema.safeParse(await readJson(res));
  if (!parsed.success) throw new DriveApiError("Google returned an unexpected token response", 502);
  const t = parsed.data;
  return {
    accessToken: t.access_token,
    refreshToken: t.refresh_token ?? null,
    idToken: t.id_token ?? null,
    scope: t.scope ?? null,
    expiresIn: t.expires_in ?? 3600,
  };
}

/** Authorization-code exchange (used by /api/drive/callback). Throws DriveApiError. */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const env = serverEnv();
  return postToken({
    code,
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    redirect_uri: driveRedirectUri(),
    grant_type: "authorization_code",
  });
}

const emailSchema = z.object({ email: z.email() });

/** The Google account's email: from the id_token payload, falling back to the userinfo endpoint. */
export async function fetchGoogleEmail(accessToken: string, idToken: string | null): Promise<string | null> {
  if (idToken) {
    const payload = idToken.split(".")[1];
    if (payload) {
      try {
        const parsed = emailSchema.safeParse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
        if (parsed.success) return parsed.data.email;
      } catch {
        // fall through to userinfo
      }
    }
  }
  try {
    const res = await driveFetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return null;
    const parsed = emailSchema.safeParse(await readJson(res));
    return parsed.success ? parsed.data.email : null;
  } catch {
    return null;
  }
}

const fileListSchema = z.object({ files: z.array(z.object({ id: z.string() })).default([]) });
const fileIdSchema = z.object({ id: z.string().min(1) });

/** Find the app's "Cadence Drafts" folder, or create it. Throws DriveApiError. */
export async function ensureDraftsFolder(accessToken: string): Promise<string> {
  const auth = { Authorization: `Bearer ${accessToken}` };
  const q = `name='${DRIVE_FOLDER_NAME}' and mimeType='${FOLDER_MIME}' and trashed=false`;
  const listUrl = `${DRIVE_API}/files?${new URLSearchParams({ q, spaces: "drive", fields: "files(id)", pageSize: "1" })}`;
  const list = await driveFetch(listUrl, { headers: auth });
  if (!list.ok) throw await responseError(list, "Couldn't list Google Drive folders");
  const found = fileListSchema.safeParse(await readJson(list));
  const existing = found.success ? found.data.files[0]?.id : undefined;
  if (existing) return existing;

  const created = await driveFetch(
    `${DRIVE_API}/files?fields=id`,
    {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ name: DRIVE_FOLDER_NAME, mimeType: FOLDER_MIME }),
    },
    false,
  );
  if (!created.ok) throw await responseError(created, "Couldn't create the Cadence Drafts folder");
  const parsed = fileIdSchema.safeParse(await readJson(created));
  if (!parsed.success) throw new DriveApiError("Google Drive returned no folder id", 502);
  return parsed.data.id;
}

// ---------------------------------------------------------------------------------------------
// Access tokens (refresh-token grant, cached per serverless instance)
// ---------------------------------------------------------------------------------------------

type CachedToken = { accessToken: string; expiresAt: number; refreshToken: string };
const tokenCache = new Map<string, CachedToken>();

/** Seed the cache right after the OAuth callback so the first sync skips a refresh round-trip. */
export function primeAccessToken(userId: string, refreshToken: string, accessToken: string, expiresIn: number) {
  tokenCache.set(userId, { accessToken, refreshToken, expiresAt: Date.now() + expiresIn * 1000 });
}

const connectionRowSchema = z.object({ refresh_token: z.string().min(1), folder_id: z.string().nullable() });

type Connection =
  | { kind: "ok"; accessToken: string; folderId: string | null }
  | { kind: "none" }
  | { kind: "error"; message: string };

async function getAccessToken(userId: string): Promise<Connection> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("drive_connections")
    .select("refresh_token, folder_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { kind: "error", message: "Couldn't read the Google Drive connection" };
  const row = connectionRowSchema.safeParse(data);
  if (!row.success) {
    tokenCache.delete(userId);
    return { kind: "none" };
  }
  const { refresh_token: refreshToken, folder_id: folderId } = row.data;

  const cached = tokenCache.get(userId);
  // The refresh token is part of the cache key, so a disconnect/reconnect never reuses a stale token.
  if (cached && cached.refreshToken === refreshToken && cached.expiresAt - 60_000 > Date.now()) {
    return { kind: "ok", accessToken: cached.accessToken, folderId };
  }

  try {
    const env = serverEnv();
    const tokens = await postToken({
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });
    primeAccessToken(userId, refreshToken, tokens.accessToken, tokens.expiresIn);
    return { kind: "ok", accessToken: tokens.accessToken, folderId };
  } catch (error) {
    if (error instanceof DriveApiError && error.code === "invalid_grant") {
      // The user revoked Cadence in their Google account: forget the dead connection.
      tokenCache.delete(userId);
      await admin.from("drive_connections").delete().eq("user_id", userId);
      return { kind: "none" };
    }
    return { kind: "error", message: shortMessage(error) };
  }
}

// ---------------------------------------------------------------------------------------------
// Public API (contract)
// ---------------------------------------------------------------------------------------------

const statusRowSchema = z.object({
  user_id: z.string(),
  google_email: z.string().nullable(),
  folder_id: z.string().nullable(),
});

export async function getDriveStatus(userId: string): Promise<DriveStatus> {
  const configured = isDriveConfigured();
  const disconnected: DriveStatus = { connected: false, configured, googleEmail: null, folderId: null, folderUrl: null };
  if (!configured || !isAdminConfigured()) return disconnected;
  try {
    const supabase = await createClient();
    // User-scoped read: the column grant hides refresh_token, RLS limits rows to the owner.
    const { data, error } = await supabase
      .from("drive_connections")
      .select("user_id, google_email, folder_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return disconnected;
    const row = statusRowSchema.safeParse(data);
    if (!row.success) return disconnected;
    const folderId = row.data.folder_id;
    return {
      connected: true,
      configured,
      googleEmail: row.data.google_email,
      folderId,
      folderUrl: folderId ? driveFolderUrl(folderId) : null,
    };
  } catch (error) {
    console.error("[drive] status failed", error);
    return disconnected;
  }
}

const STATUS_LABELS: Record<PostRow["status"], string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
};

function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function fileName(post: PostRow): string {
  const flat = oneLine(post.caption);
  const snippet = flat.length > 40 ? `${flat.slice(0, 40).trimEnd()}…` : flat;
  return `Cadence · ${PLATFORM_LABELS[post.platform]} · ${snippet || "Untitled"}`;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "Not scheduled (draft)";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const human = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${d.toISOString()} (${human} UTC)`;
}

function section(title: string, body: string): string {
  return `${title}\n${"-".repeat(title.length)}\n${body}\n`;
}

function buildDocument(post: PostRow, syncedAt: string): string {
  const platform = PLATFORM_LABELS[post.platform];
  const title = `Cadence draft: ${platform} post`;
  const hashtags = post.hashtags.length ? post.hashtags.map((t) => `#${t.replace(/^#/, "")}`).join(" ") : "(none)";
  const lines = [
    title,
    "=".repeat(title.length),
    "",
    `Platform: ${platform}`,
    `Status: ${STATUS_LABELS[post.status]}`,
    `Scheduled for: ${formatWhen(post.scheduled_at)}`,
    ...(post.tone ? [`Tone: ${post.tone}`] : []),
    `Email reminder: ${post.notify ? "On" : "Off"}`,
    "",
    section("Caption", post.caption),
    section("Hashtags", hashtags),
    section("Task details / notes", post.notes?.trim() || "(none)"),
    section("Prompt", post.prompt?.trim() || "(none)"),
    "---",
    `Post ID: ${post.id}`,
    `Created: ${post.created_at}`,
    `Last synced: ${syncedAt}`,
    "",
    "This document is kept in sync by Cadence. Edit the post in Cadence; changes here are overwritten on the next sync.",
  ];
  return lines.join("\n");
}

function multipartBody(metadata: Record<string, unknown>, text: string): { body: string; contentType: string } {
  const boundary = `cadence_${crypto.randomUUID().replace(/-/g, "")}`;
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/plain; charset=UTF-8\r\n\r\n` +
    `${text}\r\n` +
    `--${boundary}--`;
  return { body, contentType: `multipart/related; boundary=${boundary}` };
}

async function recordSyncError(post: PostRow, message: string) {
  try {
    await createAdminClient()
      .from("posts")
      .update({ drive_sync_error: message })
      .eq("id", post.id)
      .eq("user_id", post.user_id);
  } catch (error) {
    console.error("[drive] couldn't record sync error", error);
  }
}

async function createDoc(accessToken: string, folderId: string, name: string, text: string): Promise<Response> {
  const { body, contentType } = multipartBody({ name, mimeType: DOC_MIME, parents: [folderId] }, text);
  return driveFetch(
    `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id`,
    { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": contentType }, body },
    false,
  );
}

export async function syncPostToDrive(
  post: PostRow,
): Promise<{ ok: true; fileId: string } | { ok: false; error: string }> {
  if (!isDriveConfigured() || !isAdminConfigured()) return { ok: false, error: "Google Drive isn't configured" };

  try {
    const conn = await getAccessToken(post.user_id);
    if (conn.kind === "none") return { ok: false, error: "Google Drive isn't connected" };
    if (conn.kind === "error") {
      await recordSyncError(post, conn.message);
      return { ok: false, error: conn.message };
    }

    const { accessToken } = conn;
    const auth = { Authorization: `Bearer ${accessToken}` };
    const syncedAt = new Date().toISOString();
    const name = fileName(post);
    const text = buildDocument(post, syncedAt);
    let fileId: string | null = null;

    // 1) Update the existing Doc in place (a text/plain upload replaces the Doc's content).
    if (post.drive_file_id) {
      const { body, contentType } = multipartBody({ name }, text);
      const res = await driveFetch(
        `${DRIVE_UPLOAD}/files/${encodeURIComponent(post.drive_file_id)}?uploadType=multipart&fields=id`,
        { method: "PATCH", headers: { ...auth, "Content-Type": contentType }, body },
      );
      if (res.ok) {
        const parsed = fileIdSchema.safeParse(await readJson(res));
        fileId = parsed.success ? parsed.data.id : post.drive_file_id;
      } else if (res.status !== 404) {
        throw await responseError(res, "Couldn't update the Google Doc");
      }
      // 404: the user deleted the Doc, so fall through and create a fresh one.
    }

    // 2) Create a new Google Doc in the "Cadence Drafts" folder.
    if (!fileId) {
      let folderId = conn.folderId ?? (await ensureDraftsFolder(accessToken));
      let res = await createDoc(accessToken, folderId, name, text);
      if (res.status === 404) {
        // The folder itself was deleted: recreate it once and retry.
        folderId = await ensureDraftsFolder(accessToken);
        res = await createDoc(accessToken, folderId, name, text);
      }
      if (!res.ok) throw await responseError(res, "Couldn't create the Google Doc");
      const parsed = fileIdSchema.safeParse(await readJson(res));
      if (!parsed.success) throw new DriveApiError("Google Drive returned no file id", 502);
      fileId = parsed.data.id;
      if (folderId !== conn.folderId) {
        await createAdminClient()
          .from("drive_connections")
          .update({ folder_id: folderId })
          .eq("user_id", post.user_id);
      }
    }

    const { error } = await createAdminClient()
      .from("posts")
      .update({ drive_file_id: fileId, drive_synced_at: new Date().toISOString(), drive_sync_error: null })
      .eq("id", post.id)
      .eq("user_id", post.user_id);
    if (error) console.error("[drive] synced but couldn't save the file id", error.message);

    return { ok: true, fileId };
  } catch (error) {
    const message = shortMessage(error);
    console.error("[drive] sync failed", message);
    await recordSyncError(post, message);
    return { ok: false, error: message };
  }
}

/** Best-effort revoke of the stored refresh token at Google (used on disconnect). Never throws. */
export async function revokeDriveAccess(userId: string): Promise<void> {
  tokenCache.delete(userId);
  if (!isAdminConfigured()) return;
  try {
    const { data } = await createAdminClient()
      .from("drive_connections")
      .select("refresh_token, folder_id")
      .eq("user_id", userId)
      .maybeSingle();
    const row = connectionRowSchema.safeParse(data);
    if (!row.success) return;
    await driveFetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(row.data.refresh_token)}`,
      { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      false,
    );
  } catch (error) {
    console.error("[drive] revoke failed", shortMessage(error));
  }
}

export async function deletePostFromDrive(userId: string, fileId: string): Promise<void> {
  if (!fileId || !isDriveConfigured() || !isAdminConfigured()) return;
  try {
    const conn = await getAccessToken(userId);
    if (conn.kind !== "ok") return;
    const res = await driveFetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${conn.accessToken}` },
    });
    if (!res.ok && res.status !== 404) {
      console.error("[drive] delete failed", (await responseError(res, "Couldn't delete the Google Doc")).message);
    }
  } catch (error) {
    console.error("[drive] delete failed", shortMessage(error));
  }
}
