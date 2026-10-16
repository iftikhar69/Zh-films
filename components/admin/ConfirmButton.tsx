"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/** A destructive action behind a confirmation dialog, optionally requiring the user to type a word. */
export function ConfirmButton({
  label,
  title,
  body,
  confirmLabel = "Confirm",
  typeToConfirm,
  onConfirm,
  size = "sm",
  disabled
}: {
  label: React.ReactNode;
  title: string;
  body: string;
  confirmLabel?: string;
  typeToConfirm?: string;
  onConfirm: () => Promise<unknown> | unknown;
  size?: "sm" | "default";
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = !typeToConfirm || typed.trim() === typeToConfirm;
  return (
    <>
      <Button type="button" variant="outline" size={size} disabled={disabled} className="border-red-500/40 text-red-300 hover:bg-red-500/10" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{body}</DialogDescription>
          </DialogHeader>
          {typeToConfirm ? (
            <label className="block text-sm text-zinc-300">
              Type <span className="font-mono text-white">{typeToConfirm}</span> to confirm
              <Input value={typed} onChange={(e) => setTyped(e.target.value)} className="mt-2" autoComplete="off" />
            </label>
          ) : null}
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>
              Back
            </Button>
            <Button
              disabled={busy || !ready}
              className="bg-red-600 text-white hover:bg-red-500"
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                  setOpen(false);
                  setTyped("");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Working…" : confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
