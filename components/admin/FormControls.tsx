"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3", disabled && "cursor-not-allowed opacity-60")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors",
          checked ? "border-emerald-400/60 bg-emerald-500/80" : "border-white/15 bg-zinc-800"
        )}
      >
        <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", checked ? "translate-x-4" : "translate-x-0.5")} />
      </button>
      <span className="text-sm text-zinc-200">
        {label}
        <span className={cn("ml-2 text-[10px] uppercase tracking-[0.18em]", checked ? "text-emerald-300" : "text-zinc-500")}>{checked ? "On" : "Off"}</span>
        {hint ? <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span> : null}
      </span>
    </label>
  );
}

/** Stays visible while there are unsaved edits, so a switch never looks saved when it isn't. */
export function SaveBar({ dirty, busy, label, onDiscard }: { dirty: boolean; busy: boolean; label: string; onDiscard: () => void }) {
  return (
    <div
      className={cn(
        "sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors",
        dirty ? "border-amber-400/40 bg-zinc-950/95 shadow-2xl" : "border-white/10 bg-zinc-950/80"
      )}
      role="status"
      aria-live="polite"
    >
      <p className={cn("text-sm", dirty ? "text-amber-200" : "text-zinc-500")}>{busy ? "Saving…" : dirty ? "You have unsaved changes" : "All changes saved"}</p>
      <div className="flex gap-2">
        {dirty && !busy ? (
          <Button type="button" variant="ghost" onClick={onDiscard}>
            Discard
          </Button>
        ) : null}
        <Button type="submit" disabled={busy || !dirty}>
          {busy ? <Loader2 className="animate-spin" /> : null}
          {label}
        </Button>
      </div>
    </div>
  );
}
