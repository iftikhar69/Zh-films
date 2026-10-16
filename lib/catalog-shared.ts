import { z } from "zod";

export const PACKAGE_IDS = ["standard", "premium", "advance_premium"] as const;
export type PackageId = (typeof PACKAGE_IDS)[number];
export const CUSTOM_PACKAGE_ID = "custom";
export const SELECTABLE_PACKAGE_IDS = [...PACKAGE_IDS, CUSTOM_PACKAGE_ID] as const;

const mediaPath = z.string().trim().regex(/^\/media\/[\w./-]+\.(jpe?g|png|webp)$/, "Use an image path under /media/");
const lines = z.array(z.string().trim().min(1).max(200)).max(40);

export const packageSchema = z.object({
  id: z.enum(PACKAGE_IDS),
  name: z.string().trim().min(2).max(80),
  price: z.number().int().min(0).max(100_000_000),
  tagline: z.string().trim().max(160),
  description: z.string().trim().max(1000),
  inclusions: lines,
  exclusions: lines,
  image: mediaPath,
  enabled: z.boolean(),
  salePrice: z.number().int().min(0).max(100_000_000).nullable().default(null),
  saleLabel: z.string().trim().max(60).default(""),
  saleEndsOn: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-12-31")]).default("")
});

export const customPackageSchema = z.object({
  enabled: z.boolean(),
  name: z.string().trim().min(2).max(80),
  tagline: z.string().trim().max(160),
  description: z.string().trim().max(1000),
  basePrice: z.number().int().min(0).max(100_000_000),
  image: mediaPath
});

export const addonSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9-]{2,40}$/, "Use lowercase letters, numbers and dashes"),
  name: z.string().trim().min(2).max(80),
  price: z.number().int().min(0).max(100_000_000),
  description: z.string().trim().max(300),
  enabled: z.boolean()
});

export const catalogSchema = z
  .object({
    packages: z.array(packageSchema).length(PACKAGE_IDS.length),
    addons: z.array(addonSchema).max(30),
    custom: customPackageSchema.default({
      enabled: true,
      name: "Custom Package",
      tagline: "Choose only what you need.",
      description: "Pick the functions and add-ons you want. ZH Films reviews your selection and sends a final quote.",
      basePrice: 0,
      image: "/media/cinema-camera.jpg"
    })
  })
  .refine((c) => PACKAGE_IDS.every((id) => c.packages.some((p) => p.id === id)), "All three packages are required")
  .refine((c) => new Set(c.addons.map((a) => a.id)).size === c.addons.length, "Add-on ids must be unique")
  .refine((c) => c.packages.every((p) => p.salePrice == null || p.salePrice < p.price), "A discounted price must be lower than the regular price");

export type Catalog = z.infer<typeof catalogSchema>;
export type WeddingPackage = z.infer<typeof packageSchema>;
export type Addon = z.infer<typeof addonSchema>;
export type CatalogInput = z.input<typeof catalogSchema>;

/**
 * Names and prices are the owner's published rates. Inclusions start empty on purpose: the
 * owner fills them in under Admin → Packages before they are shown as included services.
 */
export const DEFAULT_CATALOG: Catalog = {
  packages: [
    {
      id: "standard",
      name: "Standard Wedding Package",
      price: 100_000,
      tagline: "Your wedding, told with care.",
      description: "",
      inclusions: [],
      exclusions: [],
      image: "/media/instagram/Dd2Dd3YiCVY-1.jpg",
      enabled: true,
      salePrice: null,
      saleLabel: "",
      saleEndsOn: ""
    },
    {
      id: "premium",
      name: "Premium Wedding Package",
      price: 150_000,
      tagline: "More of your story, on screen.",
      description: "",
      inclusions: [],
      exclusions: [],
      image: "/media/instagram/Dds3Tx_iIOa-1.jpg",
      enabled: true,
      salePrice: null,
      saleLabel: "",
      saleEndsOn: ""
    },
    {
      id: "advance_premium",
      name: "Advance Premium Wedding Package",
      price: 200_000,
      tagline: "The full cinematic experience.",
      description: "",
      inclusions: [],
      exclusions: [],
      image: "/media/instagram/Dd2DzGyiMrm-1.jpg",
      enabled: true,
      salePrice: null,
      saleLabel: "",
      saleEndsOn: ""
    }
  ],
  addons: [],
  custom: {
    enabled: true,
    name: "Custom Package",
    tagline: "Choose only what you need.",
    description: "Pick the functions and add-ons you want. ZH Films reviews your selection and sends a final quote.",
    basePrice: 0,
    image: "/media/cinema-camera.jpg"
  }
};

