"use client";

import * as React from "react";
import { LogOut, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme";
import { Avatar } from "@/components/ui/display";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/overlay";
import { signOut } from "@/lib/actions/auth";

type ShellUser = { email: string; fullName: string };

function UserMenu({ user }: { user: ShellUser }) {
  const formRef = React.useRef<HTMLFormElement>(null);
  return (
    <Menu>
      <MenuTrigger
        className="flex items-center gap-2 rounded-full p-0.5 outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        aria-label="Account menu"
      >
        <Avatar name={user.fullName} size={32} />
      </MenuTrigger>
      <MenuContent className="w-64 rounded-2xl p-2">
        <MenuLabel className="flex items-center gap-3 px-2 py-2">
          <Avatar name={user.fullName} size={36} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-[-0.01em] text-ink">{user.fullName}</span>
            <span className="block truncate text-xs font-normal tracking-normal text-muted">{user.email}</span>
          </span>
        </MenuLabel>
        <MenuSeparator />
        <MenuItem destructive onSelect={() => formRef.current?.requestSubmit()}>
          <LogOut /> Sign out
        </MenuItem>
      </MenuContent>
      <form ref={formRef} action={signOut} className="hidden" />
    </Menu>
  );
}

/** Single-page studio shell: one frosted top bar, full-width content (pages use `container-app`). */
export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="glass sticky top-0 z-50 border-b border-line/80">
        <div className="container-app flex h-14 items-center justify-between gap-3 md:h-16">
          <div className="flex min-w-0 items-center gap-3">
            <Logo href="/dashboard" />
            <span aria-hidden className="hidden h-5 w-px bg-line-strong sm:block" />
            <span className="hidden items-center gap-1.5 text-[13px] font-medium text-muted sm:inline-flex">
              <Sparkles className="size-3.5 text-accent" />
              Studio
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle className="size-9" />
            <UserMenu user={user} />
          </div>
        </div>
      </header>

      <main id="main" className="flex-1 pb-20">
        {children}
      </main>
    </div>
  );
}
