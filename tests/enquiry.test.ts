import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CATALOG, estimate, CatalogError } from "../lib/catalog-shared";
import { enquiryWhatsAppText } from "../lib/enquiry";
import { normalizeWhatsApp, waLink } from "../lib/film-family";

const catalog = {
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
  assert.equal(estimate(catalog, "premium", []).total, 150_000);
  assert.equal(estimate(catalog, "premium", ["drone", "drone"]).total, 175_000);
  assert.throws(() => estimate(catalog, "premium", ["album"]), CatalogError);
  assert.throws(() => estimate(catalog, "gold", []), CatalogError);
  const off = { ...catalog, packages: catalog.packages.map((p) => (p.id === "standard" ? { ...p, enabled: false } : p)) };
  assert.throws(() => estimate(off, "standard", []), CatalogError);
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
