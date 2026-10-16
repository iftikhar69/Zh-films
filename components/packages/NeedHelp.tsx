"use client";

import { useState } from "react";
import { Mail, MessageCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { FILM_FAMILY, waLink } from "@/lib/film-family";

const TOPICS = ["Choosing a package", "Building a custom package", "Prices or discounts", "Dates and availability", "Something else"] as const;

/** Lets a visitor send a short help request by WhatsApp or email. Nothing is stored or booked. */
export function NeedHelp({ context, className = "" }: { context?: string; className?: string }) {
  const [topic, setTopic] = useState<string>(TOPICS[0]);
  const [message, setMessage] = useState("");
  const text = [
    "Assalam o Alaikum ZH Films!",
    `I need help with: ${topic}${context ? ` (${context})` : ""}.`,
    message.trim() ? `\n${message.trim()}` : ""
  ]
    .filter(Boolean)
    .join("\n");
  const mail = FILM_FAMILY.email
    ? `mailto:${FILM_FAMILY.email}?subject=${encodeURIComponent(`Help with ${topic.toLowerCase()}`)}&body=${encodeURIComponent(text)}`
    : null;

  return (
    <div className={`rounded-3xl border border-white/10 bg-zinc-950/70 p-5 sm:p-6 ${className}`}>
      <p className="text-[10px] uppercase tracking-[0.35em] text-zh-gold/80">Need help?</p>
      <h3 className="mt-2 font-display text-xl font-bold uppercase text-white">Tell us what you&apos;re looking for</h3>
      <p className="mt-1 text-sm text-zinc-400">Pick a topic, add a line or two, and send it the way you prefer. We reply personally.</p>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="What do you need help with?">
        {TOPICS.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={topic === t}
            onClick={() => setTopic(t)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              topic === t ? "border-zh-gold bg-zh-gold text-black" : "border-white/15 text-zinc-300 hover:border-zh-gold/50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <label className="mt-4 block text-xs text-zinc-400">
        Your message (optional)
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={600}
          rows={3}
          placeholder="e.g. We need Mehndi and Walima only, with drone. What would that cost?"
          className="mt-1.5"
        />
      </label>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <a
          href={waLink(text)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-black transition hover:brightness-110"
        >
          <MessageCircle className="h-4 w-4" /> Send on WhatsApp
        </a>
        {mail ? (
          <a
            href={mail}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-white/15 px-5 text-[11px] uppercase tracking-[0.2em] text-zinc-200 transition hover:border-zh-gold/50 hover:text-zh-gold"
          >
            <Mail className="h-4 w-4" /> Send by email
          </a>
        ) : null}
      </div>
    </div>
  );
}
