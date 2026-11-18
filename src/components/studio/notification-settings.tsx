"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, Mail, Send } from "lucide-react";
import { saveNotificationSettings, sendTestEmail } from "@/lib/actions/notifications";
import { REMINDER_PRESETS, type NotificationSettingsInput } from "@/lib/validation/notifications";
import type { NotificationSettings } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { FormAlert } from "@/components/ui/form-alert";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/overlay";
import { Switch } from "@/components/ui/switch";
import { cn, omit } from "@/lib/utils";
import { motion, useReducedMotion, type Variants } from "motion/react";

const STAGGER: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.08 } },
};
const ITEM: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 32 } },
};

const TIMEZONES = ["Asia/Karachi", "UTC", "Asia/Dubai", "Europe/London", "America/New_York", "Asia/Kolkata"];

export function reminderLabel(minutes: number) {
  if (minutes === 0) return "At post time";
  if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes === 1440 ? "" : "s"} before`;
  if (minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? "" : "s"} before`;
  return `${minutes} minutes before`;
}

function fromSettings(s: NotificationSettings): NotificationSettingsInput {
  return {
    email: s.email,
    enabled: s.enabled,
    notify_on_schedule: s.notify_on_schedule,
    remind_before_minutes: s.remind_before_minutes,
    include_caption: s.include_caption,
    subject_prefix: s.subject_prefix,
    timezone: s.timezone,
  };
}

