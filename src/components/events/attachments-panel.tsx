"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FileText, Loader2, Paperclip, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlay";
import { LocalTime } from "@/components/ui/local-time";
import { addAttachment, deleteAttachment } from "@/lib/actions/attachments";
import { createClient } from "@/lib/supabase/client";
import { ATTACHMENT_ACCEPT, ATTACHMENT_TYPES, BUCKET, attachmentPath, isImage, validateFile } from "@/lib/storage";
import { cn, formatBytes } from "@/lib/utils";
import type { AttachmentWithUrl } from "@/types/db";

type Upload = { key: string; name: string; status: "uploading" | "error"; error?: string };

/**
 * Cloud storage UI: drag-and-drop or pick files -> validate in the browser ->
 * upload to the private bucket -> record metadata via Server Action -> list with signed URLs.
 */
export function AttachmentsPanel({
  eventId,
  userId,
  attachments,
}: {
  eventId: string;
  userId: string;
  attachments: AttachmentWithUrl[];
}) {
  const router = useRouter();
  const [uploads, setUploads] = React.useState<Upload[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function uploadOne(file: File) {
    const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`;
    const problem = validateFile(file, ATTACHMENT_TYPES);
    if (problem) {
      toast.error(`${file.name}: ${problem}`);
      return false;
    }
    setUploads((u) => [...u, { key, name: file.name, status: "uploading" }]);

    const supabase = createClient();
    const path = attachmentPath(userId, eventId, file.name);
    try {
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error(error.message);

      const result = await addAttachment(eventId, {
        file_path: path,
        file_name: file.name.slice(0, 255),
        mime_type: file.type as (typeof ATTACHMENT_TYPES)[number],
        size_bytes: file.size,
      });
      if (!result.ok) {
        await supabase.storage.from(BUCKET).remove([path]); // roll back the orphan object
        throw new Error(result.error);
      }
      setUploads((u) => u.filter((x) => x.key !== key));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setUploads((u) => u.map((x) => (x.key === key ? { ...x, status: "error", error: message } : x)));
      toast.error(`${file.name}: ${message}`);
      return false;
    }
  }

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    const files = Array.from(list).slice(0, 10);
    let okCount = 0;
    for (const file of files) if (await uploadOne(file)) okCount++;
    if (okCount) {
      toast.success(okCount === 1 ? "File uploaded." : `${okCount} files uploaded.`);
      router.refresh();
    }
  }

  async function remove(id: string) {
    const result = await deleteAttachment(id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("File deleted.");
    router.refresh();
  }

  return (
    <section aria-labelledby="files-title" className="rounded-2xl border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 id="files-title" className="text-[15px] font-semibold text-ink">
            Files <span className="text-muted">({attachments.length})</span>
          </h2>
          <p className="text-[13px] text-muted">Stored privately in Supabase Storage</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          <Paperclip /> Add files
        </Button>
      </div>

      <div className="flex flex-col gap-4 p-5">
        <label
          htmlFor="attachments-input"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors",
            dragging ? "border-accent bg-accent-soft" : "border-line-strong bg-surface-2 hover:border-ink/30",
          )}
        >
          <UploadCloud className="size-6 text-muted" />
          <span className="text-sm font-medium text-ink">Drop files here or click to browse</span>
          <span className="text-xs text-muted">Images, PDF, TXT or DOCX · up to 10 MB each</span>
        </label>
        <input
          ref={inputRef}
          id="attachments-input"
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT}
          className="sr-only"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {uploads.length > 0 && (
          <ul className="flex flex-col gap-2" aria-live="polite">
            {uploads.map((u) => (
              <li
                key={u.key}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm",
                  u.status === "error" ? "border-danger/30 bg-danger-soft text-danger" : "border-line text-ink-2",
                )}
              >
                {u.status === "uploading" ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                <span className="min-w-0 flex-1 truncate">{u.name}</span>
                <span className="text-xs">{u.status === "uploading" ? "Uploading…" : u.error}</span>
                {u.status === "error" && (
                  <button type="button" className="text-xs font-medium underline" onClick={() => setUploads((x) => x.filter((y) => y.key !== u.key))}>
                    Dismiss
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {attachments.length === 0 && uploads.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted">No files yet. Add an agenda, poster or ticket.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {attachments.map((file) => (
              <li key={file.id} className="group flex items-center gap-3 rounded-xl border border-line p-2.5">
                <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-2">
                  {isImage(file.mime_type) && file.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.url} alt={file.file_name} className="size-full object-cover" loading="lazy" />
                  ) : (
                    <FileText className="size-5 text-muted" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink" title={file.file_name}>
                    {file.file_name}
                  </p>
                  <p className="text-xs text-muted">
                    {formatBytes(file.size_bytes)} · <LocalTime iso={file.created_at} />
                  </p>
                </div>
                <div className="flex shrink-0 items-center">
                  {file.url && (
                    <Button asChild variant="ghost" size="icon-sm" aria-label={`Open ${file.file_name}`}>
                      <a href={file.url} target="_blank" rel="noreferrer">
                        <Download />
                      </a>
                    </Button>
                  )}
                  <ConfirmDialog
                    title="Delete this file?"
                    description={`“${file.file_name}” will be removed from storage permanently.`}
                    confirmLabel="Delete file"
                    destructive
                    onConfirm={() => remove(file.id)}
                    trigger={
                      <Button variant="danger-ghost" size="icon-sm" aria-label={`Delete ${file.file_name}`}>
                        <Trash2 />
                      </Button>
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
