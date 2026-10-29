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
