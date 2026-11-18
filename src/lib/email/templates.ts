import { PLATFORM_LABELS, type NotificationSettings, type PostRow } from "@/types/db";
import { REMINDER_PRESETS, REMINDER_PRESET_LABELS, type ReminderPreset } from "@/lib/validation/notifications";

/**
 * Transactional email templates (scheduled confirmation, reminder, test).
 * Table layout + inline styles so they render in Gmail, Outlook and Apple Mail.
 * Every piece of user content goes through escapeHtml().
 */

export type EmailContent = { subject: string; html: string; text: string };

type PostTemplateInput = { post: PostRow; settings: NotificationSettings; appUrl: string };
type TestTemplateInput = { settings: NotificationSettings; appUrl: string };

const FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const INK = "#1d1d1f";
const MUTED = "#6e6e73";
const FAINT = "#86868b";
const LINE = "#e5e5ea";
const ACCENT = "#0071e3";
const PAPER = "#f5f5f7";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape, then keep line breaks. */
function escapeMultiline(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br />");
}

function safeTimeZone(tz: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

/** e.g. "Thu, 20 Nov, 6:00 PM PKT" in the user's time zone. */
export function formatWhen(iso: string | null, timeZone: string): string {
  if (!iso) return "No time set";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "No time set";
  const tz = safeTimeZone(timeZone);
  const day = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
  return `${day}, ${time}`;
}

/** "in 15 minutes", "in 2 hours", "now". */
export function formatRelative(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "soon";
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return "soon";
  const diffMinutes = Math.round((target - now.getTime()) / 60_000);
  if (diffMinutes <= 0) return "now";
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (diffMinutes < 60) return rtf.format(diffMinutes, "minute");
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
}

function hashtagLine(tags: string[]): string {
  return tags
    .map((t) => t.trim().replace(/^#+/, ""))
    .filter(Boolean)
    .map((t) => `#${t}`)
    .join(" ");
}

function platformLabel(post: PostRow): string {
  return PLATFORM_LABELS[post.platform] ?? post.platform;
}

/* ------------------------------------------------------------------ layout */

type DetailRow = { label: string; value: string };

function detailsHtml(rows: DetailRow[]): string {
  if (rows.length === 0) return "";
  const body = rows
    .map(
      (row, i) => `
        <tr>
          <td valign="top" style="padding:12px 0;${i > 0 ? `border-top:1px solid ${LINE};` : ""}font-family:${FONT};font-size:13px;line-height:20px;color:${FAINT};width:120px;">${escapeHtml(row.label)}</td>
          <td valign="top" style="padding:12px 0;${i > 0 ? `border-top:1px solid ${LINE};` : ""}font-family:${FONT};font-size:14px;line-height:20px;color:${INK};font-weight:500;">${escapeMultiline(row.value)}</td>
        </tr>`,
    )
    .join("");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0 0;">
      ${body}
    </table>`;
}

function captionHtml(post: PostRow): string {
  const tags = hashtagLine(post.hashtags);
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td style="background:${PAPER};border-radius:14px;padding:18px 20px;">
          <div style="font-family:${FONT};font-size:11px;line-height:16px;letter-spacing:0.08em;text-transform:uppercase;color:${FAINT};font-weight:600;margin:0 0 8px 0;">Caption</div>
          <div style="font-family:${FONT};font-size:15px;line-height:23px;color:${INK};">${escapeMultiline(post.caption)}</div>
          ${tags ? `<div style="font-family:${FONT};font-size:14px;line-height:22px;color:${ACCENT};margin:10px 0 0 0;">${escapeHtml(tags)}</div>` : ""}
        </td>
      </tr>
    </table>`;
}

function layout(opts: {
  preheader: string;
  eyebrow: string;
  headline: string;
  intro: string;
  content: string;
  appUrl: string;
}): string {
  const dashboardUrl = `${opts.appUrl.replace(/\/+$/, "")}/dashboard`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light" />
<title>${escapeHtml(opts.headline)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr>
          <td style="padding:0 8px 20px 8px;font-family:${FONT};font-size:17px;line-height:22px;font-weight:600;letter-spacing:-0.02em;color:${INK};">
            <span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:${ACCENT};margin-right:8px;vertical-align:middle;"></span><span style="vertical-align:middle;">Cadence</span>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border-radius:18px;padding:36px 32px;box-shadow:0 1px 2px rgba(0,0,0,0.04),0 8px 24px rgba(0,0,0,0.04);">
            <div style="font-family:${FONT};font-size:12px;line-height:16px;letter-spacing:0.08em;text-transform:uppercase;color:${ACCENT};font-weight:600;margin:0 0 10px 0;">${escapeHtml(opts.eyebrow)}</div>
            <h1 style="margin:0 0 12px 0;font-family:${FONT};font-size:28px;line-height:34px;letter-spacing:-0.025em;font-weight:700;color:${INK};">${escapeHtml(opts.headline)}</h1>
            <p style="margin:0 0 28px 0;font-family:${FONT};font-size:16px;line-height:24px;color:${MUTED};">${escapeHtml(opts.intro)}</p>
            ${opts.content}
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0 0;">
              <tr>
                <td style="border-radius:980px;background:${ACCENT};">
                  <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:15px;line-height:20px;font-weight:500;color:#ffffff;text-decoration:none;border-radius:980px;">Open Cadence</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 16px 0 16px;font-family:${FONT};font-size:12px;line-height:18px;color:${FAINT};text-align:center;">
            You're receiving this because notifications are on. Change them in Cadence &rarr; Notification settings.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function postDetails(post: PostRow, settings: NotificationSettings): DetailRow[] {
  const rows: DetailRow[] = [
    { label: "Platform", value: platformLabel(post) },
    { label: "Scheduled", value: formatWhen(post.scheduled_at, settings.timezone) },
  ];
  if (post.notes?.trim()) rows.push({ label: "Task details", value: post.notes.trim() });
  return rows;
}

function postText(post: PostRow, settings: NotificationSettings, intro: string, appUrl: string): string {
  const lines = [intro, ""];
  if (settings.include_caption) {
    lines.push("Caption:", post.caption);
    const tags = hashtagLine(post.hashtags);
    if (tags) lines.push(tags);
    lines.push("");
  }
  lines.push(`Platform: ${platformLabel(post)}`);
  lines.push(`Scheduled: ${formatWhen(post.scheduled_at, settings.timezone)}`);
  if (post.notes?.trim()) lines.push(`Task details: ${post.notes.trim()}`);
  lines.push("", `Open Cadence: ${appUrl.replace(/\/+$/, "")}/dashboard`, "");
  lines.push("You're receiving this because notifications are on. Change them in Cadence → Notification settings.");
  return lines.join("\n");
}

/* --------------------------------------------------------------- templates */

export function scheduledTemplate({ post, settings, appUrl }: PostTemplateInput): EmailContent {
  const when = formatWhen(post.scheduled_at, settings.timezone);
  const platform = platformLabel(post);
  const subject = `${settings.subject_prefix}: Post scheduled for ${when}`;
  const intro = `Your ${platform} post is locked in for ${when}. We'll remind you before it goes live.`;
  const content = `${settings.include_caption ? captionHtml(post) : ""}${detailsHtml(postDetails(post, settings))}`;
  return {
    subject,
    html: layout({
      preheader: `${platform} · ${when}`,
      eyebrow: "Scheduled",
      headline: "Your post is scheduled.",
      intro,
      content,
      appUrl,
    }),
    text: postText(post, settings, intro, appUrl),
  };
}

export function reminderTemplate({ post, settings, appUrl }: PostTemplateInput): EmailContent {
  const platform = platformLabel(post);
  const relative = formatRelative(post.scheduled_at);
  const when = formatWhen(post.scheduled_at, settings.timezone);
  const subject = `${settings.subject_prefix}: Your ${platform} post goes live ${relative}`;
  const intro = `Heads up: your ${platform} post is due ${relative === "now" ? "now" : relative} (${when}). Give it a final look before it goes out.`;
  const content = `${settings.include_caption ? captionHtml(post) : ""}${detailsHtml(postDetails(post, settings))}`;
  return {
    subject,
    html: layout({
      preheader: `${platform} · ${when}`,
      eyebrow: "Reminder",
      headline: relative === "now" ? "It's time to post." : `Going live ${relative}.`,
      intro,
      content,
      appUrl,
    }),
    text: postText(post, settings, intro, appUrl),
  };
}

export function testTemplate({ settings, appUrl }: TestTemplateInput): EmailContent {
  const subject = `${settings.subject_prefix}: Test notification`;
  const intro = "Email notifications are working. This is how Cadence will reach you when a post is scheduled and before it goes live.";
  const preset = (REMINDER_PRESETS as readonly number[]).includes(settings.remind_before_minutes)
    ? REMINDER_PRESET_LABELS[settings.remind_before_minutes as ReminderPreset]
    : null;
  const reminder = preset ?? `${settings.remind_before_minutes} minutes before`;
  const rows: DetailRow[] = [
    { label: "Sent to", value: settings.email },
    { label: "Confirmations", value: settings.notify_on_schedule ? "On" : "Off" },
    { label: "Reminder", value: reminder },
    { label: "Time zone", value: settings.timezone },
    { label: "Sent", value: formatWhen(new Date().toISOString(), settings.timezone) },
  ];
  const text = [
    intro,
    "",
    ...rows.map((r) => `${r.label}: ${r.value}`),
    "",
    `Open Cadence: ${appUrl.replace(/\/+$/, "")}/dashboard`,
    "",
    "You're receiving this because notifications are on. Change them in Cadence → Notification settings.",
  ].join("\n");
  return {
    subject,
    html: layout({
      preheader: "Your Cadence notifications are set up.",
      eyebrow: "Test",
      headline: "You're all set.",
      intro,
      content: detailsHtml(rows),
      appUrl,
    }),
    text,
  };
}
