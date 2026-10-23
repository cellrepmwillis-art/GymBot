import { test } from "node:test";
import assert from "node:assert/strict";
import { suggest, timeWindow, gymDay, TARGETS, caloriesBurned } from "./workouts.js";
import { restStepEffort } from "./met.js";

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

test("trainer off matches the standard plan", () => {
  const a = suggest({ date: at(0, 10), aim: "gain" });
  const b = suggest({ date: at(0, 10), aim: "gain", trainer: "none" });
  assert.deepEqual(a, b);
  assert.equal(suggest({ date: at(0, 10), trainer: "bogus" }).trainer, "none");
});

test("powerlifter: heavy low reps, long rests, deadlift on Pull A", () => {
  const pull = suggest({ date: at(1, 10), aim: "gain", gym: "af", trainer: "powerlifter" });
  assert.equal(pull.exercises[0].name, "Barbell deadlift");
  assert.equal(pull.exercises[0].sets, 5);
  assert.equal(pull.exercises[0].reps, "3–5");
  assert.equal(pull.exercises[0].rest, "3–5 min");
  assert.equal(pull.exercises.length, 5);
  assert.equal(pull.superset, false);
  const pf = suggest({ date: at(1, 10), gym: "pf", trainer: "powerlifter" });
  assert.equal(pf.exercises[0].name, "Smith machine deadlift");
  assert.ok(pf.notes.some((n) => /Anytime Fitness/.test(n)));
});

test("marathon: a run every day but Sunday, lifting on some", () => {
  const week = [0, 1, 2, 3, 4, 5].map((d) => suggest({ date: at(d, 7), trainer: "marathon" }));
  assert.deepEqual(week.map((w) => w.title), ["Easy run + upper body", "Speed work", "Easy run + runner's legs", "Tempo run + upper body", "Cross-train + core", "Long run"]);
  assert.ok(week.every((w) => w.run && !w.cardio));
  assert.equal(week[1].exercises.length, 0);
  assert.equal(week[5].exercises.length, 0);
  assert.equal(week[2].exercises[0].name, "Dumbbell Bulgarian split squat");
  assert.equal(suggest({ date: at(6, 10), trainer: "marathon" }).rest, true);
  // A body part replaces the run day.
  const chest = suggest({ date: at(1, 10), trainer: "marathon", target: "chest" });
  assert.equal(chest.title, "Chest day");
  assert.equal(chest.run, null);
  assert.match(chest.cardio, /Easy run/);
});

test("weight loss: circuits and more cardio", () => {
  const w = suggest({ date: at(0, 10), aim: "cut", trainer: "weightLoss" });
  assert.equal(w.superset, true);
  assert.equal(w.exercises[1].rest, "30–45 sec");
  assert.match(w.cardio, /35–45 min/);
  assert.ok(suggest({ date: at(0, 10), aim: "gain", trainer: "weightLoss" }).notes.some((n) => /set Aim to Cut/.test(n)));
});

test("GLP-1: lifting first, no supersets, lighter around the shot", () => {
  const w = suggest({ date: at(0, 10), aim: "cut", trainer: "glp1", shotDay: 4 }); // Monday, shot Thursday
  assert.equal(w.superset, false);
  assert.equal(w.exercises.length, 5);
  assert.ok(w.notes.some((n) => /lean mass/.test(n)));
  assert.ok(w.notes.some((n) => /Not medical advice/.test(n)));
  for (const d of [3, 4]) { // Thursday and Friday
    const near = suggest({ date: at(d, 10), trainer: "glp1", shotDay: 4 });
    assert.equal(near.exercises.length, 4);
    assert.ok(near.notes.some((n) => /Shot day/.test(n)));
  }
  assert.equal(suggest({ date: at(2, 10), trainer: "glp1", shotDay: 4 }).exercises.length, 5);
  assert.equal(suggest({ date: at(3, 10), trainer: "glp1", shotDay: "" }).exercises.length, 5);
});

test("every workout is a checklist of items with minutes and effort", () => {
  for (const trainer of ["none", "marathon", "glp1", "powerlifter", "weightLoss", "bodybuilder"]) {
    for (let d = 0; d < 7; d++) {
      const w = suggest({ date: at(d, 10), trainer });
      assert.ok(w.items.length > 0);
      assert.equal(new Set(w.items.map((i) => i.id)).size, w.items.length);
      for (const item of w.items) {
        assert.ok(item.minutes >= 0 && item.met >= 0, `${trainer} ${d} ${item.id}`);
        if (item.kind !== "step") assert.ok(item.minutes > 0 && item.met > 0, `${trainer} ${d} ${item.id}`);
      }
    }
  }
  const pushA = suggest({ date: at(0, 10), aim: "cut" });
  assert.deepEqual(pushA.items.map((i) => i.id), ["warmup", "ex0", "ex1", "ex2", "ex3", "ex4", "ex5", "cardio"]);
  const tempo = suggest({ date: at(3, 7), trainer: "marathon" });
  assert.deepEqual(tempo.items.slice(0, 2).map((i) => i.id), ["warmup", "run"]);
  assert.equal(tempo.items[1].name, "Tempo run");
});

test("calories burned count only locked items", () => {
  const items = [
    { id: "a", minutes: 60, met: 3.5 },
    { id: "b", minutes: 30, met: 8.3 },
  ];
  // 3.5 MET × 81.6 kg × 1 h = 286
  assert.equal(caloriesBurned(items, ["a"], 180), 286);
  assert.equal(caloriesBurned(items, [], 180), 0);
  assert.equal(caloriesBurned(items, ["a", "b"], 180), 286 + 339);
});

test("rest-day walks and stretching count; advice doesn't", () => {
  assert.deepEqual(restStepEffort("Walk 20–40 min at an easy pace."), { minutes: 30, met: 3.5 });
  assert.deepEqual(restStepEffort("10 min of stretching: hips"), { minutes: 10, met: 2.3 });
  assert.deepEqual(restStepEffort("Get to bed on time."), { minutes: 0, met: 0 });
  const sunday = suggest({ date: at(6, 10), aim: "cut" });
  assert.equal(sunday.items[0].minutes, 52.5);
});

test("the rest day can be any weekday; the split follows it", () => {
  // Wednesday off: Thursday is Push A, Tuesday Legs B.
  const titles = [0, 1, 2, 3, 4, 5, 6].map((d) => suggest({ date: at(d, 10), restDay: 3 }).title);
  assert.deepEqual(titles, ["Pull B", "Legs B", "Rest day", "Push A", "Pull A", "Legs A", "Push B"]);
  assert.equal(suggest({ date: at(2, 10), restDay: 3 }).focus, "Recover for Thursday");
  assert.equal(suggest({ date: at(6, 10), restDay: "3" }).title, "Push B");
  // The marathon week moves too: the long run is the day before the rest day.
  assert.equal(suggest({ date: at(1, 7), trainer: "marathon", restDay: 3 }).title, "Long run");
  assert.equal(suggest({ date: at(6, 10), restDay: 0 }).focus, "Recover for Monday");
});
