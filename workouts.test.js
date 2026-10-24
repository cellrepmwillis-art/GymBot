import { test } from "node:test";
import assert from "node:assert/strict";
import { suggest, timeWindow, gymDay, TARGETS, caloriesBurned, equipmentRank, equipmentKind } from "./workouts.js";
import { dayKey, nextReset } from "./day.js";

// 2026-10-19 is a Monday.
const at = (day, hour, minute = 0) => new Date(2026, 9, 19 + day, hour, minute);

test("Monday to Saturday run push, pull, legs twice; Sunday is rest", () => {
  const titles = [0, 1, 2, 3, 4, 5, 6].map((d) => suggest({ date: at(d, 10) }).title);
  assert.deepEqual(titles, ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B", "Rest day"]);
  assert.equal(suggest({ date: at(6, 10) }).rest, true);
});

test("the day rolls over at midnight", () => {
  assert.equal(gymDay(at(0, 23, 59)), 1); // 11:59pm Monday
  assert.equal(gymDay(at(1, 0, 0)), 2); // midnight starts Tuesday
  assert.equal(suggest({ date: at(0, 23, 59) }).title, "Push A");
  assert.equal(suggest({ date: at(1, 0, 0) }).title, "Pull A");
  assert.equal(dayKey(at(1, 0, 0)), "2026-10-20");
  assert.equal(dayKey(at(0, 23, 59)), "2026-10-19");
  assert.deepEqual(nextReset(at(0, 23, 59)), at(1, 0, 0));
  // Midnight to 3am is still the late-night window.
  assert.equal(timeWindow(at(1, 0, 0)).key, "late");
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

test("shuffle moves every exercise to its next planned choice", () => {
  const a = suggest({ date: at(0, 10), gym: "pf" });
  const b = suggest({ date: at(0, 10), gym: "pf", shuffle: 1 });
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
  assert.ok(w.health.some((n) => /Not medical advice/.test(n)));
  for (const d of [3, 4]) { // Thursday and Friday
    const near = suggest({ date: at(d, 10), trainer: "glp1", shotDay: 4 });
    assert.equal(near.exercises.length, 4);
    assert.ok(near.health.some((n) => /Shot day/.test(n)));
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
        assert.ok(item.minutes > 0 && item.met > 0, `${trainer} ${d} ${item.id}`);
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

test("the rest day is stretching only", () => {
  for (const trainer of ["none", "marathon", "weightLoss", "glp1", "powerlifter", "bodybuilder"]) {
    for (const aim of ["gain", "maintain", "cut"]) {
      const w = suggest({ date: at(6, 10), trainer, aim });
      assert.equal(w.rest, true);
      assert.ok(w.items.every((i) => i.kind === "stretch" && i.met === 2.3));
      // Nothing that reads as exercise beyond stretching.
      for (const text of [w.focus, ...w.notes, ...w.health, ...w.items.map((i) => `${i.name} ${i.text}`)]) {
        assert.doesNotMatch(text, /\b(walk|walking|run|steps|cardio|lift|train)\b/i, `${trainer}: ${text}`);
      }
    }
  }
  assert.equal(suggest({ date: at(6, 10) }).minutes, 11);
});

test("swapping an exercise cycles through up to three choices: planned, then machine, free weight, other", () => {
  const names = (swaps) => suggest({ date: at(0, 10), gym: "af", swaps }).exercises[0];
  // Push A's first exercise at an Anytime Fitness style gym.
  assert.equal(names({}).name, "Barbell bench press");
  // Then a machine (the Smith machine), then a dumbbell: one of each kind
  // before a second machine.
  assert.equal(names({}).alternative, "Smith machine bench press");
  assert.equal(names({ 0: 1 }).name, "Smith machine bench press");
  assert.equal(names({ 0: 1 }).alternative, "Dumbbell bench press");
  assert.equal(names({ 0: 2 }).name, "Dumbbell bench press");
  assert.equal(names({ 0: 2 }).alternative, "Barbell bench press");
  assert.equal(names({ 0: 3 }).name, "Barbell bench press");
  // Other exercises stay put.
  assert.equal(suggest({ date: at(0, 10), gym: "af", swaps: { 0: 1 } }).exercises[1].name, "Incline dumbbell press");
  // Hammer curl: machine, then the other (cable), then back.
  const curl = (swaps) => suggest({ date: at(1, 10), swaps }).exercises[5].name;
  assert.deepEqual([0, 1, 2, 3].map((n) => curl({ 5: n })), ["Hammer curl", "Biceps curl machine (neutral grip)", "Cable rope hammer curl", "Hammer curl"]);
  // Machines come before free weights, free weights before the rest.
  const fly = suggest({ date: at(0, 10), swaps: {} }).exercises[3];
  assert.equal(fly.name, "Cable fly");
  assert.equal(fly.alternative, "Pec deck");
  assert.equal(suggest({ date: at(0, 10), swaps: { 3: 1 } }).exercises[3].alternative, "Dumbbell fly");
});

test("equipment ranks", () => {
  assert.equal(equipmentRank("Smith machine squat"), 0);
  assert.equal(equipmentRank("Lat pulldown"), 0);
  assert.equal(equipmentRank("Leg press"), 0);
  assert.equal(equipmentRank("Dumbbell curl"), 1);
  assert.equal(equipmentRank("Barbell back squat"), 1);
  assert.equal(equipmentRank("Cable fly"), 2);
  assert.equal(equipmentRank("Push-up"), 2);
});

test("each trainer starts with its favorite equipment", () => {
  const first = (trainer, gym, day = 0, i = 0) => suggest({ date: at(day, 10), trainer, gym }).exercises[i];
  // Push A's first exercise: barbell, Smith machine or dumbbell bench press.
  assert.equal(first("none", "af").name, "Barbell bench press");
  assert.equal(first("powerlifter", "af").name, "Barbell bench press");
  assert.equal(first("powerlifter", "pf").name, "Smith machine bench press");
  assert.equal(first("glp1", "af").name, "Chest press machine");
  // Push A's fly: cable fly, pec deck or dumbbell fly.
  assert.equal(first("bodybuilder", "pf", 0, 3).name, "Cable fly");
  assert.equal(first("bodybuilder", "pf", 0, 3).alternative, "Pec deck");
  assert.equal(first("weightLoss", "pf", 0, 3).name, "Pec deck");
  // Swaps follow the trainer's order: bodybuilder fly goes cable, machine, dumbbell.
  const fly = (n) => suggest({ date: at(0, 10), trainer: "bodybuilder", swaps: { 3: n } }).exercises[3].name;
  assert.deepEqual([0, 1, 2, 3].map(fly), ["Cable fly", "Pec deck", "Dumbbell fly", "Cable fly"]);
});

test("equipment kinds", () => {
  assert.equal(equipmentKind("Straight-arm cable pulldown"), "cable");
  assert.equal(equipmentKind("Lat pulldown"), "machine");
  assert.equal(equipmentKind("Hammer curl"), "dumbbell");
  assert.equal(equipmentKind("Seated calf raise"), "machine");
  assert.equal(equipmentKind("Standing calf raise (Smith machine)"), "smith");
  assert.equal(equipmentKind("Push-up"), "other");
});

test("marathon lifting starts with free weights", () => {
  // Monday's upper body after the easy run: Push A's chest press goes dumbbell.
  assert.equal(suggest({ date: at(0, 7), trainer: "marathon", gym: "af" }).exercises[0].name, "Dumbbell bench press");
});

test("every exercise cycles through three different choices at either gym", () => {
  let checked = 0;
  for (const gym of ["pf", "af", "outdoor"]) for (let d = 0; d < 7; d++) for (const target of [null, ...Object.keys(TARGETS)]) for (const trainer of ["none", "bodybuilder", "powerlifter", "marathon", "weightLoss", "glp1"]) {
    const args = { date: at(d, 10), gym, target, trainer };
    const w = suggest(args);
    if (w.rest) continue;
    w.exercises.forEach((_, i) => {
      const seq = [0, 1, 2, 3].map((n) => suggest({ ...args, swaps: { [i]: n } }).exercises[i]);
      const names = seq.map((e) => e.name);
      assert.equal(new Set(names.slice(0, 3)).size, 3, `${gym} ${d} ${target} ${trainer} #${i}: ${names}`);
      assert.equal(names[3], names[0]);
      seq.forEach((e, k) => assert.equal(e.alternative, names[(k + 1) % 3]));
      checked++;
    });
  }
  assert.ok(checked > 1000);
});

test("cardio only and strength only overrides", () => {
  const cardio = suggest({ date: at(0, 10), mode: "cardio", aim: "cut" });
  assert.equal(cardio.mode, "cardio");
  assert.deepEqual(cardio.items.map((i) => i.id), ["warmup", "cardio"]);
  assert.equal(cardio.exercises.length, 0);
  assert.match(cardio.cardio, /^45 min incline treadmill walk/);
  assert.match(suggest({ date: at(0, 12), mode: "cardio" }).cardio, /^30 min of steady cardio/);

  const strength = suggest({ date: at(0, 10), mode: "strength" });
  assert.equal(strength.mode, "strength");
  assert.equal(strength.cardio, null);
  assert.ok(strength.items.every((i) => i.kind === "warmup" || i.kind === "lift"));
  assert.equal(strength.exercises.length, 6);

  // Marathon: cardio only on a lifting day is the run alone; strength only on
  // a run-only day lifts that day's standard split.
  const easy = suggest({ date: at(0, 7), trainer: "marathon", mode: "cardio" });
  assert.deepEqual(easy.items.map((i) => i.id), ["warmup", "run"]);
  const speed = suggest({ date: at(1, 10), trainer: "marathon", mode: "strength" });
  assert.equal(speed.run, null);
  assert.equal(speed.title, "Pull A");
  // The rest day stays a rest day.
  assert.equal(suggest({ date: at(6, 10), mode: "strength" }).rest, true);
  assert.equal(suggest({ date: at(6, 10), mode: "cardio" }).rest, true);
});

test("an unexpected rest day has nothing to lock", () => {
  const w = suggest({ date: at(1, 10), mode: "rest", target: "chest" });
  assert.equal(w.rest, true);
  assert.equal(w.mode, "rest");
  assert.equal(w.title, "Unexpected rest day");
  assert.deepEqual(w.items, []);
  // The scheduled rest day keeps its stretches.
  assert.equal(suggest({ date: at(6, 10) }).items.length, 7);
});

test("outdoors & home uses no gym equipment", () => {
  const gymWords = /machine|cable|smith|barbell|dumbbell|treadmill|elliptical|stairmaster|rower|bike|pec deck|leg press|(?<!band )lat pulldown/i;
  let checked = 0;
  for (let d = 0; d < 7; d++) for (const target of [null, ...Object.keys(TARGETS)]) for (const trainer of ["none", "bodybuilder", "powerlifter", "weightLoss", "glp1"]) for (const aim of ["gain", "maintain", "cut"]) for (const mode of [null, "cardio", "strength"]) for (const hour of [7, 10, 12, 21]) {
    const w = suggest({ date: at(d, hour), gym: "outdoor", target, trainer, aim, mode });
    for (const item of w.items) {
      const text = `${item.name} ${item.text ?? ""} ${item.alternative ?? ""}`;
      assert.doesNotMatch(text, gymWords, `${d} ${target} ${trainer} ${aim} ${mode}: ${text}`);
      checked++;
    }
    for (const note of w.notes ?? []) assert.doesNotMatch(note, /benches and smith|gym is|planet fitness clubs/i, note);
  }
  assert.ok(checked > 10000);
  const monday = suggest({ date: at(0, 10), gym: "outdoor", aim: "cut" });
  assert.equal(monday.exercises[0].name, "Push-up");
  assert.equal(monday.exercises[0].reps, "10–15");
  assert.equal(monday.exercises[1].reps, "12–20");
  assert.equal(suggest({ date: at(2, 10), gym: "outdoor" }).exercises[5].reps, "30–60 sec"); // plank
  assert.ok(monday.notes.some((n) => /Lower slowly/.test(n)));
  assert.match(monday.warmup, /easy walk/);
  assert.match(monday.cardio, /brisk walk/);
  assert.match(suggest({ date: at(0, 10), gym: "outdoor", mode: "cardio" }).cardio, /^45 min brisk walk at the park/);
});

test("session limits", async () => {
  const { sessionLimits } = await import("./workouts.js");
  assert.deepEqual(sessionLimits("powerlifter", "af"), { strength: 1, cardio: 1, total: 2 });
  assert.deepEqual(sessionLimits("bodybuilder", "pf"), { strength: 2, cardio: 1, total: 3 });
  assert.deepEqual(sessionLimits("marathon", "pf").total, 4);
  assert.deepEqual(sessionLimits("powerlifter", "outdoor").total, 4);
  assert.deepEqual(sessionLimits("bogus", "pf"), { strength: 1, cardio: 1, total: 2 });
});

test("extra sessions are just cardio or just lifting, even on a run day", () => {
  const cardio = suggest({ date: at(1, 18), trainer: "marathon", mode: "cardio", extra: true });
  assert.deepEqual(cardio.items.map((i) => i.id), ["warmup", "cardio"]);
  const back = suggest({ date: at(5, 18), trainer: "marathon", mode: "strength", target: "back", extra: true });
  assert.equal(back.title, "Back day");
  assert.ok(back.items.every((i) => i.kind === "warmup" || i.kind === "lift"));
});

test("never more than five tips, and safety tips stay", () => {
  for (const trainer of ["none", "bodybuilder", "powerlifter", "marathon", "weightLoss", "glp1"]) for (const gym of ["pf", "af", "outdoor"]) for (let d = 0; d < 7; d++) for (const hour of [4, 7, 10, 12, 17, 21, 23]) for (const mode of [null, "cardio", "strength"]) {
    const w = suggest({ date: at(d, hour), trainer, gym, mode, shotDay: d, aim: "gain" });
    assert.ok(w.notes.length <= 5, `${trainer} ${gym} ${d} ${hour}: ${w.notes.length}`);
    assert.ok(w.health.length <= 5, `${trainer} ${gym} ${d} ${hour}: ${w.health.length} health`);
    if (trainer === "glp1" && !w.rest) {
      assert.ok(w.health.some((n) => n.startsWith("Not medical advice")));
      assert.ok(w.health.some((n) => n.startsWith("If you feel dizzy")));
      assert.ok(!w.notes.some((n) => /medical|dizzy|Drink water/.test(n)));
    }
  }
});

test("my routine: 12-3-30 every training day plus one body part", () => {
  const routine = { cardio: "12-3-30", minutes: 45, strength: "rotate" };
  const week = [0, 1, 2, 3, 4, 5].map((d) => suggest({ date: at(d, 17), routine }));
  assert.deepEqual(week.map((w) => w.title), ["Chest + 12-3-30", "Back + 12-3-30", "Legs + 12-3-30", "Shoulders + 12-3-30", "Biceps + 12-3-30", "Triceps + 12-3-30"]);
  for (const w of week) {
    assert.equal(w.routine, true);
    const cardio = w.items.filter((i) => i.kind === "cardio");
    assert.equal(cardio.length, 1);
    assert.equal(cardio[0].minutes, 45);
    assert.equal(cardio[0].met, 8.3);
    assert.match(cardio[0].text, /^12-3-30 for 45 min: treadmill at a 12% incline and 3 mph/);
    assert.ok(w.items.some((i) => i.kind === "lift"));
  }
  // The rest day stays a rest day, and a picked body part or override wins.
  assert.equal(suggest({ date: at(6, 10), routine }).rest, true);
  assert.equal(suggest({ date: at(0, 10), routine, target: "abs" }).title, "Ab day");
  assert.equal(suggest({ date: at(0, 10), routine, mode: "cardio" }).routine, undefined);
});

test("my routine: full body every other day, cardio between", () => {
  const routine = { cardio: "walk", minutes: 30, strength: "fullBody" };
  const titles = [0, 1, 2, 3, 4, 5].map((d) => suggest({ date: at(d, 10), routine, gym: "outdoor" }).title);
  assert.deepEqual(titles, ["Full body + Brisk walk", "Brisk walk", "Full body + Brisk walk", "Brisk walk", "Full body + Brisk walk", "Brisk walk"]);
  const cardioDay = suggest({ date: at(1, 10), routine, gym: "outdoor" });
  assert.deepEqual(cardioDay.items.map((i) => i.id), ["warmup", "cardio"]);
  assert.equal(suggest({ date: at(0, 10), routine, gym: "outdoor" }).exercises[0].name, "Bodyweight squat");
  // No lifting: just the cardio.
  assert.deepEqual(suggest({ date: at(0, 10), routine: { cardio: "bike", minutes: 60, strength: "none" } }).items.map((i) => i.id), ["warmup", "cardio"]);
});

test("full body is a focus too", () => {
  const w = suggest({ date: at(0, 10), target: "fullBody", gym: "af" });
  assert.equal(w.title, "Full body");
  assert.deepEqual(w.exercises.map((e) => e.name), ["Barbell back squat", "Barbell bench press", "Lat pulldown", "Barbell Romanian deadlift", "Seated dumbbell shoulder press", "Plank"]);
});

test("my routine's cardio fits the gym", () => {
  const routine = { cardio: "12-3-30", minutes: 45, strength: "none" };
  assert.match(suggest({ date: at(0, 10), routine, gym: "outdoor" }).cardio, /^45 min brisk walk/);
  assert.match(suggest({ date: at(0, 10), routine: { ...routine, cardio: "hike" }, gym: "pf" }).cardio, /^45 min incline treadmill walk/);
});
