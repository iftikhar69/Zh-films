import { BRAND } from "@/lib/constants";

export const FILM_FAMILY = {
  name: "ZH Film Family",
  tagline: "One house. Many lenses. Lahore light.",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "923000000000",
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://instagram.com/zhfilms",
  facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL ?? "https://facebook.com/zhfilms",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@zhfilms.example",
  ceo: BRAND.ceo
} as const;

export function waLink(message?: string, phone?: string | null) {
  const base = `https://wa.me/${(phone ?? FILM_FAMILY.whatsapp).replace(/\D/g, "")}`;
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
