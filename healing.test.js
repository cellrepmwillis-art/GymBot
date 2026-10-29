import { test } from "node:test";
import assert from "node:assert/strict";
import { activeHealing, works } from "./healing.js";
import { suggest } from "./workouts.js";

// Nov 2, 2026 is a Monday: Push A on PPL, full body on Standard.
const monday = new Date(2026, 10, 2, 17);
const lifts = (w) => w.items.filter((i) => i.kind === "lift").map((i) => i.name);
const tattoo = (area) => ({ area, kind: "tattoo", since: "2026-11-01", daysLeft: 13 });

test("healing lasts 14 days from the day it's set", () => {
  const h = { area: "chest", kind: "tattoo", since: "2026-11-01" };
  assert.equal(activeHealing(h, "2026-10-31"), null);
  assert.equal(activeHealing(h, "2026-11-01").daysLeft, 14);
  assert.equal(activeHealing(h, "2026-11-14").daysLeft, 1);
  assert.equal(activeHealing(h, "2026-11-15"), null);
  assert.equal(activeHealing(null, "2026-11-01"), null);
});

test("a day that works the healing area trains something else", () => {
  const w = suggest({ date: monday, trainer: "ppl", healing: tattoo("chest") });
  assert.equal(w.split, "legs");
  assert.match(w.notes[0], /^New tattoo on your chest: today trains something else so it can heal \(13 days left\)/);
  assert.match(w.health[0], /No pools, hot tubs or saunas/);
  // Push day leaves a leg injury alone.
  assert.equal(suggest({ date: monday, trainer: "ppl", healing: { area: "legs", kind: "injury", daysLeft: 5 } }).title, "Push A");
});

test("full body drops the moves that work it", () => {
  const plain = lifts(suggest({ date: monday, trainer: "none" }));
  const healed = lifts(suggest({ date: monday, trainer: "none", healing: tattoo("chest") }));
  assert.ok(plain.includes("Chest press machine"));
  assert.deepEqual(healed, plain.filter((name) => name !== "Chest press machine"));
  assert.ok(lifts(suggest({ date: monday, trainer: "none", healing: { area: "legs", kind: "injury", daysLeft: 5 } })).every((name) => !/Leg|squat/i.test(name)));
});

test("a body part picked by hand stays, with a caution", () => {
  const w = suggest({ date: monday, trainer: "ppl", target: "chest", healing: tattoo("chest") });
  assert.equal(w.split, "chest");
  assert.match(w.notes[0], /you picked a day that works it: go light/);
  const injury = suggest({ date: monday, trainer: "ppl", target: "legs", healing: { area: "legs", kind: "injury", daysLeft: 5 } });
  assert.match(injury.notes[0], /stop if it hurts/);
  assert.match(injury.health[0], /see a doctor or physical therapist/);
});

test("user selected moves its turn, and a pick still wins", () => {
  const routine = { cardio: "12-3-30", minutes: 45, strength: "rotate" };
  const moved = suggest({ date: monday, routine, healing: tattoo("chest") });
  assert.equal(moved.title, "Legs + 12-3-30");
  assert.equal(moved.turn, "legs");
  assert.match(moved.notes[0], /trains something else/);
  assert.equal(suggest({ date: monday, routine: { ...routine, part: "chest" }, healing: tattoo("chest") }).title, "Chest + 12-3-30");
});

test("tips stay within the limit and the area map makes sense", () => {
  for (const trainer of ["none", "ppl", "bodybuilder", "powerlifter", "marathon", "weightLoss", "glp1"]) {
    const w = suggest({ date: monday, trainer, shotDay: 1, healing: tattoo("back") });
    assert.ok(w.notes.length <= 5 && w.health.length <= 5, trainer);
  }
  assert.ok(works("pushA", "arms") && works("pullB", "back") && !works("legsA", "chest") && works("fullBody", "stomach"));
});
