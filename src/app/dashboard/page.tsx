import type { Metadata } from "next";
import { Studio, type DriveNotice } from "@/components/studio/studio";
import { getStudioData } from "@/lib/data/posts";

export const metadata: Metadata = { title: "Studio" };

type SearchParams = Promise<{ drive?: string | string[]; reason?: string | string[] }>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function StudioPage({ searchParams }: { searchParams: SearchParams }) {
  const [data, sp] = await Promise.all([getStudioData(), searchParams]);

  const drive = first(sp.drive);
  const reason = first(sp.reason);
  const driveNotice: DriveNotice =
    drive === "connected"
      ? { status: "connected" }
      : drive === "error"
        ? { status: "error", reason: reason ? reason.slice(0, 200) : null }
        : null;

  return <Studio data={data} driveNotice={driveNotice} />;
}
