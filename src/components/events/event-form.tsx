"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { FormAlert, describe } from "@/components/ui/form-alert";
import { LocationSearch, type PickedLocation } from "@/components/events/location-search";
import { CATEGORY_LABELS, EVENT_CATEGORIES, EVENT_STATUSES, STATUS_META, type EventCategory, type EventStatus } from "@/config/events";
import { createEvent, updateEvent } from "@/lib/actions/events";
import { zodFieldErrors } from "@/lib/actions/types";
import { createClient } from "@/lib/supabase/client";
import { BUCKET, IMAGE_ACCEPT, IMAGE_TYPES, coverPath, validateFile } from "@/lib/storage";
import { eventSchema, type EventInput } from "@/lib/validation/event";
import { formatBytes, omit } from "@/lib/utils";
import type { EventWithCover } from "@/types/db";

/** ISO timestamp -> value for <input type="datetime-local"> in the viewer's time zone. */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

type Values = {
  title: string;
  description: string;
  category: EventCategory;
  status: EventStatus;
  startsLocal: string;
  capacity: string;
};

export function EventForm({ userId, event }: { userId: string; event?: EventWithCover }) {
  const router = useRouter();
  const isEdit = Boolean(event);

  const [values, setValues] = React.useState<Values>({
    title: event?.title ?? "",
    description: event?.description ?? "",
    category: event?.category ?? "meetup",
    status: event?.status ?? "planned",
    startsLocal: "",
    capacity: event?.capacity ? String(event.capacity) : "",
  });
  const [location, setLocation] = React.useState<PickedLocation | null>(
    event?.latitude != null && event?.longitude != null
      ? { name: event.location_name ?? "Saved location", latitude: event.latitude, longitude: event.longitude }
      : null,
  );
  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [coverPreview, setCoverPreview] = React.useState<string | null>(event?.cover_url ?? null);
  const [keepCover, setKeepCover] = React.useState(Boolean(event?.cover_path));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // datetime-local depends on the viewer's time zone, so fill it after hydration.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (event?.starts_at) setValues((v) => ({ ...v, startsLocal: toLocalInput(event.starts_at) }));
  }, [event?.starts_at]);

  // Release object URLs for local previews.
  React.useEffect(() => {
    return () => {
      if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => omit(e, key === "startsLocal" ? "starts_at" : key));
  };

  const onCoverChange = (file: File | null) => {
    setErrors((e) => omit(e, "cover"));
    if (!file) return;
    const problem = validateFile(file, IMAGE_TYPES);
    if (problem) {
      setErrors((e) => ({ ...e, cover: problem }));
      return;
    }
    setCoverFile(file);
    setKeepCover(false);
    setCoverPreview(URL.createObjectURL(file));
  };

  const removeCover = () => {
    setCoverFile(null);
    setKeepCover(false);
    setCoverPreview(null);
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const input: EventInput = {
      title: values.title,
      description: values.description,
      category: values.category,
      status: values.status,
      starts_at: values.startsLocal ? new Date(values.startsLocal).toISOString() : "",
      capacity: values.capacity.trim() === "" ? null : Number(values.capacity),
      location_name: location?.name ?? null,
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      cover_path: keepCover ? (event?.cover_path ?? null) : null,
    };

    // 1) Client-side validation with the shared schema.
    const check = eventSchema.safeParse(input);
    if (!check.success) {
      const fe = zodFieldErrors(check.error);
      setErrors(fe);
      setFormError("Check the highlighted fields.");
      document.querySelector<HTMLElement>(`[data-field="${Object.keys(fe)[0]}"] input, [data-field="${Object.keys(fe)[0]}"] textarea, [data-field="${Object.keys(fe)[0]}"] select`)?.focus();
      return;
    }

    setSaving(true);
    const supabase = createClient();
    let uploadedPath: string | null = null;

    try {
      // 2) Upload a new cover straight to the private bucket (storage RLS checks the folder).
      if (coverFile) {
        const path = coverPath(userId, coverFile.name);
        const { error } = await supabase.storage.from(BUCKET).upload(path, coverFile, {
          contentType: coverFile.type,
          cacheControl: "3600",
          upsert: false,
        });
        if (error) throw new Error(`Cover upload failed: ${error.message}`);
        uploadedPath = path;
        input.cover_path = path;
      }

      // 3) Persist through the Server Action (validates again on the server).
      const result = event ? await updateEvent(event.id, input) : await createEvent(input);
      if (!result.ok) {
        if (uploadedPath) await supabase.storage.from(BUCKET).remove([uploadedPath]);
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
        return;
      }

      toast.success(result.message ?? "Saved.");
      router.push(`/dashboard/events/${result.data?.id ?? event?.id}`);
      router.refresh();
    } catch (err) {
      if (uploadedPath) await supabase.storage.from(BUCKET).remove([uploadedPath]);
      setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
      <FormAlert message={formError} />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-5 md:p-7">
          <Field label="Title" htmlFor="title" error={errors.title} required>
            <div data-field="title">
              <Input
                {...describe("title", errors.title)}
                value={values.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Annual Tech Meetup"
                maxLength={120}
                required
              />
            </div>
          </Field>

          <Field label="Description" htmlFor="description" error={errors.description} optional hint={`${values.description.length}/2000`}>
            <div data-field="description">
              <Textarea
                {...describe("description", errors.description)}
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Agenda, speakers, what to bring…"
                maxLength={2000}
                rows={5}
              />
            </div>
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Category" htmlFor="category" error={errors.category} required>
              <div data-field="category">
                <NativeSelect
                  {...describe("category", errors.category)}
                  value={values.category}
                  onChange={(e) => set("category", e.target.value as EventCategory)}
                >
                  {EVENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </Field>
            <Field label="Status" htmlFor="status" error={errors.status} required>
              <div data-field="status">
                <NativeSelect
                  {...describe("status", errors.status)}
                  value={values.status}
                  onChange={(e) => set("status", e.target.value as EventStatus)}
                >
                  {EVENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_META[s].label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </Field>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Date & time" htmlFor="starts_at" error={errors.starts_at} required>
              <div data-field="starts_at">
                <Input
                  {...describe("starts_at", errors.starts_at)}
                  type="datetime-local"
                  value={values.startsLocal}
                  onChange={(e) => set("startsLocal", e.target.value)}
                  required
                />
              </div>
            </Field>
            <Field label="Capacity" htmlFor="capacity" error={errors.capacity} optional>
              <div data-field="capacity">
                <Input
                  {...describe("capacity", errors.capacity)}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100000}
                  step={1}
                  value={values.capacity}
                  onChange={(e) => set("capacity", e.target.value)}
                  placeholder="e.g. 50"
                />
              </div>
            </Field>
          </div>

          <Field
            label="Venue"
            htmlFor="location"
            error={errors.location_name}
            optional
            hint="Search a city to see the venue map and weather forecast on the event page."
          >
            <div data-field="location_name">
              <LocationSearch
                id="location"
                value={location}
                onChange={(v) => {
                  setLocation(v);
                  setErrors((e) => omit(e, "location_name"));
                }}
                invalid={Boolean(errors.location_name)}
                describedBy={errors.location_name ? "location-error" : "location-hint"}
              />
            </div>
          </Field>
        </div>

        {/* Cover image */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm font-medium text-ink">Cover image</p>
            <p className="mt-1 text-[13px] text-muted">PNG, JPG, WebP or GIF, up to 10 MB.</p>
            <div className="mt-4 overflow-hidden rounded-xl border border-dashed border-line-strong bg-surface-2">
              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreview} alt="Cover preview" className="aspect-[16/10] w-full object-cover" />
              ) : (
                <label
                  htmlFor="cover"
                  className="flex aspect-[16/10] cursor-pointer flex-col items-center justify-center gap-2 text-sm text-muted hover:text-ink"
                >
                  <ImagePlus className="size-6" />
                  Choose an image
                </label>
              )}
            </div>
            <input
              id="cover"
              type="file"
              accept={IMAGE_ACCEPT}
              className="sr-only"
              onChange={(e) => {
                onCoverChange(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            {coverFile && (
              <p className="mt-2 truncate text-xs text-muted">
                {coverFile.name} · {formatBytes(coverFile.size)}
              </p>
            )}
            {errors.cover && (
              <p role="alert" className="mt-2 text-[13px] text-danger">
                {errors.cover}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <Button asChild variant="secondary" size="sm">
                <label htmlFor="cover">{coverPreview ? "Replace" : "Upload"}</label>
              </Button>
              {coverPreview && (
                <Button type="button" variant="danger-ghost" size="sm" onClick={removeCover}>
                  <Trash2 /> Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-20 -mx-5 flex flex-col-reverse gap-2 border-t border-line bg-paper/90 px-5 py-4 backdrop-blur-md sm:flex-row sm:justify-end md:-mx-8 md:px-8">
        <Button type="button" variant="secondary" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {isEdit ? "Save changes" : "Create event"}
        </Button>
      </div>
    </form>
  );
}
