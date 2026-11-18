"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUpRight, FolderOpen, RefreshCw, Unplug } from "lucide-react";
import { syncAllPosts, disconnectDrive } from "@/lib/actions/drive";
import type { DriveStatus } from "@/types/db";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlay";
import { DriveMark } from "@/components/studio/post-card";
import { cn } from "@/lib/utils";

export function DriveStatusCard({ drive }: { drive: DriveStatus }) {
  const router = useRouter();
  const [syncing, startSync] = React.useTransition();

  function syncAll() {
    startSync(async () => {
      const res = await syncAllPosts();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const synced = res.data?.synced ?? 0;
      const failed = res.data?.failed ?? 0;
      if (failed > 0) toast.warning(`Synced ${synced} post${synced === 1 ? "" : "s"}, ${failed} failed`);
      else toast.success(synced ? `Synced ${synced} post${synced === 1 ? "" : "s"} to Drive` : "Everything is already up to date");
      router.refresh();
    });
  }

  async function disconnect() {
    const res = await disconnectDrive();
    if (res.ok) {
      toast.success("Google Drive disconnected");
      router.refresh();
    } else toast.error(res.error);
  }

  return (
    <section
      aria-labelledby="drive-title"
      className="relative overflow-hidden rounded-3xl border border-line bg-surface/80 p-5 shadow-soft backdrop-blur-xl md:p-6"
    >
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface-2 ring-1 ring-line">
          <DriveMark className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id="drive-title" className="text-[15px] font-semibold tracking-tight text-ink">
            Google Drive
          </h3>
          {drive.connected ? (
            <p className="mt-0.5 flex min-w-0 items-center gap-2 text-[13px] text-muted">
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inset-0 animate-pulse-dot rounded-full bg-success" />
                <span className="relative size-2 rounded-full bg-success" />
              </span>
              <span className="font-medium text-success">Connected</span>
              {drive.googleEmail && <span className="truncate">· {drive.googleEmail}</span>}
            </p>
          ) : (
            <p className="mt-0.5 flex items-center gap-2 text-[13px] text-muted">
              <span className={cn("size-2 rounded-full", drive.configured ? "bg-faint" : "bg-line-strong")} />
              {drive.configured ? "Not connected" : "Unavailable"}
            </p>
          )}
        </div>
      </div>

      {!drive.configured ? (
        <div className="mt-5 rounded-2xl bg-surface-2 px-4 py-3.5 ring-1 ring-line">
          <p className="text-[13.5px] font-medium text-ink-2">Drive sync isn&apos;t configured on this server</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
            Add <code className="rounded bg-ink/[0.06] px-1 py-px font-mono text-[11.5px]">GOOGLE_CLIENT_ID</code> and{" "}
            <code className="rounded bg-ink/[0.06] px-1 py-px font-mono text-[11.5px]">GOOGLE_CLIENT_SECRET</code> to enable it.
            Posts still save normally.
          </p>
        </div>
      ) : !drive.connected ? (
        <div className="mt-5 flex flex-col gap-4">
          <p className="text-[13.5px] leading-relaxed text-muted">
            Every post is saved as a Google Doc in a <span className="font-medium text-ink-2">&ldquo;Cadence Drafts&rdquo;</span>{" "}
            folder, so your team can review copy where they already work.
          </p>
          <Button asChild size="sm" className="w-full sm:w-auto">
            <a href="/api/drive/connect">
              <DriveMark className="size-4" /> Connect Google Drive
            </a>
          </Button>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          <p className="text-[13.5px] leading-relaxed text-muted">
            New and edited posts sync automatically to <span className="font-medium text-ink-2">Cadence Drafts</span>.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {drive.folderUrl && (
              <Button asChild variant="secondary" size="sm">
                <a href={drive.folderUrl} target="_blank" rel="noreferrer">
                  <FolderOpen /> Open folder <ArrowUpRight className="-ml-1 text-muted" />
                </a>
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={syncAll} disabled={syncing} aria-busy={syncing || undefined}>
              <RefreshCw className={cn(syncing && "animate-spin")} />
              {syncing ? "Syncing…" : "Sync all"}
            </Button>
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="sm" className="text-muted">
                  <Unplug /> Disconnect
                </Button>
              }
              title="Disconnect Google Drive?"
              description="Cadence will stop syncing posts. Docs already in your Drive stay where they are."
              confirmLabel="Disconnect"
              destructive
              onConfirm={disconnect}
            />
          </div>
        </div>
      )}
    </section>
  );
}
