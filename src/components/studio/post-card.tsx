"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarClock,
  Check,
  CircleAlert,
  Copy,
  Ellipsis,
  FileText,
  Mail,
  MailCheck,
  BellOff,
  BellRing,
  Music2,
  Pencil,
  RefreshCw,
  Trash2,
  ArrowUpRight,
  FilePen,
  CloudOff,
} from "lucide-react";
import { updatePost, deletePost } from "@/lib/actions/posts";
import type { PostUpdateInput } from "@/lib/validation/post";
import { syncPostNow } from "@/lib/actions/drive";
import { PLATFORM_LABELS, PLATFORM_LIMITS, type Platform, type PostRow } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/display";
import { Input, Textarea } from "@/components/ui/input";
import { Field, Label } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { LocalTime } from "@/components/ui/local-time";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  ConfirmDialog,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  Tooltip,
} from "@/components/ui/overlay";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Shared client clock (hydration-safe: 0 on the server)              */
/* ------------------------------------------------------------------ */

let nowSnapshot = 0;
function subscribeNow(cb: () => void) {
  nowSnapshot = Date.now();
  cb();
  const id = window.setInterval(() => {
    nowSnapshot = Date.now();
    cb();
  }, 60_000);
  return () => window.clearInterval(id);
}
const getNow = () => nowSnapshot;
const getServerNow = () => 0;

/** Current time in ms on the client (ticks every minute); 0 during SSR / hydration. */
export function useNow() {
  return React.useSyncExternalStore(subscribeNow, getNow, getServerNow);
}

export type EffectiveStatus = "draft" | "scheduled" | "published";

export function effectiveStatus(post: PostRow, now: number): EffectiveStatus {
  if (post.status === "published") return "published";
  if (post.status === "draft") return "draft";
  if (now > 0 && post.scheduled_at && new Date(post.scheduled_at).getTime() <= now) return "published";
  return "scheduled";
}

/* ------------------------------------------------------------------ */
/*  Platform glyphs (lucide v1 ships no brand icons)                   */
/* ------------------------------------------------------------------ */

export function PlatformGlyph({ platform, className }: { platform: Platform; className?: string }) {
  const common = { className: cn("size-4", className), "aria-hidden": true } as const;
  switch (platform) {
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...common}>
          <rect x="3" y="3" width="18" height="18" rx="5.5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...common}>
          <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3Zm-1.08 16.17h1.7L7.4 4.74H5.58l11.09 14.43Z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...common}>
          <path d="M4.98 3.5a2.48 2.48 0 1 1 0 4.96 2.48 2.48 0 0 1 0-4.96ZM3 9.75h3.96V21H3V9.75Zm6.45 0h3.8v1.54h.05c.53-1 1.82-2.05 3.75-2.05 4 0 4.74 2.63 4.74 6.06V21h-3.95v-5.06c0-1.2-.02-2.76-1.68-2.76-1.69 0-1.95 1.32-1.95 2.67V21H9.45V9.75Z" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...common}>
          <path d="M13.5 21v-7.6h2.56l.38-2.97H13.5V8.54c0-.86.24-1.45 1.47-1.45h1.57V4.43a21 21 0 0 0-2.29-.12c-2.27 0-3.82 1.38-3.82 3.93v2.19H7.87v2.97h2.56V21h3.07Z" />
        </svg>
      );
    case "tiktok":
      return <Music2 {...common} />;
  }
}

const PLATFORM_TINT: Record<Platform, string> = {
  instagram: "text-[#d62976]",
  x: "text-ink",
  linkedin: "text-[#0a66c2]",
  facebook: "text-[#1877f2]",
  tiktok: "text-ink",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseHashtags(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\s,]+/)
        .map((t) => t.replace(/^#+/, "").trim())
        .filter(Boolean),
    ),
  );
}

function Pill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "success" | "danger" | "accent";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium [&_svg]:size-3.5",
        tone === "neutral" && "bg-ink/[0.045] text-muted",
        tone === "success" && "bg-success-soft text-success",
        tone === "danger" && "bg-danger-soft text-danger",
        tone === "accent" && "bg-accent-soft text-accent",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  PostCard                                                           */
/* ------------------------------------------------------------------ */

