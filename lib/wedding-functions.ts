import { WEDDING_FUNCTIONS, MAX_FUNCTIONS, type WeddingFunctionType } from "@/lib/enquiry";

export type FunctionRow = { id: string; type: WeddingFunctionType; eventDate: string; startTime: string; endTime: string; venue: string };

let seq = 0;
const rowId = () => `fn_${Date.now().toString(36)}_${(seq++).toString(36)}`;

export function newFunctionRow(type: WeddingFunctionType, id = rowId()): FunctionRow {
  return { id, type, eventDate: "", startTime: WEDDING_FUNCTIONS[type].defaultStart, endTime: WEDDING_FUNCTIONS[type].defaultEnd, venue: "" };
}

/** Rows saved before rows had ids (older drafts) get one, so every row can be addressed on its own. */
export function withIds(rows: Array<Omit<FunctionRow, "id"> & { id?: string }>): FunctionRow[] {
  return rows.map((r) => ({ ...r, id: r.id || rowId() }));
}

export const isSelected = (rows: FunctionRow[], type: WeddingFunctionType) => rows.some((r) => r.type === type);

/**
 * Selecting a function adds its own row; deselecting removes only that function's row. "Other" can be
 * added more than once, so it is only ever added here and removed by id.
 */
export function toggleFunction(rows: FunctionRow[], type: WeddingFunctionType): FunctionRow[] {
  if (type !== "other" && isSelected(rows, type)) return rows.filter((r) => r.type !== type);
  if (rows.length >= MAX_FUNCTIONS) return rows;
  return [...rows, newFunctionRow(type)];
}

export function updateFunction(rows: FunctionRow[], id: string, patch: Partial<Omit<FunctionRow, "id">>): FunctionRow[] {
  return rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
}

export function removeFunction(rows: FunctionRow[], id: string): FunctionRow[] {
  return rows.filter((r) => r.id !== id);
}

const minutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** Same-day clashes the customer can fix before sending. The server re-checks with setup and travel buffers. */
export function sameDayOverlaps(rows: FunctionRow[]): Array<[FunctionRow, FunctionRow]> {
  const span = (r: FunctionRow) => {
    const s = minutes(r.startTime);
    let e = minutes(r.endTime);
    if (e <= s) e += 24 * 60;
    return [s, e] as const;
  };
  const out: Array<[FunctionRow, FunctionRow]> = [];
  const timed = rows.filter((r) => r.eventDate && /^\d\d:\d\d$/.test(r.startTime) && /^\d\d:\d\d$/.test(r.endTime));
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      if (timed[i].eventDate !== timed[j].eventDate) continue;
      const [a1, a2] = span(timed[i]);
      const [b1, b2] = span(timed[j]);
      if (a1 < b2 && b1 < a2) out.push([timed[i], timed[j]]);
    }
  }
  return out;
}

/** The payload the bookings API expects: ids stay in the browser. */
export const toPayload = (rows: FunctionRow[]) => rows.map(({ type, eventDate, startTime, endTime, venue }) => ({ type, eventDate, startTime, endTime, venue }));

export function functionLabel(type: string) {
  return WEDDING_FUNCTIONS[type as WeddingFunctionType]?.label ?? type;
}
