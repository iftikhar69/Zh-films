import { z } from "zod";

export const GEAR_CATEGORIES = {
  camera: "Cameras",
  lens: "Lenses",
  lighting: "Lighting & flash",
  audio: "Audio",
  gimbal: "Gimbals & support",
  drone: "Drones",
  accessory: "Accessories",
  vehicle: "Vehicles",
  other: "Other"
} as const;
export type GearCategory = keyof typeof GEAR_CATEGORIES;
export const GEAR_CATEGORY_KEYS = Object.keys(GEAR_CATEGORIES) as [GearCategory, ...GearCategory[]];

export const GEAR_STATUS = {
  draft: "Draft — hidden",
  available: "Available",
  enquiry: "Enquiry only",
  unavailable: "Currently unavailable"
} as const;
export type GearStatus = keyof typeof GEAR_STATUS;
export const PUBLIC_GEAR_STATUSES: GearStatus[] = ["available", "enquiry", "unavailable"];

export const RENT_UNITS = { day: "per day", week: "per week", event: "per event" } as const;

/** Page backdrops when a page has no listings. Different on purpose so the pages never look alike. */
export const SELL_BACKDROP = "/media/cinema-camera.jpg";
export const RENT_BACKDROP = "/media/instagram/CxhbfV-ISy5-1.jpg";

const price = z.number().int().min(0).max(100_000_000).nullable();

export const gearInput = z.object({
  name: z.string().trim().min(2, "Add a name").max(120),
  brand: z.string().trim().max(60).default(""),
  category: z.enum(GEAR_CATEGORY_KEYS),
  listingType: z.enum(["sell", "rent", "both"]),
  status: z.enum(["draft", "available", "enquiry", "unavailable"]),
  salePrice: price.default(null),
  rentPrice: price.default(null),
  rentUnit: z.enum(["day", "week", "event"]).default("day"),
  priceLabel: z.string().trim().max(120).default(""),
  condition: z.string().trim().max(200).default(""),
  includes: z.string().trim().max(1000).default(""),
  description: z.string().trim().max(2000).default(""),
  sortOrder: z.number().int().min(0).max(10_000).default(0)
});
export type GearInput = z.infer<typeof gearInput>;

export type PublicGear = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  listingType: string;
  status: string;
  salePrice: number | null;
  rentPrice: number | null;
  rentUnit: string;
  priceLabel: string;
  condition: string;
  includes: string;
  description: string;
  image: string;
  imageThumb: string;
};

export const PUBLIC_GEAR_SELECT = {
  id: true,
  slug: true,
  name: true,
  brand: true,
  category: true,
  listingType: true,
  status: true,
  salePrice: true,
  rentPrice: true,
  rentUnit: true,
  priceLabel: true,
  condition: true,
  includes: true,
  description: true,
  image: true,
  imageThumb: true
} as const;

/** The database filter for what a public page may show. Drafts are never public. */
export function publicGearWhere(mode: "sell" | "rent") {
  return { status: { in: PUBLIC_GEAR_STATUSES }, listingType: { in: [mode, "both"] } };
}

export function formatPrice(n: number | null | undefined) {
  return n == null ? null : `PKR ${n.toLocaleString("en-PK")}`;
}

export function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item"
  );
}

/** A readable draft name from a file name. The owner edits it before publishing. */
export function draftName(file: string) {
  const base = file.replace(/\.(jpe?g|png|webp)$/i, "").replace(/_+/g, " ").replace(/\s+/g, " ").trim();
  return (base.length > 80 ? `${base.slice(0, 77).trim()}…` : base) || "Untitled item";
}
