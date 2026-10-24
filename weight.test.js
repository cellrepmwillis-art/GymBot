import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeWeight, daysBetween } from "./weight.js";

const start = { day: "2026-10-01", lb: 200 };
const at = (days, lb) => {
  const date = new Date(Date.UTC(2026, 9, 1 + days));
  return { day: date.toISOString().slice(0, 10), lb };
};

test("days between day keys", () => {
  assert.equal(daysBetween("2026-10-01", "2026-10-15"), 14);
  assert.equal(daysBetween("2026-10-25", "2026-11-01"), 7); // across the end of daylight saving
});

test("nothing to judge before two weigh-ins or a week", () => {
  assert.equal(analyzeWeight({ start, latest: null }), null);
  assert.equal(analyzeWeight({ start, latest: start }), null);
  const early = analyzeWeight({ start, latest: at(3, 198), aim: "cut" });
  assert.equal(early.label, "Too soon to tell");
  assert.equal(early.headline, "Down 2.0 lb so far.");
});

test("cut: safe, fast, stalling, going up", () => {
  const safe = analyzeWeight({ start, latest: at(14, 197), aim: "cut" }); // 1.5 lb/wk = 0.75%
  assert.equal(safe.tone, "good");
  assert.equal(safe.headline, "Losing at a safe pace. (−1.5 lb a week)");
  const fast = analyzeWeight({ start, latest: at(14, 194), aim: "cut" }); // 3 lb/wk = 1.5%
  assert.equal(fast.tone, "warn");
  assert.match(fast.detail, /risks losing muscle/);
  assert.match(analyzeWeight({ start, latest: at(14, 194), aim: "cut", trainer: "glp1" }).detail, /common in the first months on a GLP-1/);
  assert.equal(analyzeWeight({ start, latest: at(14, 199.6), aim: "cut" }).label, "Stalling");
  const up = analyzeWeight({ start, latest: at(14, 202), aim: "cut" });
  assert.equal(up.tone, "bad");
  assert.match(up.detail, /Lock back in, champ\.$/);
});

test("maintain: steady is the plan; drifting either way is unexpected", () => {
  assert.equal(analyzeWeight({ start, latest: at(21, 200.5), aim: "maintain" }).label, "On track");
  assert.equal(analyzeWeight({ start, latest: at(14, 197), aim: "maintain" }).headline, "Losing weight while maintaining. (−1.5 lb a week)");
  assert.equal(analyzeWeight({ start, latest: at(14, 203), aim: "maintain" }).label, "Unexpected");
});

test("gain: lean, fast, stalling, losing", () => {
  assert.equal(analyzeWeight({ start, latest: at(14, 201.5), aim: "gain" }).label, "On track"); // 0.375%
  assert.equal(analyzeWeight({ start, latest: at(14, 203), aim: "gain" }).label, "Heads up"); // 0.75%
  assert.equal(analyzeWeight({ start, latest: at(14, 200), aim: "gain" }).label, "Stalling");
  assert.equal(analyzeWeight({ start, latest: at(14, 198), aim: "gain" }).tone, "bad");
});
