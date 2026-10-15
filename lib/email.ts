import { prisma } from "@/lib/prisma";

export type EmailMessage = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  /** Stable id for this logical email. The same key is never sent twice. */
  dedupeKey: string;
  kind: string;
  bookingId?: string;
};

export type EmailResult = { status: "sent" | "failed" | "skipped" | "duplicate"; error?: string };

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Plain, brand-consistent HTML built from the text body so both always match. */
function renderHtml(subject: string, text: string) {
  const body = escapeHtml(text)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#c8a96a">$1</a>')
    .replace(/\n/g, "<br/>");
  return `<!doctype html><html><body style="margin:0;background:#0a0a0a;font-family:Helvetica,Arial,sans-serif;color:#e4e4e7">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<p style="letter-spacing:.35em;text-transform:uppercase;font-size:11px;color:#c8a96a;margin:0 0 8px">ZH Films</p>
<h1 style="font-size:20px;color:#fff;margin:0 0 20px">${escapeHtml(subject)}</h1>
<div style="font-size:14px;line-height:1.6">${body}</div>
</div></body></html>`;
}

export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const to = (Array.isArray(msg.to) ? msg.to : [msg.to]).filter(Boolean);
  if (!to.length) return { status: "skipped", error: "No recipient" };

  const existing = await prisma.emailLog.findUnique({ where: { dedupeKey: msg.dedupeKey } });
  if (existing && (existing.status === "sent" || existing.status === "sending")) return { status: "duplicate" };

  const base = { kind: msg.kind, to: to.join(","), subject: msg.subject, bookingId: msg.bookingId };

  if (!emailConfigured()) {
    await prisma.emailLog.upsert({
      where: { dedupeKey: msg.dedupeKey },
      create: { ...base, dedupeKey: msg.dedupeKey, status: "skipped", error: "Email provider not configured" },
      update: { status: "skipped", error: "Email provider not configured" }
    });
    return { status: "skipped", error: "Email provider not configured" };
  }

  try {
    // Claim the key first; a concurrent sender hitting the unique index backs off.
    if (existing) {
      const claimed = await prisma.emailLog.updateMany({
        where: { dedupeKey: msg.dedupeKey, status: { in: ["failed", "skipped"] } },
        data: { status: "sending", error: null }
      });
      if (!claimed.count) return { status: "duplicate" };
    } else {
      await prisma.emailLog.create({ data: { ...base, dedupeKey: msg.dedupeKey, status: "sending" } });
    }
  } catch {
    return { status: "duplicate" };
  }

  try {
    const res = await fetch(`${process.env.RESEND_API_URL || "https://api.resend.com"}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to,
        reply_to: process.env.EMAIL_REPLY_TO || undefined,
        subject: msg.subject,
        text: msg.text,
        html: msg.html ?? renderHtml(msg.subject, msg.text)
      }),
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      throw new Error(`Provider responded ${res.status}${detail ? `: ${detail}` : ""}`);
    }
    await prisma.emailLog.update({ where: { dedupeKey: msg.dedupeKey }, data: { status: "sent" } });
    return { status: "sent" };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Unknown error";
    console.error(`[email] ${msg.kind} to ${to.length} recipient(s) failed: ${error}`);
    await prisma.emailLog.update({ where: { dedupeKey: msg.dedupeKey }, data: { status: "failed", error } });
    return { status: "failed", error };
  }
}
