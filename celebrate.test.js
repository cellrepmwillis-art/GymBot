import { test } from "node:test";
import assert from "node:assert/strict";
import { streak, pastSeven, trainingWeek, level, celebrate, weekdayOf, unexpectedRests, unexpectedRestPrompt, weekDays, weekStats, weeklyBadges } from "./celebrate.js";

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
  // Stretching on a rest day doesn't count as a workout, scheduled or not.
  locked[OCT(18)] = { complete: true, rest: true };
  assert.equal(pastSeven(locked, OCT(24), 0), 4);
  locked[OCT(20)] = { complete: true, rest: true, unexpectedRest: true };
  assert.equal(pastSeven(locked, OCT(24), 0), 3);
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

test("unexpected rest days keep the streak, until the lock is cut", () => {
  const locked = done(OCT(19), OCT(20), OCT(22), OCT(23));
  locked[OCT(21)] = { unexpectedRest: true };
  assert.equal(streak(locked, OCT(23), 0), 4);
  // Today taken off: the streak stands.
  locked[OCT(24)] = { unexpectedRest: true };
  assert.equal(streak(locked, OCT(24), 0), 4);
  // Cutting the lock ends it.
  locked[OCT(24)].streakBreak = true;
  assert.equal(streak(locked, OCT(24), 0), 0);
  // ...but a new streak starts the next training day.
  locked[OCT(26)] = { complete: true };
  assert.equal(streak(locked, OCT(26), 0), 1);
});

test("unexpected rest prompts get firmer", () => {
  const locked = { [OCT(20)]: { unexpectedRest: true }, [OCT(22)]: { unexpectedRest: true }, [OCT(24)]: { unexpectedRest: true } };
  assert.equal(unexpectedRests(locked, OCT(24), 0), 2); // today left out
  assert.equal(unexpectedRests(locked, OCT(26), 0), 0); // a new week
  assert.match(unexpectedRestPrompt(0).text, /you deserve it, boss/);
  assert.equal(unexpectedRestPrompt(0).breaksStreak, false);
  assert.equal(unexpectedRestPrompt(1).title, "That's your 3rd rest day this week");
  assert.match(unexpectedRestPrompt(1).text, /hope you feel better\. Back to locking in tomorrow, champ/);
  const third = unexpectedRestPrompt(2);
  assert.equal(third.title, "That's your 4th rest day this week");
  assert.equal(third.text, "Your streak will be lost. Proceed to cut the lock?");
  assert.equal(third.breaksStreak, true);
  assert.equal(unexpectedRestPrompt(3).title, "That's your 5th rest day this week");
});

test("the training week's seven days end on the rest day", () => {
  assert.deepEqual(weekDays(OCT(21), 0), [OCT(19), OCT(20), OCT(21), OCT(22), OCT(23), OCT(24), OCT(25)]);
});

test("weekly stats add up the week's days", () => {
  const locked = {
    [OCT(19)]: { gym: true, strength: true, cardioMin: 25 },
    [OCT(20)]: { gym: true, strength: false, cardioMin: 90 },
    [OCT(25)]: { gym: true, strength: true, cardioMin: 0 }, // trained on the rest day
    [OCT(18)]: { gym: true, strength: true, cardioMin: 60 }, // last week
  };
  assert.deepEqual(weekStats(locked, OCT(21), 0), { gymDays: 3, strengthDays: 2, cardioMinutes: 115 });
});

test("weekly goals are celebrated once each, as they're reached", () => {
  const locked = { [OCT(19)]: { gym: true, strength: true, cardioMin: 30 } };
  let awarded = [];
  const step = () => {
    const result = weeklyBadges({ locked, today: OCT(24), restDay: 0, awarded });
    awarded = result.awarded;
    return result.badges.map((b) => b.text);
  };
  assert.deepEqual(step(), []);
  locked[OCT(20)] = { gym: true, strength: true, cardioMin: 30 };
  assert.deepEqual(step(), [
    "Looks like you managed to hit the gym twice this week. Certified Maintainer.",
    "Strength training on 2 days this week, the HHS minimum for muscle-strengthening. Certified Strong.",
  ]);
  assert.deepEqual(step(), []); // not twice
  locked[OCT(21)] = { gym: true, cardioMin: 45 };
  locked[OCT(22)] = { gym: true, cardioMin: 45 };
  // Jumping from 2 to 4 gym days shows only Gym Rat; 150 minutes reached.
  assert.deepEqual(step(), [
    "You hit the gym four days this week. Certified Gym Rat.",
    "150 minutes of cardio this week: the weekly goal from HHS and the American Heart Association. Certified Heart Healthy.",
  ]);
  locked[OCT(23)] = { gym: true, cardioMin: 160 };
  assert.deepEqual(step(), ["Five gym days this week. Certified Iron Addict.", "300 cardio minutes this week, the top of the guideline range. Certified Cardio Machine."]);
  // A new week starts fresh.
  assert.equal(weeklyBadges({ locked: { [OCT(26)]: { gym: true, strength: true } }, today: OCT(26), restDay: 0, awarded: [] }).badges.length, 0);
});

test("an unexpected rest day worked out anyway", () => {
  const locked = done(OCT(19), OCT(20));
  // Stretches finished: excused, not counted.
  locked[OCT(21)] = { unexpectedRest: true, complete: true, rest: true };
  assert.equal(streak(locked, OCT(21), 0), 2);
  // Worked out anyway, not finished: still excused.
  locked[OCT(21)] = { unexpectedRest: true, complete: false, rest: false };
  assert.equal(streak(locked, OCT(21), 0), 2);
  // Finished the workout: it counts.
  locked[OCT(21)] = { unexpectedRest: true, complete: true, rest: false };
  assert.equal(streak(locked, OCT(21), 0), 3);
  // Even after cutting the lock, finishing the workout keeps the streak.
  locked[OCT(21)].streakBreak = true;
  assert.equal(streak(locked, OCT(21), 0), 3);
});
