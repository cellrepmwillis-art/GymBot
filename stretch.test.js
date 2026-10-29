import { test } from "node:test";
import assert from "node:assert/strict";
import { stretchPositions } from "./stretch.js";
import { addDays } from "./week.js";

const PPL = { 1: "push", 2: "pull", 3: "legs", 4: "push", 5: "pull", 6: "legs" };
const MARATHON = { 1: "push", 2: "cardio", 3: "legs", 4: "pull", 5: "abs", 6: "cardio" };
const span = (from, n) => Array.from({ length: n }, (_, i) => addDays(from, i));
// Oct 26, 2026 is a Monday.
const run = (plan, { days, from, today, done = {} }) => {
  const positions = stretchPositions({ days, from, today, partAt: (p) => plan[p], donePart: (day, p) => (day in done ? done[day] : null) });
  return days.map((day) => { const p = positions.get(day); return p ? plan[p] : "cardio day"; });
};

test("your example: Sunday off, chest Monday, moved to Monday on Tuesday", () => {
  // Monday to Sunday before the new Monday rest day: seven days, six workouts.
  const parts = run(PPL, { days: span("2026-10-26", 7), from: "2026-10-27", today: "2026-10-27", done: { "2026-10-26": "push" } });
  assert.deepEqual(parts, ["push", "pull", "legs", "push", "pull", "legs", "cardio day"]);
});

test("fewer days left than workouts: what's still to do, never twice in a row", () => {
  // Moved to Thursday on Wednesday; Monday push and Tuesday pull done.
  assert.deepEqual(run(PPL, { days: span("2026-10-26", 3), from: "2026-10-28", today: "2026-10-28", done: { "2026-10-26": "push", "2026-10-27": "pull" } }), ["push", "pull", "legs"]);
  // Tuesday skipped: pull is still to do, and legs too; Wednesday takes pull.
  const skipped = run(PPL, { days: span("2026-10-26", 4), from: "2026-10-28", today: "2026-10-28", done: { "2026-10-26": "push" } });
  assert.deepEqual(skipped.slice(2), ["pull", "legs"]);
});

test("a body part picked by hand counts as done", () => {
  // Monday was legs (picked under Focus), so legs isn't planned again first.
  const parts = run(PPL, { days: span("2026-10-26", 4), from: "2026-10-27", today: "2026-10-27", done: { "2026-10-26": "legs" } });
  assert.deepEqual(parts.slice(1), ["push", "pull", "push"]);
});

test("marathon: each body part once, then cardio", () => {
  // Moved later: nine days between rest days; Monday to Thursday done.
  const done = { "2026-10-26": "push", "2026-10-27": "cardio", "2026-10-28": "legs", "2026-10-29": "pull" };
  const parts = run(MARATHON, { days: span("2026-10-26", 9), from: "2026-10-30", today: "2026-10-30", done });
  assert.deepEqual(parts.slice(4), ["abs", "cardio", "cardio day", "cardio day", "cardio day"]);
  assert.equal(parts.filter((p) => p === "push").length, 1);
});

test("a change starting next week runs the plan in order", () => {
  assert.deepEqual(run(PPL, { days: span("2026-11-02", 4), from: "2026-11-02", today: "2026-10-29" }), ["push", "pull", "legs", "push"]);
});
