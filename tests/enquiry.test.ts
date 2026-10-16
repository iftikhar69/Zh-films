import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CATALOG, estimate, CatalogError, publicCatalog, catalogSchema, type Catalog } from "../lib/catalog-shared";
import { enquiryWhatsAppText } from "../lib/enquiry";
import { normalizeWhatsApp, waLink } from "../lib/film-family";

const pub = (c: Catalog, today = "2026-10-16") => publicCatalog(c, today);
const catalog: Catalog = {
  ...DEFAULT_CATALOG,
  addons: [
    { id: "drone", name: "Drone coverage", price: 25_000, description: "", enabled: true },
    { id: "album", name: "Extra album", price: 15_000, description: "", enabled: false }
  ]
};

test("the three packages keep their advertised names and prices", () => {
  assert.deepEqual(
    DEFAULT_CATALOG.packages.map((p) => [p.name, p.price]),
    [
      ["Standard Wedding Package", 100_000],
      ["Premium Wedding Package", 150_000],
      ["Advance Premium Wedding Package", 200_000]
    ]
  );
  assert.ok(DEFAULT_CATALOG.packages.every((p) => p.inclusions.length === 0), "inclusions are left for the owner to fill in");
});

test("estimate adds enabled add-ons once and rejects disabled ones", () => {
  assert.equal(estimate(pub(catalog), "premium", []).total, 150_000);
  assert.equal(estimate(pub(catalog), "premium", ["drone", "drone"]).total, 175_000);
  assert.throws(() => estimate(pub(catalog), "premium", ["album"]), CatalogError);
  assert.throws(() => estimate(pub(catalog), "gold", []), CatalogError);
  const off = { ...catalog, packages: catalog.packages.map((p) => (p.id === "standard" ? { ...p, enabled: false } : p)) };
  assert.throws(() => estimate(pub(off), "standard", []), CatalogError);
});

test("a discount applies only while the owner's offer runs, and only below the regular price", () => {
  const sale: Catalog = {
    ...catalog,
    packages: catalog.packages.map((p) => (p.id === "premium" ? { ...p, salePrice: 130_000, saleLabel: "Winter offer", saleEndsOn: "2026-12-31" } : p))
  };
  const during = estimate(pub(sale, "2026-12-31"), "premium", ["drone"]);
  assert.equal(during.total, 155_000);
  assert.equal(during.package?.listPrice, 150_000);
  const afterEnd = estimate(pub(sale, "2027-01-01"), "premium", []);
  assert.equal(afterEnd.total, 150_000);
  assert.equal(afterEnd.package?.listPrice, null);
  const bad = { ...sale, packages: sale.packages.map((p) => (p.id === "premium" ? { ...p, salePrice: 160_000 } : p)) };
  assert.equal(catalogSchema.safeParse(bad).success, false, "discount above the regular price is rejected");
});

test("the custom package totals only the chosen add-ons plus the owner's base price", () => {
  assert.equal(estimate(pub(catalog), "custom", []).total, 0);
  assert.equal(estimate(pub(catalog), "custom", ["drone"]).total, 25_000);
  const off = { ...catalog, custom: { ...catalog.custom, enabled: false } };
  assert.throws(() => estimate(pub(off), "custom", []), CatalogError);
});

test("catalogs saved before discounts and the custom package still load", () => {
  const legacy = {
    packages: DEFAULT_CATALOG.packages.map((p) => {
      const old: Record<string, unknown> = { ...p };
      delete old.salePrice;
      delete old.saleLabel;
      delete old.saleEndsOn;
      return old;
    }),
    addons: []
  };
  const parsed = catalogSchema.parse(legacy);
  assert.equal(parsed.custom.enabled, true);
  assert.ok(parsed.packages.every((p) => p.salePrice === null));
});

test("local Pakistani numbers are converted for wa.me", () => {
  assert.equal(normalizeWhatsApp("03410724335"), "923410724335");
  assert.equal(normalizeWhatsApp("+92 341 0724335"), "923410724335");
  assert.equal(normalizeWhatsApp("0092-341-0724335"), "923410724335");
  assert.equal(normalizeWhatsApp("3410724335"), "923410724335");
  assert.equal(normalizeWhatsApp("REPLACE_ME"), "");
});

test("WhatsApp links are fully URL-encoded and never invent a number", () => {
  const text = enquiryWhatsAppText({
    packageName: "Premium Wedding Package",
    packagePrice: 150_000,
    functions: [{ label: "Mehndi", date: "2026-12-20", startTime: "19:00", endTime: "23:30", venue: "Hall #2 & Lawn" }],
    addons: [{ name: "Drone coverage", price: 25_000 }],
    estimatedTotal: 175_000,
    name: "Ayesha",
    phone: "0300 1234567",
    budget: "Around 160k?"
  });
  const url = waLink(text, "03410724335");
  assert.ok(url.startsWith("https://wa.me/923410724335?text="));
  const encoded = url.split("?text=")[1];
  assert.doesNotMatch(encoded, /[\s#&?]/, "spaces, #, & and ? are encoded");
  assert.equal(decodeURIComponent(encoded), text);
  assert.match(text, /Premium Wedding Package \(advertised PKR 150,000\)/);
  assert.match(text, /Estimated total: PKR 175,000/);
  assert.match(text, /confirmed only after ZH Films approves/);
  assert.doesNotMatch(text, /IBAN|account number|Easypaisa/i);
  assert.equal(waLink("hi", ""), "https://wa.me/?text=hi");
});
