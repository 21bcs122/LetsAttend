import Link from "next/link";
import { AuthHeaderProfile } from "@/components/client/auth-header-profile";
import { ThemeToggle } from "@/components/client/theme-toggle";
import { MtesBrandLockup } from "@/components/client/mtes-brand-lockup";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-zinc-50 dark:bg-[#050505]">
      <div className="pointer-events-none absolute inset-0 hero-mesh opacity-60" />
      <header className="relative z-10 flex items-center justify-between px-3 py-4 md:px-6 md:py-5">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-foreground hover:text-cyan-600 dark:hover:text-cyan-400"
        >
          <span aria-hidden>←</span>
          <MtesBrandLockup variant="inline" showLogo={false} showVendor={false} />
        </Link>
        <div className="flex items-center gap-2">
          <AuthHeaderProfile />
          <ThemeToggle />
        </div>
      </header>
      <div className="relative z-10 flex flex-1 items-center justify-center p-3 md:p-6">
        {children}
      </div>
    </div>
  );
}
