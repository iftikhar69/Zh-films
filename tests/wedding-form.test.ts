import { test } from "node:test";
import assert from "node:assert/strict";
import { newFunctionRow, removeFunction, sameDayOverlaps, toPayload, toggleFunction, updateFunction, withIds } from "../lib/wedding-functions";
import { BUDGET_TIERS, composeBudget } from "../lib/budget-tiers";

test("selecting Nikah and Walima keeps two independent rows", () => {
  let rows = toggleFunction([], "nikah");
  rows = toggleFunction(rows, "walima");
  assert.deepEqual(rows.map((r) => r.type), ["nikah", "walima"]);
  assert.notEqual(rows[0].id, rows[1].id);
  assert.deepEqual([rows[0].startTime, rows[1].startTime], ["11:00", "19:00"], "each gets its own default times");
});

test("editing one function never changes another", () => {
  let rows = toggleFunction(toggleFunction([], "nikah"), "walima");
  const [nikah, walima] = rows;
  rows = updateFunction(rows, walima.id, { eventDate: "2027-01-02", venue: "Serena" });
  rows = updateFunction(rows, nikah.id, { eventDate: "2027-01-01" });
  assert.deepEqual(rows.map((r) => [r.type, r.eventDate, r.venue]), [["nikah", "2027-01-01", ""], ["walima", "2027-01-02", "Serena"]]);
});

test("deselecting or removing one function leaves the others and their details intact", () => {
  let rows = toggleFunction(toggleFunction(toggleFunction([], "nikah"), "mehndi"), "walima");
  rows = updateFunction(rows, rows[2].id, { eventDate: "2027-01-03" });
  const off = toggleFunction(rows, "nikah");
  assert.deepEqual(off.map((r) => r.type), ["mehndi", "walima"]);
  assert.equal(off[1].eventDate, "2027-01-03");
  const removed = removeFunction(rows, rows[1].id);
  assert.deepEqual(removed.map((r) => r.type), ["nikah", "walima"]);
  assert.equal(removed[1].eventDate, "2027-01-03");
});

test("'Other' can be added more than once; the list is capped", () => {
  let rows = toggleFunction(toggleFunction([], "other"), "other");
  assert.equal(rows.length, 2);
  for (const t of ["nikah", "mehndi", "baraat", "walima", "dholki"] as const) rows = toggleFunction(rows, t);
  assert.equal(rows.length, 6);
});

test("same-day overlaps are flagged before sending; different days are fine", () => {
  const nikah = { ...newFunctionRow("nikah", "a"), eventDate: "2027-01-01" };
  const baraat = { ...newFunctionRow("baraat", "b"), eventDate: "2027-01-01" };
  const walima = { ...newFunctionRow("walima", "c"), eventDate: "2027-01-01" };
  assert.equal(sameDayOverlaps([nikah, baraat]).length, 1, "11–15 and 14–22 overlap");
  assert.equal(sameDayOverlaps([nikah, walima]).length, 0, "11–15 and 19–23 don't");
  assert.equal(sameDayOverlaps([nikah, { ...baraat, eventDate: "2027-01-02" }]).length, 0);
  const late = { ...newFunctionRow("mehndi", "d"), eventDate: "2027-01-01", startTime: "22:00", endTime: "02:00" };
  assert.equal(sameDayOverlaps([late, walima]).length, 1, "past-midnight functions are compared correctly");
});

test("older drafts without ids are upgraded, and ids are not sent to the server", () => {
  const rows = withIds([{ type: "nikah", eventDate: "", startTime: "11:00", endTime: "15:00", venue: "" }]);
  assert.ok(rows[0].id);
  assert.deepEqual(Object.keys(toPayload(rows)[0]).sort(), ["endTime", "eventDate", "startTime", "type", "venue"]);
});

test("suggested budgets match the published guide and stay editable", () => {
  assert.equal(BUDGET_TIERS.standard.amount, "PKR 80,000–110,000");
  assert.equal(BUDGET_TIERS.medium.amount, "PKR 150,000");
  assert.equal(BUDGET_TIERS.premium.amount, "PKR 200,000");
  assert.equal(composeBudget("premium", ""), "Suggested budget: Premium (PKR 200,000)");
  assert.equal(composeBudget("standard", "  95k  "), "Suggested budget: Standard (PKR 80,000–110,000) · 95k");
  assert.equal(composeBudget(undefined, "Around 120k"), "Around 120k");
});
