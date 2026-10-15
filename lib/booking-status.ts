export const BOOKING_STATUSES = ["pending", "confirmed", "in_production", "delivered", "cancelled"] as const;
export const PAYMENT_STATUSES = ["not_requested", "awaiting", "paid", "refunded"] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Enquiry received",
  confirmed: "Date confirmed",
  in_production: "In production",
  delivered: "Film delivered",
  cancelled: "Cancelled"
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  not_requested: "No payment requested yet",
  awaiting: "Advance requested",
  paid: "Payment received",
  refunded: "Refunded"
};

export function bookingStatusLabel(s: string) {
  return BOOKING_STATUS_LABEL[s as BookingStatus] ?? s;
}

export function paymentStatusLabel(s: string) {
  return PAYMENT_STATUS_LABEL[s as PaymentStatus] ?? s;
}
