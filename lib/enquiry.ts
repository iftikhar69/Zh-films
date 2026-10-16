import type { ServiceType } from "@/lib/booking-rules";

/** Wedding functions and the crew buffer profile each one uses for conflict checks. */
export const WEDDING_FUNCTIONS = {
  nikah: { label: "Nikah", service: "nikah", defaultStart: "11:00", defaultEnd: "15:00" },
  mehndi: { label: "Mehndi", service: "wedding", defaultStart: "19:00", defaultEnd: "23:30" },
  baraat: { label: "Baraat", service: "wedding", defaultStart: "14:00", defaultEnd: "22:00" },
  walima: { label: "Walima", service: "wedding", defaultStart: "19:00", defaultEnd: "23:00" },
  dholki: { label: "Dholki", service: "event", defaultStart: "19:00", defaultEnd: "23:00" },
  other: { label: "Other function", service: "event", defaultStart: "18:00", defaultEnd: "22:00" }
} as const satisfies Record<string, { label: string; service: ServiceType; defaultStart: string; defaultEnd: string }>;
export type WeddingFunctionType = keyof typeof WEDDING_FUNCTIONS;
export const WEDDING_FUNCTION_TYPES = Object.keys(WEDDING_FUNCTIONS) as [WeddingFunctionType, ...WeddingFunctionType[]];

export const EVENT_TYPES = {
  nikah: { label: "Nikah", service: "nikah" },
  engagement: { label: "Engagement", service: "event" },
  birthday: { label: "Birthday", service: "event" },
  corporate: { label: "Corporate event", service: "event" },
  shoot: { label: "Custom cinematic shoot", service: "shoot" },
  other: { label: "Other event", service: "event" }
} as const satisfies Record<string, { label: string; service: ServiceType }>;
export type EventType = keyof typeof EVENT_TYPES;
export const EVENT_TYPE_KEYS = Object.keys(EVENT_TYPES) as [EventType, ...EventType[]];

export const COVERAGE_TYPES = ["Photography", "Videography", "Photo + video", "Cinematic highlight film", "Not sure yet"] as const;

export const MAX_FUNCTIONS = 6;

export function formatPkr(n: number | null | undefined) {
  return n == null ? "—" : `PKR ${n.toLocaleString("en-PK")}`;
}

export type EnquiryMessage = {
  reference?: string;
  packageName?: string | null;
  packagePrice?: number | null;
  eventType?: string | null;
  functions?: { label: string; date: string; startTime?: string; endTime?: string; venue?: string }[];
  addons?: { name: string; price: number }[];
  estimatedTotal?: number | null;
  location?: string;
  coverage?: string;
  name?: string;
  phone?: string;
  email?: string;
  budget?: string;
  customDeal?: boolean;
};

/**
 * Customer-facing WhatsApp text. Built only from what the customer chose and the advertised
 * prices; never internal notes or payment details.
 */
export function enquiryWhatsAppText(m: EnquiryMessage) {
  const out: string[] = ["Assalam o Alaikum ZH Films!"];
  if (m.packageName) {
    out.push(`I'm interested in the ${m.packageName}${m.packagePrice ? ` (advertised ${formatPkr(m.packagePrice)})` : ""}.`);
  } else if (m.eventType) {
    out.push(`I'd like a quote for a ${m.eventType}.`);
  } else {
    out.push("I'd like to discuss a booking.");
  }
  if (m.reference) out.push(`Enquiry reference: ${m.reference}`);
  if (m.functions?.length) {
    out.push("", m.functions.length > 1 ? "Functions:" : "Date:");
    for (const f of m.functions) {
      const time = f.startTime && f.endTime ? ` ${f.startTime}–${f.endTime}` : "";
      out.push(`• ${f.label} — ${f.date || "date to be decided"}${time}${f.venue ? ` @ ${f.venue}` : ""}`);
    }
  }
  if (m.location) out.push(`Location: ${m.location}`);
  if (m.coverage) out.push(`Coverage: ${m.coverage}`);
  if (m.addons?.length) out.push(`Add-ons: ${m.addons.map((a) => `${a.name} (${formatPkr(a.price)})`).join(", ")}`);
  if (m.estimatedTotal != null && (m.packageName || m.addons?.length)) out.push(`Estimated total: ${formatPkr(m.estimatedTotal)}`);
  if (m.budget) out.push(`My budget / deal request: ${m.budget}`);
  if (m.customDeal) out.push("I'd like to discuss a custom deal.");
  const contact = [m.name, m.phone, m.email].filter(Boolean).join(" · ");
  if (contact) out.push("", `Contact: ${contact}`);
  out.push("", "I understand the date is confirmed only after ZH Films approves it.");
  return out.join("\n");
}
