import { prisma } from "@/lib/prisma";
import { adminPageGuard } from "@/lib/admin-guard";
import { getSettings } from "@/lib/settings";
import { emailConfigured } from "@/lib/email";
import { formatInstant } from "@/lib/notify";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await adminPageGuard("/admin/settings");
  const [settings, emails] = await Promise.all([
    getSettings(),
    prisma.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 15 })
  ]);
  const configured = emailConfigured();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl text-white sm:text-4xl">Settings</h1>
        <p className="mt-2 text-sm text-zinc-400">Payment details, booking rules and notifications. Never enter PINs or banking passwords here.</p>
      </header>

      <SettingsForm initial={settings} emailReady={configured} />

      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-[0.3em] text-zinc-400">Email delivery</h2>
        <p className={cn("text-sm", configured ? "text-emerald-300" : "text-amber-200")}>
          {configured
            ? `Sending through Resend from ${process.env.EMAIL_FROM}.`
            : "Not configured — set RESEND_API_KEY and EMAIL_FROM. Until then emails are logged as “skipped” and nothing is sent."}
        </p>
        {emails.length === 0 ? (
          <p className="text-sm text-zinc-500">No emails attempted yet.</p>
        ) : (
          <ul className="divide-y divide-white/5 rounded-xl border border-white/10 text-sm">
            {emails.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-zinc-200">{e.subject}</span>
                  <span className="text-xs text-zinc-500">{e.kind} · {formatInstant(e.createdAt)}{e.error ? ` · ${e.error}` : ""}</span>
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]",
                    e.status === "sent" ? "border-emerald-400/40 text-emerald-300" : e.status === "failed" ? "border-red-400/40 text-red-300" : "border-white/15 text-zinc-400"
                  )}
                >
                  {e.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