/** Today's date in Pakistan as YYYY-MM-DD, so an offer ends at local midnight on both server and browser. */
export function todayInPakistan(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export type PublicPackage = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  inclusions: string[];
  exclusions: string[];
  image: string;
  enabled: boolean;
  /** What the customer pays for the package itself today (the discounted price while an offer runs). */
  price: number;
  /** The regular price, only while a discount is active. */
  listPrice: number | null;
  saleLabel: string;
  saleEndsOn: string;
  custom: boolean;
};

function offerActive(p: WeddingPackage, today: string) {
  return p.salePrice != null && p.salePrice < p.price && (!p.saleEndsOn || today <= p.saleEndsOn);
}

/** What the public site may see: enabled packages (with any running discount applied), the custom package, enabled add-ons. */
export function publicCatalog(c: Catalog, today = todayInPakistan()) {
  const packages: PublicPackage[] = c.packages
    .filter((p) => p.enabled)
    .map((p) => {
      const sale = offerActive(p, today);
      return {
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        inclusions: p.inclusions,
        exclusions: p.exclusions,
        image: p.image,
        enabled: true,
        price: sale ? p.salePrice! : p.price,
        listPrice: sale ? p.price : null,
        saleLabel: sale ? p.saleLabel : "",
        saleEndsOn: sale ? p.saleEndsOn : "",
        custom: false
      };
    });
  if (c.custom.enabled) {
    packages.push({
      id: CUSTOM_PACKAGE_ID,
      name: c.custom.name,
      tagline: c.custom.tagline,
      description: c.custom.description,
      inclusions: [],
      exclusions: [],
      image: c.custom.image,
      enabled: true,
      price: c.custom.basePrice,
      listPrice: null,
      saleLabel: "",
      saleEndsOn: "",
      custom: true
    });
  }
  return { packages, addons: c.addons.filter((a) => a.enabled) };
}
export type PublicCatalog = ReturnType<typeof publicCatalog>;

export type Estimate = {
  package: { id: string; name: string; price: number; listPrice: number | null } | null;
  addons: { id: string; name: string; price: number }[];
  total: number;
};

export class CatalogError extends Error {
  constructor(message: string, public field: string) {
    super(message);
  }
}

/**
 * The advertised estimate for a selection. Used for display in the browser and recomputed on
 * the server from the stored catalog, which is the only total ever saved.
 */
export function estimate(c: { packages: PublicPackage[]; addons: Addon[] }, packageId: string | null | undefined, addonIds: string[]): Estimate {
  let pkg: Estimate["package"] = null;
  if (packageId) {
    const p = c.packages.find((x) => x.id === packageId);
    if (!p || !p.enabled) throw new CatalogError("That package is not available.", "packageId");
    pkg = { id: p.id, name: p.name, price: p.price, listPrice: p.listPrice };
  }
  const unique = [...new Set(addonIds)];
  const addons = unique.map((id) => {
    const a = c.addons.find((x) => x.id === id);
    if (!a || !a.enabled) throw new CatalogError("One of the selected add-ons is no longer available.", "addonIds");
    return { id: a.id, name: a.name, price: a.price };
  });
  return { package: pkg, addons, total: (pkg?.price ?? 0) + addons.reduce((n, a) => n + a.price, 0) };
}
