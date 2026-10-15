import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { confirmationCode, formatCallSheet } from "@/lib/film-family";
import { clerkConfigured } from "@/lib/auth";
import { auth } from "@clerk/nextjs/server";
import {
  BOOKING_TIMEZONE,
  SERVICES,
  SERVICE_TYPES,
  TEAM_ID,
  overlaps,
  resolveSlot,
  type ServiceType,
  type Slot
} from "@/lib/booking-rules";
import { randomBytes } from "node:crypto";
import { logBookingEvent } from "@/lib/booking-events";
import { notifyNewRequest } from "@/lib/notify";
import { SlotUnavailableError, assertSlotFree, busyRangesForDate, withScheduleLock } from "@/lib/booking-availability";
import { CatalogError, PACKAGE_IDS, estimate, getCatalog, type Estimate } from "@/lib/catalog";
import {
  EVENT_TYPES,
  EVENT_TYPE_KEYS,
  MAX_FUNCTIONS,
  WEDDING_FUNCTIONS,
  WEDDING_FUNCTION_TYPES,
  enquiryWhatsAppText,
  formatPkr
} from "@/lib/enquiry";

const text = (max: number) => z.string().trim().max(max).optional().default("");

const schema = z.object({
  kind: z.enum(["general", "wedding_package", "event"]).default("general"),
  names: z.string().trim().min(2, "Add your name").max(120),
  city: z.string().trim().min(2, "Add the venue or city").max(300),
  serviceType: z.enum(SERVICE_TYPES).default("event"),
  eventDate: text(10),
  startTime: text(5),
  endTime: text(5),
  coverage: text(2000),
  deliverables: text(2000),
  references: text(2000),
  email: z.string().trim().email("Enter a valid email").or(z.literal("")).optional().default(""),
  phone: z.string().trim().min(6, "Add your WhatsApp number").max(30),
  idempotencyKey: z.string().uuid().optional(),
  packageId: z.enum(PACKAGE_IDS).optional(),
  addonIds: z.array(z.string().max(40)).max(30).optional().default([]),
  eventType: z.enum(EVENT_TYPE_KEYS).optional(),
  functions: z
    .array(
      z.object({
        type: z.enum(WEDDING_FUNCTION_TYPES),
        eventDate: z.string().max(10),
        startTime: z.string().max(5),
        endTime: z.string().max(5),
        venue: text(200)
      })
    )
    .max(MAX_FUNCTIONS)
    .optional()
    .default([]),
  budget: text(300),
  customDeal: z.boolean().optional().default(false),
  whatsapp: z.boolean().optional().default(false)
});
type Body = z.infer<typeof schema>;

type ResolvedFunction = Body["functions"][number] & { slot: Slot; sortOrder: number };

class InputError extends Error {
  constructor(message: string, public field: string) {
    super(message);
  }
}

type BookingRow = Awaited<ReturnType<typeof prisma.booking.create>>;

function savedAddons(b: BookingRow): Estimate["addons"] {
  try {
    return b.addonsJson ? (JSON.parse(b.addonsJson) as Estimate["addons"]) : [];
  } catch {
    return [];
  }
}

function confirmation(booking: BookingRow, functions: { type: string; eventDate: string; startTime: string; endTime: string; venue: string }[]) {
  const service = booking.eventType
    ? EVENT_TYPES[booking.eventType as keyof typeof EVENT_TYPES]?.label
    : SERVICES[booking.serviceType as keyof typeof SERVICES]?.label ?? booking.serviceType;
  const timeRange = booking.startTime && booking.endTime ? `${booking.startTime}–${booking.endTime}` : undefined;
  const addons = savedAddons(booking);
  const fnList = functions.map((f) => ({
    label: WEDDING_FUNCTIONS[f.type as keyof typeof WEDDING_FUNCTIONS]?.label ?? f.type,
    date: f.eventDate,
    startTime: f.startTime,
    endTime: f.endTime,
    venue: f.venue
  }));
  return {
    ok: true,
    booking: {
      id: booking.id,
      confirmationCode: booking.confirmationCode,
      eventDate: booking.eventDate,
      names: booking.names,
      status: booking.status
    },
    estimate: {
      packageName: booking.packageName,
      packagePrice: booking.packagePrice,
      addons,
      total: booking.estimatedTotal
    },
    confirmationMessage: formatCallSheet({
      code: booking.confirmationCode,
      names: booking.names,
      eventDate: fnList.length > 1 ? fnList.map((f) => `${f.label} ${f.date}`).join(", ") : booking.eventDate,
      city: booking.city,
      service: booking.packageName ?? service,
      timeRange: fnList.length > 1 ? undefined : timeRange
    }),
    note: "Request received — pending review. This is not yet a confirmed booking.",
    statusUrl: booking.accessToken ? `/booking/${booking.confirmationCode}?t=${booking.accessToken}` : undefined,
    whatsappText: enquiryWhatsAppText({
      reference: booking.confirmationCode,
      packageName: booking.packageName,
      packagePrice: booking.packagePrice,
      eventType: booking.eventType ? service : null,
      functions: fnList.length
        ? fnList
        : [{ label: service ?? "Event", date: booking.eventDate, startTime: booking.startTime ?? "", endTime: booking.endTime ?? "" }],
      addons,
      estimatedTotal: booking.estimatedTotal,
      location: booking.city,
      coverage: booking.coverage,
      name: booking.names,
      phone: booking.phone,
      email: booking.email,
      budget: booking.budget ?? "",
      customDeal: booking.customDealRequested
    })
  };
}

