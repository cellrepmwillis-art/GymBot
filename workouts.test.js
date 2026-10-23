import { test } from "node:test";
import assert from "node:assert/strict";
import { suggest, timeWindow, gymDay, TARGETS } from "./workouts.js";

// 2026-10-19 is a Monday.
const at = (day, hour, minute = 0) => new Date(2026, 9, 19 + day, hour, minute);

test("Monday to Saturday run push, pull, legs twice; Sunday is rest", () => {
  const titles = [0, 1, 2, 3, 4, 5, 6].map((d) => suggest({ date: at(d, 10) }).title);
  assert.deepEqual(titles, ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B", "Rest day"]);
  assert.equal(suggest({ date: at(6, 10) }).rest, true);
});

test("before 3am still counts as the day before", () => {
  assert.equal(gymDay(at(1, 1, 30)), 1); // 1:30am Tuesday is Monday night
  assert.equal(suggest({ date: at(1, 1, 30) }).title, "Push A");
  assert.equal(timeWindow(at(1, 1, 30)).key, "late");
  assert.equal(timeWindow(at(1, 3)).key, "early");
});

test("time of day picks the window", () => {
  const keys = [4, 7, 10, 12, 15, 17, 21, 23].map((h) => timeWindow(at(0, h)).key);
  assert.deepEqual(keys, ["early", "beforeWork", "morning", "lunch", "afternoon", "peak", "evening", "late"]);
});

test("lunch is a 4-exercise express session with supersets", () => {
  const w = suggest({ date: at(0, 12), aim: "gain" });
  assert.equal(w.exercises.length, 4);
  assert.equal(w.superset, true);
  assert.equal(w.exercises[0].superset, undefined);
  assert.equal(w.exercises[1].superset, "A");
  assert.equal(w.exercises[2].superset, "B");
});

test("aims change sets, reps and cardio", () => {
  const gain = suggest({ date: at(0, 10), aim: "gain" });
  const cut = suggest({ date: at(0, 10), aim: "cut" });
  assert.equal(gain.exercises[0].sets, 4);
  assert.equal(cut.exercises[1].reps, "12–15");
  assert.match(gain.cardio, /Optional/);
  assert.match(cut.cardio, /incline treadmill/);
  assert.ok(cut.minutes > gain.minutes - 20);
});

test("barbells only at Anytime Fitness style gyms", () => {
  assert.equal(suggest({ date: at(0, 10), gym: "pf" }).exercises[0].name, "Smith machine bench press");
  assert.equal(suggest({ date: at(0, 10), gym: "af" }).exercises[0].name, "Barbell bench press");
  for (let d = 0; d < 6; d++) {
    for (const e of suggest({ date: at(d, 10), gym: "pf" }).exercises) {
      assert.doesNotMatch(e.name, /Barbell/);
      assert.doesNotMatch(e.alternative ?? "", /Barbell/);
    }
  }
});

test("shuffle moves to the next choice and offers a swap", () => {
  const a = suggest({ date: at(0, 10), gym: "pf" });
  const b = suggest({ date: at(0, 10), gym: "pf", shuffle: 1 });
  assert.equal(a.exercises[0].alternative, b.exercises[0].name);
  assert.notEqual(a.exercises[0].name, b.exercises[0].name);
});

test("an unknown aim falls back to maintain", () => {
  assert.equal(suggest({ date: at(0, 10), aim: "muscle" }).aim, "maintain");
});

test("late night at Planet Fitness mentions club hours", () => {
  assert.ok(suggest({ date: at(0, 23, 30), gym: "pf" }).notes.some((n) => /24 hours/.test(n)));
  assert.ok(!suggest({ date: at(0, 23, 30), gym: "af" }).notes.some((n) => /24 hours/.test(n)));
});

test("a body part replaces today's split, even on Sunday", () => {
  for (const target of Object.keys(TARGETS)) {
    const w = suggest({ date: at(0, 10), target });
    assert.equal(w.target, target);
    assert.equal(w.title, TARGETS[target].title);
    assert.equal(w.exercises.length, 6);
  }
  const sunday = suggest({ date: at(6, 10), target: "chest" });
  assert.equal(sunday.rest, false);
  assert.equal(sunday.title, "Chest day");
  assert.equal(suggest({ date: at(0, 10), target: "nope" }).title, "Push A");
});

test("body-part days still follow the time of day, aim and gym", () => {
  assert.equal(suggest({ date: at(0, 12), target: "back" }).exercises.length, 4);
  assert.equal(suggest({ date: at(0, 10), target: "chest", gym: "pf" }).exercises[0].name, "Smith machine bench press");
  assert.match(suggest({ date: at(0, 10), target: "legs", aim: "cut" }).cardio, /15–20 min/);
});

test("arms and abs use the lighter rep range; holds keep their own", () => {
  const biceps = suggest({ date: at(0, 10), target: "biceps", aim: "gain" });
  assert.equal(biceps.exercises[0].sets, 4);
  assert.equal(biceps.exercises[0].reps, "8–12");
  const abs = suggest({ date: at(0, 10), target: "abs" });
  assert.equal(abs.exercises[0].reps, "12–20");
  assert.equal(abs.exercises[2].reps, "30–60 sec");
  assert.equal(abs.exercises[2].rest, "45 sec");
});
