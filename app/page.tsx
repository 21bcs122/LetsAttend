import Image from "next/image";
import { BrowserTimeZoneSync } from "@/components/client/browser-timezone-sync";
import { DashboardUserProvider } from "@/components/client/dashboard-user-context";
import { LandingTopBar } from "@/components/client/landing-top-bar";
import { LandingHeroButtons } from "@/components/client/landing-hero-buttons";
import { LocalTimezoneClock } from "@/components/client/local-timezone-clock";
import { MtesBrandHeaderLink } from "@/components/client/mtes-brand-lockup";

export default function HomePage() {
  return (
    <DashboardUserProvider>
      <BrowserTimeZoneSync />
      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-mesh opacity-90 dark:opacity-100" />
        <header className="relative z-10 flex items-center justify-between gap-3 px-3 py-4 md:px-6 md:py-5">
          <MtesBrandHeaderLink className="max-w-[min(100%,14rem)] md:max-w-md" />
          <LandingTopBar />
        </header>

        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-3 pb-20 pt-2 text-center md:px-6 md:pb-24 md:pt-6">
          <div className="mb-8 flex w-full max-w-lg flex-col items-center md:mb-10">
            <Image
              src="/branding/mtes-logo.png"
              alt="MTES"
              width={160}
              height={120}
              className="h-16 w-auto object-contain md:h-24"
              priority
            />
            <div className="mt-4 w-full max-w-md space-y-1.5 px-1">
              <p className="text-center text-[10px] font-semibold uppercase leading-snug tracking-[0.14em] text-zinc-600 dark:text-zinc-400 md:text-xs md:tracking-[0.2em]">
                Mass Technology and Engineering
              </p>
              <p className="text-center text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-500 md:text-[11px] md:tracking-[0.28em]">
                Solution Pvt Ltd
              </p>
            </div>
          </div>

          <p className="mb-3 text-[10px] uppercase tracking-[0.28em] text-violet-500 dark:text-cyan-400 md:mb-4 md:text-xs md:tracking-[0.35em]">
            Workplace attendance
          </p>
          <h1 className="max-w-3xl text-xl font-semibold leading-snug tracking-tight text-balance sm:text-2xl sm:leading-snug md:text-4xl md:leading-tight lg:text-5xl">
            <span className="md:hidden">
              Record when and where
              <br />
              your teams work—clearly
              <br />
              and on the job site.
            </span>
            <span className="hidden md:block">
              Record when and where your teams work—clearly
              <br />
              and on the job site.
            </span>
          </h1>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <LandingHeroButtons />
          </div>

          <LocalTimezoneClock className="mt-14 max-w-lg" />

          <div className="mt-20 grid w-full max-w-4xl gap-4 sm:grid-cols-3">
            {[
              {
                t: "On-site check-in",
                d: "Check-ins only count inside the work area your company defines.",
              },
              {
                t: "Photo proof",
                d: "A quick selfie ties each clock-in to a real person.",
              },
              {
                t: "Live visibility",
                d: "After check-in, admins can see active workers on the map.",
              },
            ].map((x) => (
              <div
                key={x.t}
                className="glass-panel rounded-2xl p-5 text-left shadow-[0_0_40px_-20px_rgba(139,92,246,0.5)]"
              >
                <p className="font-medium text-foreground">{x.t}</p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{x.d}</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </DashboardUserProvider>
  );
}
