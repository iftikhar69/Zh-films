"use client";

import { useEffect, useState } from "react";
import { useCinemaStore } from "@/stores/cinema-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSoundscape } from "@/hooks/useSoundscape";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const STORAGE_KEY = "zh-directors-cut-dismissed";

const schema = z.object({
  email: z.string().email("Enter a valid email")
});
type Values = z.infer<typeof schema>;

export function DirectorsCutClub() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [code, setCode] = useState<string | null>(null);
  const soundEnabled = useCinemaStore((s) => s.soundEnabled);
  const { pianoSwell, shutter } = useSoundscape();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.sessionStorage.getItem(STORAGE_KEY);
    if (dismissed) return;
    const show = () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(t);
      setOpen(true);
    };
    const onScroll = () => {
      const depth = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
      if (depth > 0.6 && window.scrollY > 1200) show();
    };
    const t = window.setTimeout(show, 25000);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open || !soundEnabled) return;
    pianoSwell();
  }, [open, soundEnabled, pianoSwell]);

  const onSubmit = handleSubmit(async (v) => {
    setStatus("loading");
    shutter();
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: v.email, source: "directors_cut" })
      });
      const data = (await res.json()) as { ok?: boolean; discountCode?: string };
      if (!res.ok || !data.ok) throw new Error("bad");
      setCode(data.discountCode ?? "DIRECTOR15");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) window.sessionStorage.setItem(STORAGE_KEY, "1");
      }}
    >
      <DialogContent className="border-zh-gold/40 bg-[radial-gradient(circle_at_top,rgba(200,169,106,0.18),transparent_55%),linear-gradient(to_bottom,#050505,black)]">
        <DialogHeader>
          <DialogTitle>Director&apos;s Cut Club</DialogTitle>
          <DialogDescription>
            Private grade previews, set-life drops, and a welcome gift for your first cinematic package.
          </DialogDescription>
        </DialogHeader>
        {status === "done" ? (
          <div className="space-y-3 rounded-md border border-zh-gold/30 bg-black/60 p-4 text-sm text-zinc-200">
            <p>You&apos;re in. Use this code at checkout for an instant discount on your first booking.</p>
            <p className="font-mono text-lg tracking-[0.35em] text-zh-gold">{code}</p>
            <Button type="button" variant="outline" className="w-full" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="you@email.com"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email?.message ? (
              <p className="text-xs text-red-400">{errors.email.message}</p>
            ) : null}
            {status === "error" && (
              <p className="text-xs text-red-400">Something went wrong — try again in a moment.</p>
            )}
            <Button type="submit" className="w-full" disabled={status === "loading"}>
              {status === "loading" ? "Rolling…" : "Unlock 15% Director’s Cut"}
            </Button>
            <p className="text-[11px] text-zinc-500">
              No spam — only cinematic notes from Zulfikar&apos;s desk in Lahore.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
