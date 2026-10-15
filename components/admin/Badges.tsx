import { bookingStatusLabel, isHeld, paymentStatusLabel } from "@/lib/booking-status";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, string> = {
  pending: "border-amber-400/40 text-amber-300",
  confirmed: "border-emerald-400/40 text-emerald-300",
  completed: "border-sky-400/40 text-sky-300",
  declined: "border-zinc-600 text-zinc-400",
  cancelled: "border-red-400/40 text-red-300"
};

const PAY_TONE: Record<string, string> = {
  not_requested: "border-white/10 text-zinc-500",
  awaiting: "border-amber-400/30 text-amber-200",
  submitted: "border-orange-400/50 text-orange-300",
  paid: "border-emerald-400/40 text-emerald-300",
  refunded: "border-zinc-500 text-zinc-400"
};

const pill = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em]";

export function StatusBadge({ status, holdExpiresAt }: { status: string; holdExpiresAt?: Date | null }) {
  const held = isHeld({ status, holdExpiresAt: holdExpiresAt ?? null });
  return (
    <span className={cn(pill, held ? "border-fuchsia-400/50 text-fuchsia-300" : STATUS_TONE[status] ?? "border-white/10")}>
      {held ? "On hold" : bookingStatusLabel(status).replace(" — pending review", "")}
    </span>
  );
}

export function PaymentBadge({ status }: { status: string }) {
  return <span className={cn(pill, PAY_TONE[status] ?? "border-white/10")}>{paymentStatusLabel(status)}</span>;
}

export function PaymentRecordBadge({ status }: { status: string }) {
  const tone =
    status === "verified"
      ? "border-emerald-400/40 text-emerald-300"
      : status === "rejected"
        ? "border-red-400/40 text-red-300"
        : "border-orange-400/50 text-orange-300";
  return <span className={cn(pill, tone)}>{status === "submitted" ? "Awaiting verification" : status}</span>;
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center">
      <p className="font-serif text-lg text-white">{title}</p>
      {children ? <div className="mt-2 text-sm text-zinc-500">{children}</div> : null}
    </div>
  );
}
