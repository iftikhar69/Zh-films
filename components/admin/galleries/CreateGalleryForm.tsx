"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postJson } from "@/lib/upload-client";

export function CreateGalleryForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="grid gap-3 rounded-2xl border border-white/10 bg-zinc-950/50 p-5 sm:grid-cols-[1fr_200px_auto] sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const { gallery } = await postJson<{ gallery: { id: string } }>("/api/admin/galleries", { title, eventDate });
          router.push(`/admin/galleries/${gallery.id}`);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Couldn't create the gallery");
          setBusy(false);
        }
      }}
    >
      <label className="block space-y-1 text-xs text-zinc-400">
        <span>Gallery title</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Hussain family — Walima" required />
      </label>
      <label className="block space-y-1 text-xs text-zinc-400">
        <span>Event date (optional)</span>
        <Input value={eventDate} onChange={(e) => setEventDate(e.target.value)} maxLength={40} placeholder="e.g. March 2026" />
      </label>
      <Button type="submit" disabled={busy || title.trim().length < 2}>
        {busy ? "Creating…" : "Create gallery"}
      </Button>
    </form>
  );
}
