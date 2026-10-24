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

test("GLP-1 widens what counts as on track, with a side-by-side", () => {
  // 2 weeks from 200 lb: a regular cut is 2–4 lb, a GLP-1 1–6 lb.
  const glp1 = (lb, aim = "cut") => analyzeWeight({ start, latest: at(14, lb), aim, trainer: "glp1" });
  const fastish = glp1(197); // 1.5 lb/wk = 0.75%
  assert.equal(fastish.label, "On track");
  assert.match(fastish.detail, /^A regular cut would usually be down about 2\.0–4\.0 lb by now .* On a GLP-1, about 1\.0–6\.0 lb is in the expected range/);
  // 1.25% a week: too fast on a regular cut, expected on a GLP-1.
  assert.equal(analyzeWeight({ start, latest: at(14, 195), aim: "cut" }).label, "Heads up");
  assert.equal(glp1(195).headline, "Losing faster than a regular cut, as expected on a GLP-1. (−2.5 lb a week)");
  // Over 1.5% a week is fast even on a GLP-1.
  assert.equal(glp1(193).label, "Heads up");
  // Flat is leveling off, not stalling.
  assert.equal(glp1(199.8).label, "Leveling off");
  assert.equal(glp1(202).tone, "bad");
  // Losing on maintain is expected on a GLP-1.
  assert.equal(glp1(197, "maintain").label, "On track");
  // Gain is judged as usual.
  assert.equal(glp1(201.5, "gain").label, "On track");
});
