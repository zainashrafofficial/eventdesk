import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { EventForm } from "@/components/events/event-form";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage() {
  const user = await requireUser("/dashboard/events/new");
  return (
    <div className="container-app">
      <PageHeader eyebrow="Create" title="New event" description="Fill in the details. Only the title, category, status and date are required." />
      <EventForm userId={user.id} />
    </div>
  );
}
