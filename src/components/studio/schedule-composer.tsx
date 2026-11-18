"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, CalendarClock, FileText, Heart, MessageCircle, Repeat2, Send, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormAlert, describe } from "@/components/ui/form-alert";
import { Input, Textarea } from "@/components/ui/input";
import { createPost } from "@/lib/actions/posts";
import type { PostInput } from "@/lib/validation/post";
import { cn } from "@/lib/utils";
import { PLATFORM_LABELS, PLATFORM_LIMITS, type Platform, type Tone } from "@/types/db";
import { PlatformIcon } from "./platform-icon";
import { mergeHashtags, parseHashtags, postLength } from "./use-studio";

const MAX_NOTES = 1000;
const CHIP_SPRING = { type: "spring", stiffness: 480, damping: 32, mass: 0.7 } as const;

/** Format a Date as a `datetime-local` value in the viewer's own time zone. */
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nextHour() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

const QUICK_TIMES: { label: string; make: () => Date }[] = [
  {
    label: "In 1 hour",
    make: () => {
      const d = new Date(Date.now() + 60 * 60 * 1000);
      d.setSeconds(0, 0);
      return d;
    },
  },
  {
    label: "Tonight 8 PM",
    make: () => {
      const d = new Date();
      d.setHours(20, 0, 0, 0);
      if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
      return d;
    },
  },
  {
    label: "Tomorrow 9 AM",
    make: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
];

type Errors = Partial<Record<"caption" | "hashtags" | "scheduled_at" | "notes", string>>;

export function ScheduleComposer({
  caption,
  onCaptionChange,
  hashtags,
  onHashtagsChange,
  platform,
  tone,
  prompt,
  ownerEmail,
  onSaved,
  onCancel,
}: {
  caption: string;
  onCaptionChange: (v: string) => void;
  hashtags: string[];
  onHashtagsChange: (v: string[]) => void;
  platform: Platform;
  tone: Tone | null;
  prompt: string | null;
  ownerEmail: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [pendingAction, setPendingAction] = React.useState<"draft" | "scheduled" | null>(null);
  // datetime-local depends on the viewer's time zone. The composer only mounts after a client-side
  // selection (never during SSR), so the defaults are computed in the browser's own zone.
  const [when, setWhen] = React.useState(() => toLocalInput(nextHour()));
  const [minWhen] = React.useState(() => toLocalInput(new Date()));
  const [notes, setNotes] = React.useState("");
  const [notify, setNotify] = React.useState(true);
  const [tagDraft, setTagDraft] = React.useState("");
  const [errors, setErrors] = React.useState<Errors>({});
  const [formError, setFormError] = React.useState<string | null>(null);

  const limit = PLATFORM_LIMITS[platform];
  const length = postLength(caption, hashtags);
  const over = length > limit;
  const handle = ownerEmail.split("@")[0] || "you";
  const displayName = handle.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  function commitTags(raw: string) {
    const parsed = parseHashtags(raw);
    if (parsed.length) onHashtagsChange(mergeHashtags(hashtags, parsed));
    setTagDraft("");
  }

  function clearError(key: keyof Errors) {
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  function validate(status: "draft" | "scheduled"): Errors {
    const e: Errors = {};
    if (!caption.trim()) e.caption = "Write a caption before saving.";
    else if (over) e.caption = `${PLATFORM_LABELS[platform]} posts max out at ${limit.toLocaleString("en-US")} characters.`;
    if (status === "scheduled") {
      if (!when) e.scheduled_at = "Pick a date and time.";
      else if (new Date(when).getTime() <= Date.now()) e.scheduled_at = "Choose a time in the future.";
    } else if (when && Number.isNaN(new Date(when).getTime())) {
      e.scheduled_at = "That date doesn't look right.";
    }
    if (notes.length > MAX_NOTES) e.notes = `Keep task details under ${MAX_NOTES} characters.`;
    return e;
  }

  function submit(status: "draft" | "scheduled") {
    const pendingTags = parseHashtags(tagDraft);
    const allTags = pendingTags.length ? mergeHashtags(hashtags, pendingTags) : hashtags;
    if (pendingTags.length) {
      onHashtagsChange(allTags);
      setTagDraft("");
    }

    const found = validate(status);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;

    const input: PostInput = {
      caption: caption.trim(),
      hashtags: allTags,
      platform,
      tone,
      prompt,
      notes: notes.trim() ? notes.trim() : null,
      status,
      scheduled_at: when ? new Date(when).toISOString() : null,
      notify,
    };

    setPendingAction(status);
    startTransition(async () => {
      const res = await createPost(input);
      setPendingAction(null);
      if (res.ok) {
        const details = [
          res.data?.driveSynced ? "Synced to Google Drive" : null,
          res.data?.emailQueued ? "Confirmation email sent" : null,
        ].filter((d): d is string => d !== null);
        toast.success(res.message ?? (status === "scheduled" ? "Post scheduled" : "Draft saved"), {
          description: details.length ? details.join(" · ") : undefined,
        });
        setNotes("");
        setErrors({});
        onSaved();
        router.refresh();
      } else {
        setFormError(res.error);
        if (res.fieldErrors) {
          const fe = res.fieldErrors;
          setErrors({
            caption: fe.caption,
            hashtags: fe.hashtags ?? fe["hashtags.0"],
            scheduled_at: fe.scheduled_at,
            notes: fe.notes,
          });
        }
      }
    });
  }

  const previewTags = hashtags.map((t) => `#${t}`).join(" ");

  return (
    <section
      aria-labelledby="composer-title"
      className="glass relative overflow-hidden rounded-[28px] border border-line shadow-lift"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-accent/50 to-transparent"
      />
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-7">
        <div className="min-w-0">
          <p className="eyebrow text-accent">Step 3</p>
          <h2 id="composer-title" className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-ink">
            Polish &amp; schedule
          </h2>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel} aria-label="Close composer">
          <X />
        </Button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit("scheduled");
        }}
        className="grid min-w-0 gap-8 p-5 sm:p-7 xl:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]"
        noValidate
      >
        <div className="flex min-w-0 flex-col gap-6">
          <FormAlert message={formError} />

          <Field
            label="Caption"
            htmlFor="composer-caption"
            error={errors.caption}
            aside={
              <span className={cn("text-xs tabular transition-colors", over ? "font-medium text-warning" : "text-faint")}>
                {length.toLocaleString("en-US")} / {limit.toLocaleString("en-US")}
              </span>
            }
          >
            <Textarea
              {...describe("composer-caption", errors.caption)}
              value={caption}
              onChange={(e) => {
                onCaptionChange(e.target.value);
                clearError("caption");
              }}
              rows={5}
              className="min-h-36 field-sizing-content"
            />
          </Field>

          <Field label="Hashtags" htmlFor="composer-tags" error={errors.hashtags} hint="Separate with spaces, commas or Enter.">
            <div
              className={cn(
                "flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface px-2 py-1.5 transition-[border-color,box-shadow] duration-200 hover:border-line-strong focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15",
                errors.hashtags && "border-danger",
              )}
            >
              <AnimatePresence initial={false} mode="popLayout">
              {hashtags.map((tag) => (
                <motion.span
                  key={tag}
                  layout
                  initial={{ opacity: 0, scale: 0.7, filter: "blur(4px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.7, filter: "blur(4px)", transition: { duration: 0.14 } }}
                  transition={CHIP_SPRING}
                  className="inline-flex h-7 items-center gap-1 rounded-full bg-accent-soft pr-1 pl-2.5 text-[13px] font-medium text-accent"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => onHashtagsChange(hashtags.filter((t) => t !== tag))}
                    aria-label={`Remove #${tag}`}
                    className="grid size-5 place-items-center rounded-full transition-colors hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <X className="size-3" />
                  </button>
                </motion.span>
              ))}
              </AnimatePresence>
              <input
                {...describe("composer-tags", errors.hashtags)}
                value={tagDraft}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/[\s,]$/.test(v)) commitTags(v);
                  else setTagDraft(v);
                  clearError("hashtags");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitTags(tagDraft);
                  } else if (e.key === "Backspace" && !tagDraft && hashtags.length) {
                    onHashtagsChange(hashtags.slice(0, -1));
                  }
                }}
                onBlur={() => tagDraft && commitTags(tagDraft)}
                placeholder={hashtags.length ? "Add more…" : "#launch #coffee"}
                className="h-8 min-w-24 flex-1 bg-transparent px-1.5 text-base text-ink outline-none placeholder:text-faint md:text-[15px]"
              />
            </div>
          </Field>

          <Field label="When" htmlFor="composer-when" error={errors.scheduled_at} hint="Shown in your local time zone.">
            <div className="flex flex-col gap-2.5">
              <Input
                {...describe("composer-when", errors.scheduled_at)}
                type="datetime-local"
                value={when}
                min={minWhen}
                onChange={(e) => {
                  setWhen(e.target.value);
                  clearError("scheduled_at");
                }}
                className="tabular"
              />
              <div className="flex flex-wrap gap-2">
                {QUICK_TIMES.map((q) => (
                  <motion.button
                    key={q.label}
                    type="button"
                    onClick={() => {
                      setWhen(toLocalInput(q.make()));
                      clearError("scheduled_at");
                    }}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: "spring", stiffness: 520, damping: 28 }}
                    className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface px-3 text-[13px] text-ink-2 transition-[border-color,color,background-color] duration-200 hover:border-line-strong hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <CalendarClock className="size-3.5 text-muted" aria-hidden />
                    {q.label}
                  </motion.button>
                ))}
              </div>
            </div>
          </Field>

          <Field
            label="Task details"
            htmlFor="composer-notes"
            optional
            error={errors.notes}
            aside={<span className="text-xs text-faint tabular">{notes.length}/{MAX_NOTES}</span>}
          >
            <Textarea
              {...describe("composer-notes", errors.notes)}
              value={notes}
              maxLength={MAX_NOTES}
              onChange={(e) => {
                setNotes(e.target.value);
                clearError("notes");
              }}
              rows={3}
              placeholder="Shoot the product photo, tag @partner, add the link in bio…"
              className="min-h-24"
            />
          </Field>

          <label
            htmlFor="composer-notify"
            className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-line bg-surface/70 px-4 py-3.5 transition-colors hover:border-line-strong"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                <Bell className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">Email me a reminder</span>
                <span className="block truncate text-[13px] text-muted">Sent to {ownerEmail || "your inbox"}</span>
              </span>
            </span>
            <button
              id="composer-notify"
              type="button"
              role="switch"
              aria-checked={notify}
              onClick={() => setNotify((n) => !n)}
              className={cn(
                "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                notify ? "bg-accent" : "bg-ink/15",
              )}
            >
              <motion.span
                aria-hidden
                className="absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-soft"
                initial={false}
                animate={{ x: notify ? 20 : 0 }}
                transition={{ type: "spring", stiffness: 600, damping: 34 }}
              />
            </button>
          </label>

          {/* Two equal buttons that always fit the column (stack on very narrow screens). */}
          <div className="grid min-w-0 grid-cols-1 gap-3 pt-1 min-[420px]:grid-cols-2">
            <motion.div className="min-w-0" whileTap={pending ? undefined : { scale: 0.97 }} transition={{ type: "spring", stiffness: 520, damping: 28 }}>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full min-w-0 px-4"
              onClick={() => submit("draft")}
              loading={pending && pendingAction === "draft"}
              disabled={pending}
            >
              <FileText /> Save draft
            </Button>
            </motion.div>
            <motion.div className="min-w-0" whileTap={pending ? undefined : { scale: 0.97 }} transition={{ type: "spring", stiffness: 520, damping: 28 }}>
            <Button
              type="submit"
              size="lg"
              loading={pending && pendingAction === "scheduled"}
              disabled={pending}
              className="w-full min-w-0 px-4 shadow-lift"
            >
              <Send /> Schedule post
            </Button>
            </motion.div>
          </div>
        </div>

        {/* Live preview */}
        <aside aria-label="Post preview" className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          <p className="eyebrow mb-3 flex items-center gap-2">
            Preview
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">
              <span className="size-1.5 rounded-full bg-success" aria-hidden />
              Live
            </span>
          </p>
          <motion.div
            className="overflow-hidden rounded-3xl border border-line bg-surface shadow-soft"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.12 }}
          >
            <div className="flex items-center gap-3 px-4 pt-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-linear-to-br from-accent to-accent-hover text-sm font-semibold text-accent-ink">
                {displayName.charAt(0) || "Y"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
                <p className="truncate text-xs text-muted">@{handle} · Scheduled</p>
              </div>
              <PlatformIcon platform={platform} className="size-[18px] text-muted" />
            </div>
            {platform === "instagram" || platform === "tiktok" ? (
              <div className="mx-4 mt-4 aspect-square rounded-2xl bg-linear-to-br from-accent-soft via-surface-2 to-surface-3" />
            ) : null}
            <div className="px-4 pt-3 pb-4">
              <p className="text-[14px] leading-relaxed break-words whitespace-pre-line text-ink">
                {caption.trim() || <span className="text-faint">Your caption will appear here.</span>}
              </p>
              <AnimatePresence initial={false}>
                {previewTags && (
                  <motion.p
                    key="tags"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden text-[14px] leading-relaxed break-words text-accent"
                  >
                    <span className="block pt-2">{previewTags}</span>
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            {/* Character budget meter: grows as you type */}
            <div className="mx-4 mb-3 h-1 overflow-hidden rounded-full bg-ink/[0.06]" aria-hidden>
              <motion.div
                className={cn("h-full origin-left rounded-full", over ? "bg-warning" : "bg-accent")}
                initial={false}
                animate={{ scaleX: Math.min(1, length / limit) }}
                transition={{ type: "spring", stiffness: 200, damping: 30 }}
              />
            </div>
            <div className="flex items-center gap-5 border-t border-line px-4 py-3 text-muted" aria-hidden>
              <Heart className="size-4" />
              <MessageCircle className="size-4" />
              <Repeat2 className="size-4" />
              <span className="ml-auto text-xs tabular">
                {PLATFORM_LABELS[platform]} · {Math.max(0, limit - length).toLocaleString("en-US")} left
              </span>
            </div>
          </motion.div>
        </aside>
      </form>
    </section>
  );
}
