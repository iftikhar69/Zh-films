"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FILM_FAMILY, waLink } from "@/lib/film-family";
import type { GearItem } from "@prisma/client";

type Mode = "rent" | "sell";

const CHAPTERS: { id: string; label: string; hint: string }[] = [
  { id: "all", label: "Full bay", hint: "Everything on the lot" },
  { id: "camera", label: "Cameras", hint: "Camera 1 · Sony & cinema bodies" },
  { id: "gimbal", label: "Gimbals", hint: "Stabilised walking kits" },
  { id: "car", label: "Cars", hint: "Crew carrier & hero cars" },
  { id: "lens", label: "Lenses", hint: "Glass leaving or circulating" }
];

export function GearBay({ items, mode }: { items: GearItem[]; mode: Mode }) {
  const [cat, setCat] = useState<string>("all");
  const [active, setActive] = useState<GearItem | null>(null);
  const [form, setForm] = useState({
    clientName: "",
    email: "",
    phone: "",
    startDate: "",
    endDate: "",
    message: ""
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(
    () => items.filter((g) => cat === "all" || g.category === cat),
    [items, cat]
  );
  const present = useMemo(() => new Set(items.map((g) => g.category)), [items]);
  const chapters = CHAPTERS.filter((c) => c.id === "all" || present.has(c.id));
  const cameraNumber = useMemo(() => {
    const map = new Map<string, number>();
    items
      .filter((g) => g.category === "camera")
      .forEach((g, i) => map.set(g.id, i + 1));
    return map;
  }, [items]);

  async function submit() {
    if (!active) return;
    setBusy(true);
    setMsg(null);
    try {
      const endpoint = mode === "rent" ? "/api/rent" : "/api/sell";
      const body =
        mode === "rent"
          ? {
              gearId: active.id,
              gearName: active.name,
              category: active.category,
              startDate: form.startDate,
              endDate: form.endDate,
              clientName: form.clientName,
              email: form.email,
              phone: form.phone,
              message: form.message
            }
          : {
              gearId: active.id,
              gearName: active.name,
              category: active.category,
              clientName: form.clientName,
              email: form.email,
              phone: form.phone,
              message: form.message
            };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed");
      setMsg(data.confirmationMessage);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
      {mode === "sell" ? (
        <div className="zh-callsheet mb-10 overflow-hidden rounded-[1.75rem] border border-zh-gold/35 bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-6 sm:p-8">
          <p className="text-[10px] uppercase tracking-[0.4em] text-zh-gold">Direct to the director</p>
          <h1 className="mt-3 font-serif text-3xl text-white sm:text-5xl">Vault sale</h1>
          <p className="mt-4 max-w-2xl text-sm text-zinc-300">
            Cameras and lenses leaving ZH rotation. {FILM_FAMILY.ceo} answers condition, hours, and price himself —
            WhatsApp, Instagram, or the inquiry card.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <a
              href={waLink(`Hi ${FILM_FAMILY.ceo}, I want to buy camera / lens from the ZH vault.`)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-zh-gold px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-black"
            >
              WhatsApp Zulfikar
            </a>
            <a
              href={FILM_FAMILY.instagram}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-zinc-300"
            >
              Instagram
            </a>
            <a
              href={FILM_FAMILY.facebook}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-zinc-300"
            >
              Facebook
            </a>
            <a
              href={`mailto:${FILM_FAMILY.email}`}
              className="rounded-full border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-zinc-300"
            >
              Email
            </a>
          </div>
        </div>
      ) : (
        <header className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.4em] text-zh-gold/80">Rental bay · numbered kits</p>
          <h1 className="mt-3 font-serif text-3xl text-white sm:text-5xl">Rent the lot</h1>
          <p className="mt-4 text-sm text-zinc-400">
            Camera 1 Sony. Gimbals. Production cars. Same glass ZH Films takes to weddings and AKU days.
          </p>
        </header>
      )}

      <div className="mt-8 flex flex-wrap gap-2">
        {chapters.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            className={`rounded-full border px-4 py-2 text-left ${
              cat === c.id ? "border-zh-gold/70 bg-zh-gold text-black" : "border-white/10 text-zinc-400"
            }`}
          >
            <span className="block text-[10px] uppercase tracking-[0.22em]">{c.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((g) => (
          <article key={g.id} className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/50">
            <div className="relative aspect-video">
              <Image src={g.image} alt={g.name} fill className="object-cover" sizes="(max-width:1024px) 50vw, 33vw" loading="lazy" />
              <div className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-zh-gold">
                {g.category === "camera" ? `Camera ${cameraNumber.get(g.id) ?? 1}` : g.category} · {g.brand}
              </div>
            </div>
            <div className="space-y-3 border-t border-white/10 p-4">
              <h2 className="font-serif text-xl text-white">{g.name}</h2>
              <p className="text-sm text-zinc-400">{g.description}</p>
              <p className="font-mono text-xs text-zh-gold">{g.priceLabel}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setActive(g);
                    setMsg(null);
                  }}
                >
                  {mode === "rent" ? "Request rental" : "Contact Zulfikar"}
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a
                    href={waLink(
                      mode === "rent"
                        ? `Hi ZH Films, I want to rent ${g.name}.`
                        : `Hi ${FILM_FAMILY.ceo}, interested in buying ${g.name}.`
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WA
                  </a>
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => (!o ? setActive(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{active?.name}</DialogTitle>
            <DialogDescription>
              {mode === "rent"
                ? "Rental inquiry to production office. Dates stay open — each client is a separate card."
                : `Direct line to ${FILM_FAMILY.ceo}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(["clientName", "email", "phone"] as const).map((k) => (
              <label key={k} className="block space-y-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
                {k === "clientName" ? "Your name" : k}
                <Input
                  type={k === "email" ? "email" : "text"}
                  value={form[k]}
                  onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                />
              </label>
            ))}
            {mode === "rent" ? (
              <>
                <label className="block space-y-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
                  Start date
                  <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
                </label>
                <label className="block space-y-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
                  End date
                  <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
                </label>
              </>
            ) : null}
            <label className="block space-y-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
              Message
              <Input value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder="Details…" />
            </label>
            {msg ? <p className="rounded-lg border border-zh-gold/30 bg-zh-gold/10 p-3 text-sm text-zh-gold">{msg}</p> : null}
            <Button className="w-full" disabled={busy} onClick={() => void submit()}>
              {busy ? "Sending…" : "Send inquiry"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
