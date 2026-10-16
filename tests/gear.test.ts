import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PUBLIC_GEAR_STATUSES, RENT_BACKDROP, SELL_BACKDROP, publicGearWhere } from "../lib/gear";
import { driveFolderId, parseFolderListing } from "../lib/drive";

test("Sell and Rent use different backdrop images, and both files exist", () => {
  assert.notEqual(SELL_BACKDROP, RENT_BACKDROP);
  for (const src of [SELL_BACKDROP, RENT_BACKDROP]) assert.ok(existsSync(join(process.cwd(), "public", src)), src);
});

test("Drafts are never public, and each page filters by its own listing type", () => {
  assert.ok(!(PUBLIC_GEAR_STATUSES as readonly string[]).includes("draft"));
  assert.deepEqual(publicGearWhere("sell").listingType.in, ["sell", "both"]);
  assert.deepEqual(publicGearWhere("rent").listingType.in, ["rent", "both"]);
});

test("Drive folder listing parser keeps only images and decodes names", () => {
  const html = `
    <div class="flip-entry" id="entry-AbC_123-x" tabindex="0"><div class="flip-entry-title">Sony A7S &amp; lens.JPG</div></div>
    <div class="flip-entry" id="entry-doc999" tabindex="0"><div class="flip-entry-title">notes.pdf</div></div>
    <div class="flip-entry" id="entry-p2" tabindex="0"><div class="flip-entry-title">frame.webp</div></div>`;
  assert.deepEqual(parseFolderListing(html), [
    { id: "AbC_123-x", name: "Sony A7S & lens.JPG" },
    { id: "p2", name: "frame.webp" }
  ]);
  assert.equal(driveFolderId("https://drive.google.com/drive/folders/1lpRFfHJ2_HI0jG3k6xnIGOn1qjvU3Jxg?usp=sharing"), "1lpRFfHJ2_HI0jG3k6xnIGOn1qjvU3Jxg");
});
