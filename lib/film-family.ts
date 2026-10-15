import { BRAND } from "@/lib/constants";

export const FILM_FAMILY = {
  name: "ZH Film Family",
  tagline: "One house. Many lenses. Lahore light.",
  whatsapp: normalizeWhatsApp(process.env.NEXT_PUBLIC_WHATSAPP),
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/zulfiqar_hussain.films/",
  facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL || "https://www.facebook.com/people/ZH_films/100092306776654/",
  email: realValue(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  ceo: BRAND.ceo
} as const;

function realValue(v: string | undefined) {
  return v && !/replace_me/i.test(v) ? v.trim() : "";
}

/** wa.me needs the international number without "+" or leading zeros (03xx… → 923xx…). */
export function normalizeWhatsApp(raw: string | null | undefined) {
  let d = (raw ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("03")) d = `92${d.slice(1)}`;
  if (d.length === 10 && d.startsWith("3")) d = `92${d}`;
  return d.length >= 10 && d.length <= 15 ? d : "";
}

/**
 * Without a configured number, wa.me/?text= lets the visitor pick the chat themselves
 * rather than sending them to a guessed number.
 */
export function waLink(message?: string, phone?: string | null) {
  const base = `https://wa.me/${normalizeWhatsApp(phone ?? FILM_FAMILY.whatsapp)}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function confirmationCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "ZH-";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export function formatCallSheet(input: {
  code: string;
  names: string;
  eventDate: string;
  city: string;
  service?: string;
  timeRange?: string;
  holdUntil?: string;
}) {
  return [
    "ZH FILMS — BOOKING REQUEST RECEIVED",
    `Reference: ${input.code}`,
    `Names: ${input.names}`,
    input.service ? `Service: ${input.service}` : null,
    `Date: ${input.eventDate}${input.timeRange ? ` · ${input.timeRange} (Pakistan time)` : ""}`,
    `Location: ${input.city}`,
    "",
    "This is a request, not yet a confirmed booking.",
    input.holdUntil
      ? `We are holding this time for you until ${input.holdUntil} while a producer reviews it.`
      : null,
    "A producer will contact you to confirm the date, coverage and any advance."
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}
