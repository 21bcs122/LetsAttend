"use client";

import { Menu } from "lucide-react";
import { useDashboardUser } from "@/components/client/dashboard-user-context";
import { NotificationsDropdown } from "@/components/client/notifications-dropdown";
import { UserAccountDropdown } from "@/components/client/user-account-dropdown";

export function DashboardTopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, loading } = useDashboardUser();

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between gap-3 border-b border-zinc-200/80 bg-background/80 px-3 backdrop-blur-md dark:border-white/10 md:px-5">
      <button
        type="button"
        className="flex size-10 items-center justify-center rounded-xl border border-zinc-200/90 bg-white/80 text-foreground md:hidden dark:border-white/10 dark:bg-white/5"
        aria-label="Open menu"
        onClick={onMenuClick}
      >
        <Menu className="size-5" />
      </button>
      <div className="hidden flex-1 md:block" />
      <div className="flex flex-1 items-center justify-end gap-2">
        {loading ? (
          <div className="h-9 w-36 animate-pulse rounded-full bg-zinc-200/90 dark:bg-white/10" />
        ) : user ? (
          <>
            <NotificationsDropdown />
            <UserAccountDropdown user={user} />
          </>
        ) : null}
      </div>
    </header>
  );
}
