import { test } from "node:test";
import assert from "node:assert/strict";
import { proteinTarget, waterOunces, healthNotes, mergeHealth } from "./health.js";

test("protein matches CookBot's rule", () => {
  assert.deepEqual(proteinTarget({ weightLb: 180, heightIn: 70, aim: "cut" }), { grams: 180, capped: false });
  assert.deepEqual(proteinTarget({ weightLb: 180, heightIn: 70, aim: "maintain" }), { grams: 145, capped: false });
  // 237 lb at 5'5" is past a BMI of 30: based on 180 lb (BMI 30 at 65 in).
  assert.deepEqual(proteinTarget({ weightLb: 237, heightIn: 65, aim: "cut" }), { grams: 180, capped: true });
  // Without a height, the weight itself.
  assert.deepEqual(proteinTarget({ weightLb: 237, heightIn: null, aim: "cut" }), { grams: 235, capped: false });
  assert.equal(proteinTarget({ weightLb: null, aim: "cut" }), null);
});

test("water is about half your weight in ounces", () => {
  assert.equal(waterOunces(180), 88);
  assert.equal(waterOunces(237), 120);
  assert.equal(waterOunces(null), null);
});

test("health notes", () => {
  const [protein, water, sleep] = healthNotes({ weightLb: 237, heightIn: 65, aim: "cut" });
  assert.equal(protein, "Protein: about 180 g today, high on a cut, to keep muscle while you lose fat (based on a healthy weight for your height). CookBot tracks it.");
  assert.match(water, /^Water: about 120 oz \(15 cups\)/);
  assert.match(sleep, /^Sleep: 7–9 hours/);
  assert.match(healthNotes({ weightLb: null, aim: "gain" })[0], /add your weight in Settings/);
});

test("a trainer's notes come first, without repeats, up to the max", () => {
  const everyday = healthNotes({ weightLb: 180, heightIn: 70, aim: "gain" });
  assert.deepEqual(mergeHealth(["Sleep 7–9 hours; that's when muscle is built."], everyday, 5).map((n) => n.split(":")[0]), ["Sleep 7–9 hours; that's when muscle is built.", "Protein", "Water"]);
  const glp1 = ["Shot day…", "Eat a small meal with protein…", "Drink water before…", "If you feel dizzy…", "Not medical advice…"];
  assert.deepEqual(mergeHealth(glp1, everyday, 5), glp1);
  // Without the shot-day note there's room for the protein target, since
  // "protein" without grams doesn't cover it; water is covered.
  assert.deepEqual(mergeHealth(glp1.slice(1), everyday, 5).map((n) => n.split(":")[0]).at(-1), "Protein");
  assert.equal(mergeHealth([], everyday, 5).length, 3);
});