function resolveFunctions(body: Body): ResolvedFunction[] {
  if (!body.functions.length) throw new InputError("Add at least one function date", "functions");
  const resolved = body.functions.map((f, i) => {
    const service = WEDDING_FUNCTIONS[f.type].service;
    const r = resolveSlot({ serviceType: service, eventDate: f.eventDate, startTime: f.startTime, endTime: f.endTime });
    if (!r.ok) throw new InputError(`${WEDDING_FUNCTIONS[f.type].label}: ${r.error}`, `functions.${i}.${r.field}`);
    return { ...f, slot: r.slot, sortOrder: i };
  });
  resolved.sort((a, b) => a.slot.startsAt.getTime() - b.slot.startsAt.getTime());
  for (let i = 0; i < resolved.length; i++) {
    for (let j = i + 1; j < resolved.length; j++) {
      if (overlaps(resolved[i].slot, resolved[j].slot)) {
        throw new InputError(
          `${WEDDING_FUNCTIONS[resolved[i].type].label} and ${WEDDING_FUNCTIONS[resolved[j].type].label} overlap (including setup and travel). Adjust one of the times.`,
          "functions"
        );
      }
    }
  }
  return resolved.map((f, i) => ({ ...f, sortOrder: i }));
}

function summarise(body: Body, fns: ResolvedFunction[]) {
  if (body.coverage && body.coverage.length >= 3) return body.coverage;
  if (fns.length) return fns.map((f) => `${WEDDING_FUNCTIONS[f.type].label} ${f.startTime}–${f.endTime}`).join("; ");
  return body.eventType ? EVENT_TYPES[body.eventType].label : "To be discussed";
}

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, field: issue?.path.join("."), error: issue?.message ?? "Check the form" },
      { status: 400 }
    );
  }
  const body = parsed.data;

  let primary: Slot;
  let serviceType: ServiceType = body.serviceType;
  let fns: ResolvedFunction[] = [];
  let priced: Estimate;
  try {
    if (body.kind === "general" && (body.coverage.length < 3 || body.deliverables.length < 3 || !body.email)) {
      throw new InputError("Coverage, deliverables and email are required", body.email ? "coverage" : "email");
    }
    if (body.kind === "wedding_package") {
      if (!body.packageId) throw new InputError("Choose a package", "packageId");
      fns = resolveFunctions(body);
      primary = fns[0].slot;
      serviceType = WEDDING_FUNCTIONS[fns[0].type].service;
    } else {
      if (body.kind === "event") {
        if (!body.eventType) throw new InputError("Choose the event type", "eventType");
        serviceType = EVENT_TYPES[body.eventType].service;
      }
      const r = resolveSlot({ serviceType, eventDate: body.eventDate, startTime: body.startTime, endTime: body.endTime });
      if (!r.ok) throw new InputError(r.error, r.field);
      primary = r.slot;
    }
    // Prices always come from the stored catalog; nothing the browser sends is trusted as a price.
    const catalog = await getCatalog();
    priced = estimate(catalog, body.kind === "wedding_package" ? body.packageId : null, body.addonIds);
  } catch (e) {
    if (e instanceof InputError || e instanceof CatalogError) {
      return NextResponse.json({ ok: false, field: e.field, error: e.message }, { status: 400 });
    }
    throw e;
  }

  const first = fns[0];
  const eventDate = first?.eventDate ?? body.eventDate;
  const startTime = first?.startTime ?? body.startTime;
  const endTime = first?.endTime ?? body.endTime;

  let clerkUserId: string | undefined;
  if (clerkConfigured()) {
    try {
      clerkUserId = (await auth()).userId ?? undefined;
    } catch {
      /* public booking allowed */
    }
  }

  const fnRows = (b: BookingRow) =>
    prisma.bookingFunction.findMany({
      where: { bookingId: b.id },
      orderBy: { sortOrder: "asc" },
      select: { type: true, eventDate: true, startTime: true, endTime: true, venue: true }
    });

  try {
    const booking = await withScheduleLock(async (tx) => {
      if (body.idempotencyKey) {
        const existing = await tx.booking.findUnique({ where: { idempotencyKey: body.idempotencyKey } });
        if (existing) return existing;
      }
      const now = new Date();
      for (const s of fns.length ? fns.map((f) => f.slot) : [primary]) await assertSlotFree(tx, s, now);
      const created = await tx.booking.create({
        data: {
          kind: body.kind,
          confirmationCode: confirmationCode(),
          names: body.names,
          city: body.city,
          serviceType,
          eventType: body.kind === "event" ? body.eventType : null,
          eventDate,
          startTime,
          endTime,
          timezone: BOOKING_TIMEZONE,
          startsAt: primary.startsAt,
          endsAt: primary.endsAt,
          blockStart: primary.blockStart,
          blockEnd: primary.blockEnd,
          teamId: TEAM_ID,
          accessToken: randomBytes(24).toString("base64url"),
          coverage: summarise(body, fns),
          deliverables: body.deliverables || "To be discussed",
          references: body.references ?? "",
          email: body.email.toLowerCase(),
          phone: body.phone,
          clerkUserId,
          status: "pending",
          idempotencyKey: body.idempotencyKey,
          packageId: priced.package?.id ?? null,
          packageName: priced.package?.name ?? null,
          packagePrice: priced.package?.price ?? null,
          addonsJson: priced.addons.length ? JSON.stringify(priced.addons) : null,
          estimatedTotal: priced.package || priced.addons.length ? priced.total : null,
          budget: body.budget || null,
          customDealRequested: body.customDeal,
          whatsappRequested: body.whatsapp,
          functions: fns.length
            ? {
                create: fns.map((f) => ({
                  type: f.type,
                  eventDate: f.eventDate,
                  startTime: f.startTime,
                  endTime: f.endTime,
                  venue: f.venue,
                  startsAt: f.slot.startsAt,
                  endsAt: f.slot.endsAt,
                  blockStart: f.slot.blockStart,
                  blockEnd: f.slot.blockEnd,
                  teamId: TEAM_ID,
                  sortOrder: f.sortOrder
                }))
              }
            : undefined
        }
      });
      const what = priced.package
        ? `${priced.package.name} (${formatPkr(priced.package.price)}), estimate ${formatPkr(priced.total)}`
        : body.eventType
          ? EVENT_TYPES[body.eventType].label
          : "Request";
      await logBookingEvent(
        tx,
        created.id,
        "created",
        `${what} submitted by customer${body.whatsapp ? " — continuing on WhatsApp" : ""}`,
        clerkUserId ? `user:${clerkUserId}` : "public"
      );
      return created;
    });
    // Emails are deduplicated, so a retried request never notifies twice.
    await notifyNewRequest(booking).catch((e) => console.error("[booking] notify failed", e));
    return NextResponse.json(confirmation(booking, await fnRows(booking)));
  } catch (e) {
    if (e instanceof SlotUnavailableError) {
      return NextResponse.json(
        {
          ok: false,
          field: fns.length ? "functions" : "startTime",
          code: "slot_unavailable",
          error: fns.length
            ? "One of your function times is already booked. Choose another time or date for it."
            : e.message,
          busy: await busyRangesForDate(eventDate)
        },
        { status: 409 }
      );
    }
    if (body.idempotencyKey && (e as { code?: string })?.code === "P2002") {
      const existing = await prisma.booking.findUnique({ where: { idempotencyKey: body.idempotencyKey } });
      if (existing) return NextResponse.json(confirmation(existing, await fnRows(existing)));
    }
    console.error("booking create failed", e);
    return NextResponse.json({ ok: false, error: "Could not save the booking. Please try again." }, { status: 500 });
  }
}

/** Public availability for one date: busy time ranges only, no client details. */
export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    return NextResponse.json({ ok: false, error: "Use date=YYYY-MM-DD" }, { status: 400 });
  }
  const busy = await busyRangesForDate(date);
  return NextResponse.json(
    {
      ok: true,
      eventDate: date,
      timezone: BOOKING_TIMEZONE,
      busy,
      message:
        busy.length === 0
          ? "No confirmed bookings on this date yet. All dates are subject to confirmation."
          : `Already booked: ${busy.map((b) => `${b.from}–${b.to}`).join(", ")} (Pakistan time, incl. setup and travel). Other times are open, subject to confirmation.`
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
