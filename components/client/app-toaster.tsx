"use client";

import { useTheme } from "next-themes";
import { Toaster } from "sonner";

export function AppToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group border border-zinc-200/90 bg-white/95 text-zinc-900 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/95 dark:text-zinc-100",
          description: "text-zinc-600 dark:text-zinc-400",
        },
      }}
    />
  );
}
