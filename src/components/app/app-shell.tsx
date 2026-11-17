"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutDashboard, LogOut, Menu as MenuIcon, Plus } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeSwitch } from "@/components/theme";
import { Avatar } from "@/components/ui/display";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Sheet, SheetContent, SheetTrigger } from "@/components/ui/overlay";
import { appNav } from "@/config/site";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const ICONS = { overview: LayoutDashboard, events: CalendarDays, new: Plus } as const;

type ShellUser = { email: string; fullName: string };

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/dashboard/events") {
    return pathname.startsWith("/dashboard/events") && pathname !== "/dashboard/events/new";
  }
  return pathname === href;
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="App" className="flex flex-col gap-1">
      {appNav.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
              active ? "bg-ink text-paper" : "text-ink-2 hover:bg-ink/[0.05] hover:text-ink",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className={cn(
          "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink-2 transition-colors hover:bg-danger-soft hover:text-danger",
          className,
        )}
      >
        <LogOut className="size-4" />
        Sign out
      </button>
    </form>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  const formRef = React.useRef<HTMLFormElement>(null);
  return (
    <Menu>
      <MenuTrigger
        className="flex items-center gap-2 rounded-full p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label="Account menu"
      >
        <Avatar name={user.fullName} size={34} />
      </MenuTrigger>
      <MenuContent className="w-60">
        <MenuLabel className="normal-case tracking-normal">
          <span className="block truncate text-sm font-medium text-ink">{user.fullName}</span>
          <span className="block truncate text-xs text-muted">{user.email}</span>
        </MenuLabel>
        <MenuSeparator />
        <MenuItem asChild>
          <Link href="/dashboard/events/new">
            <Plus /> New event
          </Link>
        </MenuItem>
        <MenuItem destructive onSelect={() => formRef.current?.requestSubmit()}>
          <LogOut /> Sign out
        </MenuItem>
      </MenuContent>
      <form ref={formRef} action={signOut} className="hidden" />
    </Menu>
  );
}

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <Logo href="/dashboard" className="px-2" />
        <div className="mt-8 flex-1">
          <NavLinks />
        </div>
        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <div className="flex items-center gap-3 px-2">
            <Avatar name={user.fullName} size={34} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{user.fullName}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>
          <ThemeSwitch className="mx-2 self-start" />
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Top bar (mobile + tablet) */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-paper/85 px-4 backdrop-blur-md lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-ink/5"
              aria-label="Open navigation"
            >
              <MenuIcon className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" title="Navigation" className="p-5">
              <Logo href="/dashboard" />
              <div className="mt-8 flex-1">
                <NavLinks onNavigate={() => setOpen(false)} />
              </div>
              <div className="flex flex-col gap-3 border-t border-line pt-4">
                <ThemeSwitch className="self-start" />
                <SignOutButton />
              </div>
            </SheetContent>
          </Sheet>
          <Logo href="/dashboard" />
          <UserMenu user={user} />
        </header>

        <main id="main" className="flex-1 pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}
