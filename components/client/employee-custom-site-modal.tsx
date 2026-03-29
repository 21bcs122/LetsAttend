"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteCreateFormInner } from "@/components/client/site-create-form-inner";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** After Firestore write; refresh parent sites then select this id. */
  onCreated: (siteId: string) => void | Promise<void>;
};

/**
 * Full-screen overlay (portaled to document.body, same stacking as out-of-radius alert).
 */
export function EmployeeCustomSiteModal({ open, onOpenChange, onCreated }: Props) {
  const [mounted, setMounted] = React.useState(false);
  const [innerReset, setInnerReset] = React.useState(0);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setInnerReset((n) => n + 1);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  if (!open || !mounted || typeof document === "undefined") return null;

  const modal = (
    <div
      className={cn(
        "fixed inset-0 z-[8000] flex items-stretch justify-center overflow-y-auto p-0 sm:items-center sm:p-4",
        "bg-black/75 backdrop-blur-md"
      )}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-site-title"
        className={cn(
          "my-0 flex min-h-full w-full max-w-3xl flex-col shadow-2xl ring-1",
          "bg-white text-zinc-900 ring-zinc-200/80 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-zinc-700/80",
          "sm:my-auto sm:min-h-0 sm:max-h-[95vh] sm:rounded-2xl sm:border sm:border-zinc-200 dark:sm:border-zinc-700"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-700 md:px-8">
          <div>
            <h2
              id="custom-site-title"
              className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              Custom site
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Same setup as admin: search,{" "}
              <span className="font-medium text-zinc-800 dark:text-zinc-200">Locate me</span> at
              the job site for accurate GPS, then adjust the pin and radius. The site appears in your
              list when saved.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-5" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-8 md:pb-8">
          <SiteCreateFormInner
            key={innerReset}
            appearance="light"
            submitPath="/api/sites"
            onCreated={async (id) => {
              await onCreated(id);
              onOpenChange(false);
            }}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