export function NotificationSettingsSheet({ settings }: { settings: NotificationSettings }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" size="sm" className="shrink-0 whitespace-nowrap">
          <Bell /> Notifications
          {!settings.enabled && <span aria-hidden className="size-1.5 rounded-full bg-warning" />}
        </Button>
      </SheetTrigger>
      <SheetContent title="Notification settings" className="w-[min(28rem,calc(100vw-1.5rem))] bg-paper">
        {/* Remount the form whenever the sheet opens so it reflects the latest saved settings. */}
        {open && <SettingsForm settings={settings} onSaved={() => setOpen(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function SettingsForm({ settings, onSaved }: { settings: NotificationSettings; onSaved: () => void }) {
  const router = useRouter();
  const uid = React.useId();
  const id = (name: string) => `${uid}-${name}`;
  const [form, setForm] = React.useState<NotificationSettingsInput>(() => fromSettings(settings));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [saving, startSave] = React.useTransition();
  const [testing, startTest] = React.useTransition();
  const reduce = useReducedMotion();

  const set = <K extends keyof NotificationSettingsInput>(key: K, value: NotificationSettingsInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((prev) => omit(prev, key));
  };

  const presets = React.useMemo(() => {
    const list: number[] = [...REMINDER_PRESETS];
    if (!list.includes(form.remind_before_minutes)) list.push(form.remind_before_minutes);
    return list.sort((a, b) => a - b);
  }, [form.remind_before_minutes]);

  const zones = React.useMemo(
    () => (TIMEZONES.includes(form.timezone) ? TIMEZONES : [form.timezone, ...TIMEZONES]),
    [form.timezone],
  );

  const dirty = JSON.stringify(form) !== JSON.stringify(fromSettings(settings));
  const off = !form.enabled;

  const preview = React.useMemo(() => {
    const prefix = form.subject_prefix.trim() || "Cadence";
    const when = new Intl.DateTimeFormat("en-US", {
      timeZone: safeZone(form.timezone),
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(Date.UTC(2026, 10, 20, 9, 0)));
    const m = form.remind_before_minutes;
    const relative = m === 0 ? "now" : `in ${reminderLabel(m).replace(" before", "")}`;
    return {
      scheduled: `${prefix}: Post scheduled for ${when}`,
      reminder: `${prefix}: Your Instagram post goes live ${relative}`,
    };
  }, [form.subject_prefix, form.timezone, form.remind_before_minutes]);

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startSave(async () => {
      const res = await saveNotificationSettings({ ...form, email: form.email.trim(), subject_prefix: form.subject_prefix.trim() });
      if (res.ok) {
        toast.success("Notification settings saved");
        router.refresh();
        onSaved();
      } else {
        setError(res.error);
        setErrors(res.fieldErrors ?? {});
      }
    });
  }

  function test() {
    startTest(async () => {
      const res = await sendTestEmail();
      if (res.ok) toast.success(`Test email sent to ${res.data?.to ?? form.email}`);
      else toast.error(res.error);
    });
  }

  return (
    <form onSubmit={save} className="flex min-h-0 flex-1 flex-col" noValidate>
      <motion.div
        className="px-5 pb-2 pt-7 sm:px-6"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
      >
        <motion.span
          className="grid size-11 place-items-center rounded-[0.9rem] bg-gradient-to-b from-accent to-accent-hover text-accent-ink shadow-soft"
          initial={reduce ? false : { scale: 0.6, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.05 }}
        >
          <Bell className="size-5" />
        </motion.span>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Notifications</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Cadence emails you when a post is scheduled and again right before it goes live.
        </p>
      </motion.div>

      <motion.div
        className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5 sm:px-6"
        variants={reduce ? undefined : STAGGER}
        initial={reduce ? false : "hidden"}
        animate="show"
      >
        <FormAlert message={error} />

        <motion.div variants={reduce ? undefined : ITEM}>
        <Group>
          <Row label="Email notifications" htmlFor={id("enabled")} hint={off ? "All emails are paused" : undefined}>
            <Switch id={id("enabled")} checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} />
          </Row>
        </Group>
        </motion.div>

        <motion.div
          animate={{ opacity: off ? 0.45 : 1 }}
          transition={{ duration: 0.25 }}
          className={cn("flex flex-col gap-6", off && "pointer-events-none")}
          aria-disabled={off || undefined}
        >
          <GroupSection title="Deliver to" error={errors.email}>
            <Group>
              <div className="flex items-center gap-3 px-4">
                <Mail className="size-4 shrink-0 text-muted" aria-hidden />
                <label htmlFor={id("email")} className="sr-only">
                  Email address
                </label>
                <input
                  id={id("email")}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={form.email}
                  disabled={off}
                  onChange={(e) => set("email", e.target.value)}
                  aria-invalid={Boolean(errors.email) || undefined}
                  aria-describedby={errors.email ? `${id("email")}-error` : undefined}
                  placeholder="you@company.com"
                  className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
                />
              </div>
            </Group>
          </GroupSection>

          <GroupSection title="Emails">
            <Group>
              <Row label="Confirm when a post is scheduled" htmlFor={id("on-schedule")}>
                <Switch
                  id={id("on-schedule")}
                  checked={form.notify_on_schedule}
                  disabled={off}
                  onCheckedChange={(v) => set("notify_on_schedule", v)}
                />
              </Row>
              <Row label="Include caption in emails" htmlFor={id("caption")}>
                <Switch
                  id={id("caption")}
                  checked={form.include_caption}
                  disabled={off}
                  onCheckedChange={(v) => set("include_caption", v)}
                />
              </Row>
              <Row label="Reminder" htmlFor={id("remind")}>
                <InlineSelect
                  id={id("remind")}
                  value={String(form.remind_before_minutes)}
                  disabled={off}
                  onChange={(v) => set("remind_before_minutes", Number(v))}
                >
                  {presets.map((m) => (
                    <option key={m} value={m}>
                      {reminderLabel(m)}
                    </option>
                  ))}
                </InlineSelect>
              </Row>
              <Row label="Time zone" htmlFor={id("tz")}>
                <InlineSelect id={id("tz")} value={form.timezone} disabled={off} onChange={(v) => set("timezone", v)}>
                  {zones.map((z) => (
                    <option key={z} value={z}>
                      {z.replace("_", " ")}
                    </option>
                  ))}
                </InlineSelect>
              </Row>
            </Group>
            {(errors.remind_before_minutes || errors.timezone) && (
              <p role="alert" className="px-1 text-[13px] text-danger">
                {errors.remind_before_minutes ?? errors.timezone}
              </p>
            )}
          </GroupSection>

          <GroupSection title="Subject line" error={errors.subject_prefix}>
            <Input
              id={id("prefix")}
              aria-label="Subject prefix"
              value={form.subject_prefix}
              disabled={off}
              maxLength={40}
              onChange={(e) => set("subject_prefix", e.target.value)}
              placeholder="Cadence"
              aria-invalid={Boolean(errors.subject_prefix) || undefined}
              className="h-12 rounded-2xl"
            />
            <div className="rounded-2xl border border-line bg-surface/70 px-4 py-3.5" aria-live="polite">
              <p className="eyebrow">Preview</p>
              <ul className="mt-2 flex flex-col gap-2">
                {[preview.scheduled, preview.reminder].map((subject) => (
                  <li key={subject} className="flex items-start gap-2.5">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                    <span className="min-w-0 break-words text-[13.5px] font-medium leading-snug text-ink">{subject}</span>
                  </li>
                ))}
              </ul>
            </div>
          </GroupSection>
        </motion.div>
      </motion.div>

      <div className="flex flex-col-reverse gap-2 border-t border-line bg-surface/80 px-5 py-4 backdrop-blur-xl backdrop-saturate-150 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Button type="button" variant="ghost" size="sm" className="whitespace-nowrap" onClick={test} loading={testing} disabled={off}>
          <Send /> Send test email
        </Button>
        <motion.div whileTap={reduce || !dirty ? undefined : { scale: 0.96 }} className="flex">
          <Button type="submit" size="sm" className="w-full whitespace-nowrap sm:w-auto" loading={saving} disabled={!dirty}>
            Save settings
          </Button>
        </motion.div>
      </div>
    </form>
  );
}

function safeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

/* ------------------------------------------------------------------ */
/*  Apple-settings style building blocks                               */
/* ------------------------------------------------------------------ */

function GroupSection({ title, error, children }: { title: string; error?: string; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div variants={reduce ? undefined : ITEM} className="flex flex-col gap-2">
      <p className="px-4 text-[12px] font-medium uppercase tracking-[0.06em] text-muted">{title}</p>
      {children}
      {error && (
        <p role="alert" className="px-4 text-[13px] text-danger">
          {error}
        </p>
      )}
    </motion.div>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgb(var(--shadow-color)/0.03)] [&>*+*]:relative [&>*+*]:before:absolute [&>*+*]:before:inset-x-0 [&>*+*]:before:left-4 [&>*+*]:before:top-0 [&>*+*]:before:h-px [&>*+*]:before:bg-line">
      {children}
    </div>
  );
}

function Row({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-13 items-center justify-between gap-4 px-4 py-2.5 transition-colors duration-200 hover:bg-ink/[0.02]">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="block cursor-pointer text-[14.5px] text-ink">
          {label}
        </label>
        {hint && <p className="text-[12px] text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function InlineSelect({
  id,
  value,
  onChange,
  disabled,
  children,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="w-[11.5rem] shrink-0">
      <NativeSelect
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-full border-transparent bg-surface-2 text-right text-[13.5px] text-ink-2 hover:border-line md:text-[13.5px]"
      >
        {children}
      </NativeSelect>
    </div>
  );
}
