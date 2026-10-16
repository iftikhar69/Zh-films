export const BOOKING_STATUSES = ["pending", "confirmed", "completed", "declined", "cancelled"] as const;
export const PAYMENT_STATUSES = ["not_requested", "awaiting", "submitted", "paid", "refunded"] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Pending review",
  confirmed: "Confirmed",
  completed: "Completed",
  declined: "Not accepted",
  cancelled: "Cancelled"
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  not_requested: "No payment requested yet",
  awaiting: "Advance requested",
  submitted: "Payment submitted — awaiting verification",
  paid: "Advance received (verified)",
  refunded: "Refunded"
};

/** Allowed staff transitions. Anything else is rejected by the API. */
export const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "declined", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  declined: [],
  cancelled: []
};

export function bookingStatusLabel(s: string) {
  return BOOKING_STATUS_LABEL[s as BookingStatus] ?? s;
}

export function paymentStatusLabel(s: string) {
  return PAYMENT_STATUS_LABEL[s as PaymentStatus] ?? s;
}

export function isHeld(b: { status: string; holdExpiresAt: Date | string | null }, now = new Date()) {
  return b.status === "pending" && !!b.holdExpiresAt && new Date(b.holdExpiresAt) > now;
}
