"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlay";
import { deleteEvent } from "@/lib/actions/events";

export function DeleteEventButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title="Delete this event?"
      description={`“${title}” and all of its files will be permanently deleted. This can't be undone.`}
      confirmLabel="Delete event"
      destructive
      onConfirm={async () => {
        const result = await deleteEvent(id);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Event deleted.");
        router.push("/dashboard/events");
        router.refresh();
      }}
      trigger={
        <Button variant="danger-ghost" size="sm">
          <Trash2 /> Delete
        </Button>
      }
    />
  );
}
