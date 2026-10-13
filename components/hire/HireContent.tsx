"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FILM_FAMILY, waLink } from "@/lib/film-family";
import { Facebook, Instagram, Mail, MessageCircle } from "lucide-react";
import type { CrewMember } from "@prisma/client";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { SplitText } from "@/components/motion/SplitText";
import { Reveal } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { cn } from "@/lib/utils";

export function HireContent({ crew }: { crew: CrewMember[] }) {
  const [role, setRole] = useState<string>("all");
  const [active, setActive] = useState<CrewMember | null>(null);
  const [eventDate, setEventDate] = useState("");
  const [brief, setBrief] = useState("");
  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const featured = crew.find((c) => c.featured) ?? crew[0];
  const family = useMemo(
    () =>
      crew.filter((c) => !c.featured && (role === "all" || c.role === role)),
    [crew, role],
  );
  const roles = useMemo(
    () => ["all", ...Array.from(new Set(crew.map((c) => c.role)))],
    [crew],
  );

  async function submitHire() {
    if (!active) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/hire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crewId: active.id,
          crewName: active.name,
          eventDate,
          brief,
          clientName,
          email,
          phone,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed");
      setMsg(data.confirmationMessage);
      setEventDate("");
      setBrief("");
      setClientName("");
      setEmail("");
      setPhone("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-32 sm:px-6 sm:pt-40">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.4em] text-zh-gold/80">
          ZH Film Family · Call sheet
        </p>
        <h1 className="mt-4 font-display text-5xl font-bold uppercase leading-[0.9] text-white sm:text-8xl">
          <SplitText text="Hire the house" />
        </h1>
        <p className="mt-4 text-sm text-zinc-400">
          Eight seats under one director. Start with {FILM_FAMILY.ceo} — or lock
          a photographer, editor, drone, sound, or expert.
        </p>
      </header>

      {featured ? (
        <Reveal>
          <section className="relative mt-12 overflow-hidden rounded-[2rem] border border-zh-gold/35 bg-gradient-to-br from-zinc-950 via-black to-zinc-950">
            <FavoriteButton
              type="crew"
              id={featured.id}
              title={featured.name}
              className="absolute right-5 top-5 z-10"
            />
            <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
              <div className="relative min-h-[320px] aspect-[4/3] lg:aspect-auto lg:min-h-full">
                <motion.div
                  className="absolute inset-0"
                  initial={{ scale: 1.25 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Image
                    src={featured.image}
                    alt={featured.name}
                    fill
                    className="object-cover"
                    sizes="(max-width:1024px) 100vw, 55vw"
                    priority
                  />
                </motion.div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-black/40 lg:to-black" />
              </div>
              <div className="relative flex flex-col justify-center p-6 sm:p-10">
                <p className="text-[10px] uppercase tracking-[0.4em] text-zh-gold">
                  Director&apos;s chair
                </p>
                <h2 className="mt-3 font-serif text-3xl text-white sm:text-4xl">
                  {featured.name}
                </h2>
                <p className="mt-2 text-xs uppercase tracking-[0.28em] text-zinc-400">
                  {featured.title}
                </p>
                <p className="mt-5 text-sm leading-relaxed text-zinc-300">
                  {featured.bio}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {featured.whatsapp ? (
                    <a
                      href={waLink(
                        `Hi ${featured.name}, I want to hire you via ZH Films.`,
                        featured.whatsapp,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-zh-gold/40 bg-zh-gold/10 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-zh-gold hover:bg-zh-gold hover:text-black"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  ) : null}
                  {featured.instagram ? (
                    <a
                      href={featured.instagram}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-zinc-300 hover:border-zh-gold/40 hover:text-zh-gold"
                    >
                      <Instagram className="h-3.5 w-3.5" /> Instagram
                    </a>
                  ) : null}
                  {featured.facebook ? (
                    <a
                      href={featured.facebook}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-zinc-300 hover:border-zh-gold/40 hover:text-zh-gold"
                    >
                      <Facebook className="h-3.5 w-3.5" /> Facebook
                    </a>
                  ) : null}
                  {featured.email ? (
                    <a
                      href={`mailto:${featured.email}`}
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-zinc-300 hover:border-zh-gold/40 hover:text-zh-gold"
                    >
                      <Mail className="h-3.5 w-3.5" /> Message
                    </a>
                  ) : null}
                </div>
                <Button
                  className="mt-6 w-full sm:w-auto"
                  onClick={() => setActive(featured)}
                >
                  Hire me — {featured.name.split(" ")[0]}
                </Button>
              </div>
            </div>
          </section>
        </Reveal>
      ) : null}

      <LayoutGroup>
        <div className="mt-14 flex flex-wrap gap-2">
          {roles.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={cn(
                "relative rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.22em] transition-colors",
                role === r
                  ? "border-transparent text-black"
                  : "border-white/10 text-zinc-400 hover:border-zh-gold/40 hover:text-white",
              )}
            >
              {role === r ? (
                <motion.span
                  layoutId="crew-role"
                  className="absolute inset-0 rounded-full bg-zh-gold"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              ) : null}
              <span className="relative">{r}</span>
            </button>
          ))}
        </div>

        <motion.div
          layout
          className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {family.map((t, i) => (
              <motion.article
                key={t.id}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { delay: i * 0.05, duration: 0.5 },
                }}
                exit={{
                  opacity: 0,
                  scale: 0.9,
                  transition: { duration: 0.25 },
                }}
              >
                <TiltCard
                  className="group h-full overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/50"
                  max={6}
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={t.image}
                      alt={t.name}
                      fill
                      className="object-cover transition duration-[1.2s] group-hover:scale-110"
                      sizes="(max-width:1024px) 50vw, 33vw"
                      loading="lazy"
                    />
                    <FavoriteButton
                      type="crew"
                      id={t.id}
                      title={t.name}
                      size="sm"
                      className="absolute right-3 top-3 z-30"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                    <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-zh-gold">
                      Seat {String(t.sortOrder + 1).padStart(2, "0")} · {t.role}
                    </span>
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="font-serif text-xl text-white">{t.name}</p>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                        {t.title}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 border-t border-white/10 p-4">
                    <p className="line-clamp-3 text-sm text-zinc-400">
                      {t.bio}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {t.whatsapp ? (
                        <a
                          href={waLink(
                            `Hi ${t.name}, hiring via ZH Film Family.`,
                            t.whatsapp,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] uppercase tracking-[0.2em] text-zh-gold hover:text-white"
                        >
                          WhatsApp
                        </a>
                      ) : null}
                      {t.instagram ? (
                        <a
                          href={t.instagram}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 hover:text-zh-gold"
                        >
                          Insta
                        </a>
                      ) : null}
                    </div>
                    <Button
                      size="sm"
                      variant="cinematic"
                      className="w-full"
                      onClick={() => setActive(t)}
                    >
                      Book on call sheet
                    </Button>
                  </div>
                </TiltCard>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      <Dialog
        open={!!active}
        onOpenChange={(o) => {
          if (!o) {
            setActive(null);
            setMsg(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{active?.name ?? "Hire"}</DialogTitle>
            <DialogDescription>
              Date stays open for other clients — your request is a separate
              card for admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block space-y-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
              Your name
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </label>
            <label className="block space-y-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
              Date
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </label>
            <label className="block space-y-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
              Brief
              <Input
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Wedding / AKU / commercial"
              />
            </label>
            <label className="block space-y-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
              Email
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block space-y-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
              Phone / WhatsApp
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            {msg ? (
              <p className="rounded-lg border border-zh-gold/30 bg-zh-gold/10 p-3 text-sm text-zh-gold">
                {msg}
              </p>
            ) : null}
            <Button
              className="w-full"
              disabled={busy}
              onClick={() => void submitHire()}
            >
              {busy ? "Sending…" : "Submit hire request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
