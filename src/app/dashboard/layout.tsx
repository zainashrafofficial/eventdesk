import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Dashboard" };

/** Every page under /dashboard requires a session (checked here AND in the proxy). */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/dashboard");
  return <AppShell user={{ email: user.email, fullName: user.fullName }}>{children}</AppShell>;
}
