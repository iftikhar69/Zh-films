import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DEFAULT_HOLD_HOURS } from "@/lib/booking-rules";

export const settingsSchema = z.object({
  payments: z.object({
    easypaisa: z.object({
      enabled: z.boolean(),
      accountTitle: z.string().max(120),
      accountNumber: z.string().max(40),
      instructions: z.string().max(1000)
    }),
    bank: z.object({
      enabled: z.boolean(),
      bankName: z.string().max(120),
      accountTitle: z.string().max(120),
      accountNumber: z.string().max(60),
      iban: z.string().max(60),
      instructions: z.string().max(1000)
    })
  }),
  advance: z.object({
    /** Suggested advance as a percentage of the quote; the owner can override per booking. */
    defaultPercent: z.number().int().min(0).max(100),
    note: z.string().max(1000)
  }),
  holds: z.object({
    defaultHours: z.number().int().min(1).max(336)
  }),
  notifications: z.object({
    /** Where owner notifications go. Falls back to OWNER_NOTIFY_EMAIL / ADMIN_EMAILS. */
    ownerEmail: z.string().email().or(z.literal("")),
    onNewRequest: z.boolean(),
    onPaymentSubmitted: z.boolean(),
    pendingReminderHours: z.number().int().min(1).max(168),
    customerAdvanceReminderHours: z.number().int().min(1).max(336)
  }),
  policies: z.object({
    booking: z.string().max(3000),
    cancellation: z.string().max(3000)
  })
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  payments: {
    easypaisa: { enabled: false, accountTitle: "", accountNumber: "", instructions: "" },
    bank: { enabled: false, bankName: "", accountTitle: "", accountNumber: "", iban: "", instructions: "" }
  },
  advance: { defaultPercent: 30, note: "The advance secures your date once we have verified it in our account." },
  holds: { defaultHours: DEFAULT_HOLD_HOURS },
  notifications: {
    ownerEmail: "",
    onNewRequest: true,
    onPaymentSubmitted: true,
    pendingReminderHours: 24,
    customerAdvanceReminderHours: 72
  },
  policies: {
    booking:
      "A request is not a reservation. Your date is reserved only after we confirm it with you and verify the advance.",
    cancellation: "Advances are refundable according to the terms agreed when your booking is confirmed."
  }
};

const KEY = "business";

function merge<T>(base: T, over: unknown): T {
  if (typeof base !== "object" || base === null || typeof over !== "object" || over === null) {
    return (over ?? base) as T;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over)) {
    if (k in out) out[k] = merge(out[k], v);
  }
  return out as T;
}

export async function getSettings(): Promise<Settings> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  if (!row) return DEFAULT_SETTINGS;
  try {
    const parsed = settingsSchema.safeParse(merge(DEFAULT_SETTINGS, JSON.parse(row.value)));
    return parsed.success ? parsed.data : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(value: Settings, updatedBy: string) {
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(value), updatedBy },
    update: { value: JSON.stringify(value), updatedBy }
  });
}

export async function ownerEmails(settings?: Settings) {
  const s = settings ?? (await getSettings());
  if (s.notifications.ownerEmail) return [s.notifications.ownerEmail];
  const env = process.env.OWNER_NOTIFY_EMAIL || process.env.ADMIN_EMAILS || "";
  return env
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.includes("@") && !/replace_me/i.test(e));
}
