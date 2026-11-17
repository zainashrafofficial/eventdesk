import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EventForm } from "@/components/events/event-form";
import { requireUser } from "@/lib/auth/dal";
import { getEvent } from "@/lib/data/events";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, result] = await Promise.all([requireUser(`/dashboard/events/${id}/edit`), getEvent(id)]);
  if (!result) notFound();

  return (
    <div className="container-app pt-6 md:pt-8">
      <Link href={`/dashboard/events/${id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" /> Back to event
      </Link>
      <PageHeader eyebrow="Edit" title={result.event.title} className="pt-4 md:pt-6" />
      <EventForm userId={user.id} event={result.event} />
    </div>
  );
}
