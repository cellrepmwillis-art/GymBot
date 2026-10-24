import { test } from "node:test";
import assert from "node:assert/strict";
import { streak, pastSeven, trainingWeek, level, celebrate, weekdayOf } from "./celebrate.js";

// 2026-10-19 is a Monday; Sunday (0) is the rest day.
const done = (...keys) => Object.fromEntries(keys.map((key) => [key, { complete: true }]));
const OCT = (d) => `2026-10-${String(d).padStart(2, "0")}`;

test("weekdays from day keys", () => {
  assert.equal(weekdayOf("2026-10-19"), 1);
  assert.equal(weekdayOf("2026-10-25"), 0);
});

test("streaks skip the rest day and wait for today", () => {
  // Thu 15 through Sat 24, Sunday 18 off.
  const locked = done(OCT(15), OCT(16), OCT(17), OCT(19), OCT(20), OCT(21), OCT(22), OCT(23));
  assert.equal(streak(locked, OCT(24), 0), 8); // today not finished yet: counts from Friday
  locked[OCT(24)] = { complete: true };
  assert.equal(streak(locked, OCT(24), 0), 9);
  delete locked[OCT(20)];
  assert.equal(streak(locked, OCT(24), 0), 4);
});

test("past seven days", () => {
  const locked = done(OCT(18), OCT(19), OCT(20), OCT(22), OCT(24));
  assert.equal(pastSeven(locked, OCT(24), 0), 5);
  // Stretching on the rest day doesn't count as a workout.
  locked[OCT(18)] = { complete: true, rest: true };
  assert.equal(pastSeven(locked, OCT(24), 0), 4);
});

test("the training week starts the day after the rest day", () => {
  assert.deepEqual(trainingWeek(OCT(24), 0), { id: OCT(19), days: [OCT(19), OCT(20), OCT(21), OCT(22), OCT(23), OCT(24)] });
  assert.deepEqual(trainingWeek(OCT(25), 0).id, OCT(19)); // the rest day closes the week
  assert.deepEqual(trainingWeek(OCT(21), 3).id, OCT(15)); // Wednesday off: Thursday starts it
});

test("levels", () => {
  assert.equal(level(0), null);
  assert.equal(level(1), "Official Locksmith");
  assert.equal(level(4), "Master Locksmith");
  assert.equal(level(12), "Vault Keeper");
});

test("a full week makes you an Official Locksmith, once", () => {
  const locked = done(OCT(19), OCT(20), OCT(21), OCT(22), OCT(23), OCT(24));
  const first = celebrate({ locked, today: OCT(24), restDay: 0, achievements: { completeDays: 5 } });
  assert.equal(first.celebration.title, "Locked in!");
  assert.match(first.celebration.badges[0].text, /all six days' goals met\. Official Locksmith level achieved\.$/);
  assert.equal(first.achievements.fullWeeks, 1);
  assert.equal(first.achievements.completeDays, 6);
  // Not twice for the same week.
  const again = celebrate({ locked, today: OCT(24), restDay: 0, achievements: first.achievements });
  assert.ok(!again.celebration.badges.some((b) => b.icon === "🏆"));
});

test("five of seven, streaks, firsts and totals", () => {
  const locked = done(OCT(19), OCT(20), OCT(22), OCT(23), OCT(24));
  const five = celebrate({ locked, today: OCT(24), restDay: 0, achievements: { completeDays: 9 } });
  const texts = five.celebration.badges.map((b) => b.text);
  assert.ok(texts.includes("You locked in 5 of the past 7 days. Arnold would be proud."));
  assert.ok(texts.includes("3-day streak. Rest days don't break it."));
  assert.ok(texts.includes("10 workouts fully locked in."));
  const first = celebrate({ locked: done(OCT(24)), today: OCT(24), restDay: 0, achievements: undefined });
  assert.deepEqual(first.celebration.badges.map((b) => b.icon), ["🔑"]);
});

test("rest days get a gentle celebration and count for nothing", () => {
  const { celebration, achievements } = celebrate({ locked: done(OCT(25)), today: OCT(25), restDay: 0, achievements: { completeDays: 3 }, rest: true });
  assert.equal(celebration.title, "Recovery locked in");
  assert.equal(celebration.badges.length, 0);
  assert.equal(achievements.completeDays, 3);
});
