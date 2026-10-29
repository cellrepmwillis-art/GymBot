import { test } from "node:test";
import assert from "node:assert/strict";
import { backToBackRests, bodyPart } from "./backtoback.js";

// Monday Nov 2 to Sunday Nov 8, 2026, Sunday the rest day.
const week = (parts, extra = {}) => parts.map((part, i) => ({
  key: `2026-11-0${i + 2}`, part: part === "rest" ? null : part, rest: part === "rest", ...extra[i],
}));

test("a normal push, pull, legs week has nothing back to back", () => {
  const days = week(["pushA", "pullA", "legsA", "pushB", "pullB", "legsB", "rest"].map((k) => (k === "rest" ? k : bodyPart(k))));
  assert.deepEqual(backToBackRests(days, "2026-11-02"), []);
});

test("two leg days in a row: the one farther from the rest days rests", () => {
  // Legs Wednesday and Thursday: Wednesday is 3 days from last Sunday,
  // Thursday 3 from this Sunday, so the later one rests.
  assert.deepEqual(backToBackRests(week(["legs", "pull", "legs", "legs", "pull", "legs", "rest"]), "2026-11-02"), [{ key: "2026-11-05", part: "legs" }]);
  // Monday and Tuesday: Tuesday is farther from Sunday.
  assert.deepEqual(backToBackRests(week(["pull", "pull", "legs", "push", "chest", "legs", "rest"]), "2026-11-02").map((r) => r.key), ["2026-11-03"]);
  // An unexpected rest day already taken Friday counts as a rest day:
  // Thursday is then the closer one, so Wednesday rests.
  const days = week(["push", "pull", "legs", "legs", "rest", "push", "rest"]);
  assert.deepEqual(backToBackRests(days, "2026-11-02").map((r) => r.key), ["2026-11-04"]);
});

test("days done or set by hand stay; the other one rests", () => {
  // Wednesday is done (legs), so Thursday rests even though it's closer to Sunday.
  const days = week(["push", "pull", "legs", "legs", "pull", "legs", "rest"], { 2: { fixed: true } });
  assert.deepEqual(backToBackRests(days, "2026-11-05").map((r) => r.key), ["2026-11-05"]);
  // Both set: nothing changes.
  assert.deepEqual(backToBackRests(week(["legs", "legs", "push", "pull", "push", "pull", "rest"], { 0: { fixed: true }, 1: { fixed: true } }), "2026-11-02"), []);
  // A day before today can't become a rest day.
  assert.deepEqual(backToBackRests(week(["legs", "legs", "push", "pull", "push", "pull", "rest"]), "2026-11-04"), []);
});

test("three in a row rests one, then checks again", () => {
  const rested = backToBackRests(week(["legs", "legs", "legs", "push", "pull", "push", "rest"]), "2026-11-02").map((r) => r.key);
  assert.equal(rested.length, 1);
  assert.equal(rested[0], "2026-11-03");
});

import { extraDays } from "./backtoback.js";
import { suggest } from "./workouts.js";
import { addDays, planPosition, trainingWeek, isRestDate } from "./week.js";
import { TRAINERS } from "./trainers.js";

// What each day trains under a rest-day schedule, as the app works it out.
const partsFor = (keys, trainer, schedule) => keys.map((key) => {
  if (isRestDate(schedule, key)) return null;
  const [y, m, d] = key.split("-").map(Number);
  const w = suggest({ date: new Date(y, m - 1, d, 17), trainer, position: planPosition(key, schedule) });
  return w.items.some((i) => i.kind === "lift") ? bodyPart(w.split ?? w.target) : null;
});
const normalFor = (trainer, schedule) => {
  const normal = {};
  const days = trainingWeek("2026-12-15", schedule).days;
  for (const part of partsFor(days, trainer, schedule)) if (part) normal[part] = (normal[part] ?? 0) + 1;
  return normal;
};
const span = (from, n) => Array.from({ length: n }, (_, i) => addDays(from, i));

test("an unchanged rest day never makes an extra body-part day", () => {
  for (const trainer of Object.keys(TRAINERS)) {
    for (let rest = 0; rest < 7; rest++) {
      const keys = span("2026-10-23", 20);
      assert.equal(extraDays(keys, partsFor(keys, trainer, rest), normalFor(trainer, rest), "2026-10-29").size, 0, `${trainer} ${rest}`);
    }
  }
});

test("moving the rest day earlier flags the body parts that come round sooner", () => {
  // Marathon (push, legs and pull once a week), Sunday off, moved to Friday
  // on Thursday Oct 29 for this week.
  const schedule = [{ from: "", day: 0 }, { from: "2026-10-29", day: 5 }];
  const keys = span("2026-10-23", 20);
  const extra = extraDays(keys, partsFor(keys, "marathon", schedule), normalFor("marathon", schedule), "2026-10-29");
  assert.deepEqual([...extra], [["2026-10-31", "push"], ["2026-11-02", "legs"], ["2026-11-03", "pull"]]);
  // Starting next week instead: the same thing a week later, once.
  const later = [{ from: "", day: 0 }, { from: "2026-11-02", day: 5 }];
  const extraLater = extraDays(keys, partsFor(keys, "marathon", later), normalFor("marathon", later), "2026-10-29");
  assert.ok([...extraLater.keys()].every((key) => key >= "2026-11-07"));
});
