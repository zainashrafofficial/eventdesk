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
import { motion, useReducedMotion } from "motion/react";

const TAP = { scale: 0.95 } as const;
const SPRING = { type: "spring", stiffness: 520, damping: 30 } as const;

/** A doc gently arcs into a folder, on a loop. Purely decorative. */
function DocToFolder() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="relative h-[4.5rem] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-accent-soft/70 via-surface-2 to-surface-2 ring-1 ring-line">
      <div className="absolute inset-y-0 left-1/2 flex w-40 -translate-x-1/2 items-center justify-between">
        <motion.div
          className="relative h-10 w-8 rounded-md border border-line bg-surface p-1.5 shadow-soft"
          animate={reduce ? undefined : { x: [0, 52, 96], y: [0, -16, 4], rotate: [0, 8, 14], scale: [1, 0.92, 0.5], opacity: [1, 1, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 0.8, ease: [0.45, 0, 0.2, 1], times: [0, 0.55, 1] }}
        >
          <span className="block h-1 w-4 rounded-full bg-accent/70" />
          <span className="mt-1 block h-1 w-full rounded-full bg-ink/10" />
          <span className="mt-1 block h-1 w-3.5 rounded-full bg-ink/10" />
        </motion.div>
        <motion.div
          className="relative grid h-11 w-14 place-items-center"
          animate={reduce ? undefined : { scale: [1, 1, 1.08, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 0.8, times: [0, 0.8, 0.9, 1] }}
        >
          <svg viewBox="0 0 56 44" className="size-full drop-shadow-sm">
            <path d="M4 10a4 4 0 0 1 4-4h13l5 5h22a4 4 0 0 1 4 4v21a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" className="fill-accent/80" />
            <path d="M4 17a4 4 0 0 1 4-4h40a4 4 0 0 1 4 4v19a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" className="fill-accent" />
          </svg>
          <DriveMark className="absolute bottom-2 size-3.5" />
        </motion.div>
      </div>
    </div>
  );
}

export function DriveStatusCard({ drive }: { drive: DriveStatus }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const tap = reduce ? undefined : TAP;
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
      className="relative min-w-0 overflow-hidden rounded-3xl border border-line bg-surface/80 p-5 shadow-soft backdrop-blur-xl backdrop-saturate-150 md:p-6"
    >
      <div className="flex items-start gap-3.5">
        <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-surface to-surface-2 shadow-[0_1px_2px_rgb(var(--shadow-color)/0.06)] ring-1 ring-line">
          <DriveMark className="size-5" />
          {drive.connected && (
            <span className="absolute -bottom-0.5 -right-0.5 grid size-3.5 place-items-center rounded-full bg-surface ring-1 ring-line">
              <span className="size-2 rounded-full bg-success" />
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 id="drive-title" className="text-[15px] font-semibold tracking-tight text-ink">
            Google Drive
          </h3>
          {drive.connected ? (
            <p className="mt-0.5 flex min-w-0 items-center gap-2 text-[13px] text-muted">
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inset-0 animate-pulse-dot rounded-full bg-success motion-reduce:hidden" />
                <span className="relative size-2 rounded-full bg-success" />
              </span>
              <span className="shrink-0 font-medium text-success">Connected</span>
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
          <DocToFolder />
          <p className="text-[13.5px] leading-relaxed text-muted">
            Every post is saved as a Google Doc in a <span className="font-medium text-ink-2">&ldquo;Cadence Drafts&rdquo;</span>{" "}
            folder, so your team can review copy where they already work.
          </p>
          <motion.div whileTap={tap} transition={SPRING} className="w-full sm:w-auto sm:self-start">
            <Button asChild size="sm" className="w-full whitespace-nowrap sm:w-auto">
              <a href="/api/drive/connect">
                <span className="grid size-5 place-items-center rounded-full bg-white">
                  <DriveMark className="size-3.5" />
                </span>
                Connect Google Drive
              </a>
            </Button>
          </motion.div>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          <p className="text-[13.5px] leading-relaxed text-muted">
            New and edited posts sync automatically to <span className="font-medium text-ink-2">Cadence Drafts</span>.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {drive.folderUrl && (
              <motion.span whileTap={tap} transition={SPRING} className="inline-flex shrink-0">
                <Button asChild variant="secondary" size="sm" className="whitespace-nowrap">
                  <a href={drive.folderUrl} target="_blank" rel="noreferrer">
                    <FolderOpen /> Open folder <ArrowUpRight className="-ml-1 text-muted" />
                  </a>
                </Button>
              </motion.span>
            )}
            <motion.span whileTap={tap} transition={SPRING} className="inline-flex shrink-0">
              <Button
                variant="secondary"
                size="sm"
                className="whitespace-nowrap"
                onClick={syncAll}
                disabled={syncing}
                aria-busy={syncing || undefined}
              >
                <RefreshCw className={cn("transition-transform", syncing && "animate-spin motion-reduce:animate-none")} />
                {syncing ? "Syncing…" : "Sync all"}
              </Button>
            </motion.span>
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="sm" className="shrink-0 whitespace-nowrap text-muted hover:text-danger">
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