export function PostCard({
  post,
  driveConnected,
  className,
  style,
}: {
  post: PostRow;
  driveConnected: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const router = useRouter();
  const now = useNow();
  const status = effectiveStatus(post, now);
  const [editing, setEditing] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [syncing, startSync] = React.useTransition();
  const [converting, startConvert] = React.useTransition();

  const longCaption = post.caption.length > 260 || post.caption.split("\n").length > 4;

  async function copyCaption() {
    const tags = post.hashtags.length ? `\n\n${post.hashtags.map((t) => `#${t}`).join(" ")}` : "";
    try {
      await navigator.clipboard.writeText(`${post.caption}${tags}`);
      toast.success("Caption copied");
    } catch {
      toast.error("Couldn't access the clipboard");
    }
  }

  function sync() {
    startSync(async () => {
      const res = await syncPostNow(post.id);
      if (res.ok) {
        toast.success("Synced to Google Drive");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  function convert() {
    if (post.status === "draft" && !post.scheduled_at) {
      toast.message("Pick a time to schedule this post");
      setEditing(true);
      return;
    }
    const next: PostUpdateInput["status"] = post.status === "draft" ? "scheduled" : "draft";
    startConvert(async () => {
      const res = await updatePost(post.id, { status: next });
      if (res.ok) {
        toast.success(next === "scheduled" ? "Post scheduled" : "Moved to drafts");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  async function remove() {
    setRemoving(true);
    const res = await deletePost(post.id);
    if (res.ok) {
      toast.success("Post deleted");
      router.refresh();
    } else {
      setRemoving(false);
      toast.error(res.error);
    }
  }

  return (
    <article
      style={style}
      aria-busy={removing || undefined}
      className={cn(
        "group/card relative animate-fade-up rounded-3xl border border-line bg-surface/80 p-5 shadow-soft backdrop-blur-xl",
        "transition-[box-shadow,border-color,opacity,transform] duration-300 ease-[var(--ease-out-expo)]",
        "hover:border-line-strong hover:shadow-lift md:p-6",
        removing && "pointer-events-none scale-[0.985] opacity-40",
        editing && "border-accent/30 shadow-lift ring-4 ring-accent/[0.06]",
        className,
      )}
    >
      {/* Header */}
      <header className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-2xl bg-surface-2 ring-1 ring-line",
            PLATFORM_TINT[post.platform],
          )}
        >
          <PlatformGlyph platform={post.platform} className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold tracking-tight text-ink">{PLATFORM_LABELS[post.platform]}</span>
            {status === "scheduled" && (
              <Badge tone="accent" dot>
                Scheduled
              </Badge>
            )}
            {status === "draft" && <Badge tone="neutral">Draft</Badge>}
            {status === "published" && (
              <Badge tone="success">
                <Check /> Published
              </Badge>
            )}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted">
            {post.scheduled_at ? (
              <>
                <CalendarClock className="size-3.5" aria-hidden />
                <LocalTime
                  iso={post.scheduled_at}
                  options={{ weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }}
                />
                <span aria-hidden className="text-faint">·</span>
                <LocalTime iso={post.scheduled_at} relative className="text-ink-2" />
              </>
            ) : (
              <>
                <span>Edited</span>
                <LocalTime iso={post.updated_at} relative />
              </>
            )}
          </p>
        </div>

        {!editing && (
          <div className="-mr-1.5 -mt-1 flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity duration-200 md:opacity-60 md:group-hover/card:opacity-100 md:focus-within:opacity-100">
            <Tooltip content="Edit">
              <Button variant="ghost" size="icon-sm" aria-label="Edit post" onClick={() => setEditing(true)}>
                <Pencil />
              </Button>
            </Tooltip>
            <Tooltip content="Copy caption">
              <Button variant="ghost" size="icon-sm" aria-label="Copy caption" onClick={copyCaption}>
                <Copy />
              </Button>
            </Tooltip>
            <Menu>
              <MenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="More actions" disabled={converting}>
                  {converting ? <Spinner className="size-3.5" /> : <Ellipsis />}
                </Button>
              </MenuTrigger>
              <MenuContent>
                <MenuItem onSelect={() => setEditing(true)}>
                  <Pencil /> Edit post
                </MenuItem>
                <MenuItem onSelect={copyCaption}>
                  <Copy /> Copy caption
                </MenuItem>
                <MenuItem onSelect={convert}>
                  {post.status === "draft" ? (
                    <>
                      <CalendarClock /> Schedule post
                    </>
                  ) : (
                    <>
                      <FilePen /> Move to drafts
                    </>
                  )}
                </MenuItem>
                {post.drive_file_id && (
                  <MenuItem asChild>
                    <a
                      href={`https://docs.google.com/document/d/${post.drive_file_id}/edit`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FileText /> Open in Google Docs
                    </a>
                  </MenuItem>
                )}
                <MenuSeparator />
                <MenuItem destructive onSelect={() => setConfirmOpen(true)}>
                  <Trash2 /> Delete
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
        )}
      </header>

      {editing ? (
        <PostEditor post={post} onDone={() => setEditing(false)} />
      ) : (
        <>
          {/* Caption */}
          <div className="mt-4">
            <p
              className={cn(
                "whitespace-pre-line text-[15px] leading-relaxed text-ink",
                !expanded && "line-clamp-4",
              )}
            >
              {post.caption}
            </p>
            {longCaption && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="mt-1.5 rounded text-[13px] font-medium text-accent transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>

          {post.hashtags.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Hashtags">
              {post.hashtags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-accent-soft px-2.5 py-1 text-[12.5px] font-medium text-accent"
                >
                  #{tag}
                </li>
              ))}
            </ul>
          )}

          {post.notes && (
            <div className="mt-4 rounded-2xl bg-surface-2 px-4 py-3 ring-1 ring-line">
              <p className="eyebrow">Task details</p>
              <p className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed text-ink-2">{post.notes}</p>
            </div>
          )}

          {/* Status row */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line pt-4">
            <DrivePill post={post} driveConnected={driveConnected} syncing={syncing} onSync={sync} />
            <EmailPill post={post} status={status} />
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this post?"
        description="It will also be removed from Google Drive. This can't be undone."
        confirmLabel="Delete post"
        destructive
        onConfirm={remove}
      />
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Status pills                                                       */
/* ------------------------------------------------------------------ */

function DrivePill({
  post,
  driveConnected,
  syncing,
  onSync,
}: {
  post: PostRow;
  driveConnected: boolean;
  syncing: boolean;
  onSync: () => void;
}) {
  if (post.drive_sync_error) {
    return (
      <span className="inline-flex items-center gap-1">
        <Tooltip content={post.drive_sync_error}>
          <span tabIndex={0} className="rounded-full focus-visible:outline-2 focus-visible:outline-accent">
            <Pill tone="danger">
              <CircleAlert /> Sync failed
            </Pill>
          </span>
        </Tooltip>
        {driveConnected && (
          <Button variant="ghost" size="xs" className="h-7 px-2.5" onClick={onSync} disabled={syncing}>
            {syncing ? <Spinner className="size-3.5" /> : <RefreshCw />} Retry
          </Button>
        )}
      </span>
    );
  }
  if (post.drive_file_id) {
    return (
      <a
        href={`https://docs.google.com/document/d/${post.drive_file_id}/edit`}
        target="_blank"
        rel="noreferrer"
        className="group/drive rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Pill tone="success" className="transition-colors group-hover/drive:bg-success/15">
          <DriveMark className="size-3.5" /> Synced to Drive
          <ArrowUpRight className="-ml-0.5 transition-transform duration-200 group-hover/drive:-translate-y-px group-hover/drive:translate-x-px" />
        </Pill>
      </a>
    );
  }
  if (!driveConnected) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <Pill>
        <CloudOff /> Not synced
      </Pill>
      <Button variant="ghost" size="xs" className="h-7 px-2.5" onClick={onSync} disabled={syncing}>
        {syncing ? <Spinner className="size-3.5" /> : <RefreshCw />} Sync
      </Button>
    </span>
  );
}

function EmailPill({ post, status }: { post: PostRow; status: EffectiveStatus }) {
  if (!post.notify) {
    return (
      <Pill>
        <BellOff /> Reminder off
      </Pill>
    );
  }
  return (
    <>
      {post.confirmation_sent_at && (
        <Pill tone="neutral">
          <MailCheck /> Confirmation sent
        </Pill>
      )}
      {post.reminder_sent_at ? (
        <Pill tone="neutral">
          <BellRing /> Reminder sent
        </Pill>
      ) : (
        status === "scheduled" && (
          <Pill tone="accent">
            <Mail /> Reminder queued
          </Pill>
        )
      )}
    </>
  );
}

/** Minimal Google Drive mark in brand colours. */
export function DriveMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 87.3 78" className={cn("size-4", className)} aria-hidden>
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
      <path d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.5A9.06 9.06 0 0 0 0 53h27.5z" fill="#00ac47" />
      <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z" fill="#ea4335" />
      <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
      <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
      <path d="M73.4 26.5 60.7 4.5c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline editor                                                      */
/* ------------------------------------------------------------------ */

function PostEditor({ post, onDone }: { post: PostRow; onDone: () => void }) {
  const router = useRouter();
  const uid = React.useId();
  const [caption, setCaption] = React.useState(post.caption);
  const [hashtags, setHashtags] = React.useState(post.hashtags.map((t) => `#${t}`).join(" "));
  const [notes, setNotes] = React.useState(post.notes ?? "");
  const [notify, setNotify] = React.useState(post.notify);
  const [when, setWhen] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [pending, startTransition] = React.useTransition();
  const captionRef = React.useRef<HTMLTextAreaElement>(null);

  // datetime-local depends on the viewer's time zone, so fill it on the client only.
  React.useEffect(() => {
    const local = toLocalInput(post.scheduled_at);
    const id = window.requestAnimationFrame(() => {
      setWhen(local);
      captionRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [post.scheduled_at]);

  const limit = PLATFORM_LIMITS[post.platform];
  const count = caption.length;
  const over = count > limit;
  const near = !over && count > limit * 0.9;

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (!caption.trim()) {
      setFieldErrors({ caption: "Caption can't be empty" });
      return;
    }
    if (post.status === "scheduled" && !when) {
      setFieldErrors({ scheduled_at: "Scheduled posts need a date and time" });
      return;
    }
    const input: PostUpdateInput = {
      caption: caption.trim(),
      hashtags: parseHashtags(hashtags),
      notes: notes.trim() ? notes.trim() : null,
      scheduled_at: when ? new Date(when).toISOString() : null,
      notify,
    };
    if (post.status === "draft" && when) input.status = "scheduled";
    startTransition(async () => {
      const res = await updatePost(post.id, input);
      if (res.ok) {
        toast.success(input.status === "scheduled" ? "Post scheduled" : "Changes saved");
        onDone();
        router.refresh();
      } else {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
      }
    });
  }

  const id = (name: string) => `${uid}-${name}`;

  return (
    <form onSubmit={save} className="mt-5 flex animate-fade-up flex-col gap-4" noValidate>
      <FormAlert message={error} />
      <Field
        label="Caption"
        htmlFor={id("caption")}
        error={fieldErrors.caption}
        aside={
          <span
            className={cn(
              "text-xs tabular transition-colors",
              over ? "font-medium text-danger" : near ? "text-warning" : "text-faint",
            )}
            aria-live="polite"
          >
            {count.toLocaleString()} / {limit.toLocaleString()}
          </span>
        }
      >
        <Textarea
          ref={captionRef}
          id={id("caption")}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          aria-invalid={Boolean(fieldErrors.caption) || over || undefined}
          className="min-h-36"
        />
      </Field>

      <Field label="Hashtags" htmlFor={id("tags")} hint="Separate with spaces or commas" error={fieldErrors.hashtags}>
        <Input
          id={id("tags")}
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
          placeholder="#launch #productdesign"
          autoComplete="off"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={post.status === "draft" ? "Schedule for" : "Reschedule"}
          htmlFor={id("when")}
          optional={post.status === "draft"}
          error={fieldErrors.scheduled_at}
        >
          <Input
            id={id("when")}
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            aria-invalid={Boolean(fieldErrors.scheduled_at) || undefined}
          />
        </Field>
        <div className="flex flex-col gap-2">
          <Label htmlFor={id("notify")}>Email reminder</Label>
          <div className="flex h-11 items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-3.5">
            <span className="text-[13.5px] text-ink-2">{notify ? "On" : "Off"}</span>
            <Switch id={id("notify")} checked={notify} onCheckedChange={setNotify} />
          </div>
        </div>
      </div>

      <Field label="Task details" htmlFor={id("notes")} optional error={fieldErrors.notes}>
        <Textarea
          id={id("notes")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Assets to attach, approvals, links…"
          className="min-h-20"
        />
      </Field>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" size="sm" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={pending} disabled={over}>
          {post.status === "draft" && when ? "Save & schedule" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
