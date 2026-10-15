import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export function logBookingEvent(tx: Tx, bookingId: string, type: string, message: string, actor: string) {
  return tx.bookingEvent.create({ data: { bookingId, type, message, actor } });
}
