import { z } from "zod";

export const PACKAGE_IDS = ["standard", "premium", "advance_premium"] as const;
export type PackageId = (typeof PACKAGE_IDS)[number];

const lines = z.array(z.string().trim().min(1).max(200)).max(40);

export const packageSchema = z.object({
  id: z.enum(PACKAGE_IDS),
  name: z.string().trim().min(2).max(80),
  price: z.number().int().min(0).max(100_000_000),
  tagline: z.string().trim().max(160),
  description: z.string().trim().max(1000),
  inclusions: lines,
  exclusions: lines,
  image: z.string().trim().regex(/^\/media\/[\w./-]+\.(jpe?g|png|webp)$/, "Use an image path under /media/"),
  enabled: z.boolean()
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
    addons: z.array(addonSchema).max(30)
  })
  .refine((c) => PACKAGE_IDS.every((id) => c.packages.some((p) => p.id === id)), "All three packages are required")
  .refine((c) => new Set(c.addons.map((a) => a.id)).size === c.addons.length, "Add-on ids must be unique");

export type Catalog = z.infer<typeof catalogSchema>;
export type WeddingPackage = z.infer<typeof packageSchema>;
export type Addon = z.infer<typeof addonSchema>;

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
      enabled: true
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
      enabled: true
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
      enabled: true
    }
  ],
  addons: []
};

/** What the public site may see: enabled packages and add-ons only. */
export function publicCatalog(c: Catalog) {
  return { packages: c.packages.filter((p) => p.enabled), addons: c.addons.filter((a) => a.enabled) };
}
export type PublicCatalog = ReturnType<typeof publicCatalog>;

export type Estimate = {
  package: { id: string; name: string; price: number } | null;
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
export function estimate(c: { packages: WeddingPackage[]; addons: Addon[] }, packageId: string | null | undefined, addonIds: string[]): Estimate {
  let pkg: Estimate["package"] = null;
  if (packageId) {
    const p = c.packages.find((x) => x.id === packageId);
    if (!p || !p.enabled) throw new CatalogError("That package is not available.", "packageId");
    pkg = { id: p.id, name: p.name, price: p.price };
  }
  const unique = [...new Set(addonIds)];
  const addons = unique.map((id) => {
    const a = c.addons.find((x) => x.id === id);
    if (!a || !a.enabled) throw new CatalogError("One of the selected add-ons is no longer available.", "addonIds");
    return { id: a.id, name: a.name, price: a.price };
  });
  return { package: pkg, addons, total: (pkg?.price ?? 0) + addons.reduce((n, a) => n + a.price, 0) };
}
