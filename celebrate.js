// Celebrations for finishing a day (every lock locked) and the milestones
// that come with it: full weeks, 5 of the past 7 days, streaks and totals.
// `locked` is the app's { "2026-10-23": { complete, ... } } map, where
// `complete` means every item that day was locked, `unexpectedRest` that
// the day was taken off with the "Unexpected rest day" override and
// `streakBreak` that taking it cost the streak.
import { previousDay } from "./day.js";
import { weekdayOf, isRestDate, trainingWeek, weekDays } from "./week.js";

export { weekdayOf, trainingWeek, weekDays };

// `restDay` below is the rest weekday or its history (see week.js).

const isComplete = (locked, key) => Boolean(locked[key]?.complete);

// A finished workout, not rest-day stretching.
const isWorkout = (locked, key) => isComplete(locked, key) && !locked[key].rest;

// Training days finished in a row, counting back from today (or yesterday,
// while today isn't finished yet). Rest days, and unexpected rest days that
// didn't cut the lock, are skipped, not counted, so they don't break it. An
// unexpected rest day worked out anyway counts once the workout is finished.
// `autoRests` maps days made rest days for back-to-back body parts (see
// backtoback.js); like rest days, they're skipped unless worked out anyway.
export function streak(locked, today, restDay, autoRests = {}) {
  let count = 0;
  let key = isComplete(locked, today) || locked[today]?.unexpectedRest ? today : previousDay(today);
  for (let i = 0; i < 1000; i++, key = previousDay(key)) {
    if (isRestDate(restDay, key)) continue;
    if (isWorkout(locked, key)) {
      count++;
      continue;
    }
    if (autoRests[key]) continue;
    if (locked[key]?.unexpectedRest) {
      if (locked[key].streakBreak) break;
      continue;
    }
    break;
  }
  return count;
}

// Unexpected rest days already taken this training week, today left out;
// the automatic ones for back-to-back body parts don't count.
export function unexpectedRests(locked, today, restDay) {
  return trainingWeek(today, restDay).days.filter((key) => key !== today && locked[key]?.unexpectedRest && !locked[key].autoRest).length;
}

// What to say before an unexpected rest day. `taken` is how many were
// already taken this week; the scheduled rest day makes this rest day number
// taken + 2. The first two keep the streak; after that it costs the streak.
export function unexpectedRestPrompt(taken) {
  const nth = taken + 2;
  const ordinal = ["", "1st", "2nd", "3rd"][nth] ?? `${nth}th`;
  if (taken === 0) return { breaksStreak: false, title: "Taking an extra rest day?", text: "No problem taking an extra day, you deserve it, boss. Your streak is safe.", yes: "Rest today", no: "Never mind" };
  if (taken === 1) return { breaksStreak: false, title: `That's your ${ordinal} rest day this week`, text: "Got it, hope you feel better. Back to locking in tomorrow, champ. Your streak is still safe.", yes: "Rest today", no: "Never mind" };
  return { breaksStreak: true, title: `That's your ${ordinal} rest day this week`, text: "Your streak will be lost. Proceed to cut the lock?", yes: "Cut the lock", no: "Keep my streak" };
}

// Finished workouts in the last seven days, today included. Rest-day
// stretching doesn't count, scheduled or unexpected; a workout on the rest
// day does.
export function pastSeven(locked, today) {
  let count = 0;
  for (let i = 0, key = today; i < 7; i++, key = previousDay(key)) if (isWorkout(locked, key)) count++;
  return count;
}

// Locksmith levels by full weeks.
export function level(fullWeeks) {
  if (fullWeeks >= 12) return "Vault Keeper";
  if (fullWeeks >= 4) return "Master Locksmith";
  if (fullWeeks >= 1) return "Official Locksmith";
  return null;
}

const STREAK_MARKS = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];
const TOTAL_MARKS = [10, 25, 50, 100, 150, 200, 300, 500];

const DAY_LINES = [
  "Every lock, locked. That's a full day in the books.",
  "Workout locked in. Nothing left on the table.",
  "That's a wrap. Future you says thanks.",
  "All locked up. Go refuel and recover.",
  "Done and locked. Consistency beats intensity, and you've got both today.",
];

const REST_LINES = [
  "Recovery locked in. Muscles grow on days like this.",
  "Stretched, rested and locked. See you tomorrow.",
];

// What to celebrate when today is finished. `achievements` is
// { completeDays, fullWeeks, weeks: [week ids] }; returns the celebration
// ({ title, line, badges }) and the updated achievements. Call it once per
// day, after marking today complete in `locked`.
export function celebrate({ locked, today, restDay, achievements, rest, autoRests = {} }) {
  const done = { completeDays: 0, fullWeeks: 0, weeks: [], ...achievements };
  const pick = (lines) => lines[weekdayOf(today) % lines.length];
  if (rest) return { celebration: { title: "Recovery locked in", line: pick(REST_LINES), badges: [] }, achievements: done };

  done.completeDays++;
  const badges = [];
  const week = trainingWeek(today, restDay);
  const training = week.days.filter((key) => !autoRests[key] || isComplete(locked, key));
  const weekDone = training.every((key) => isComplete(locked, key)) && !done.weeks.includes(week.id);
  if (weekDone) {
    done.weeks = [...done.weeks, week.id];
    done.fullWeeks++;
    const rank = level(done.fullWeeks);
    const times = done.fullWeeks > 1 ? ` That's ${done.fullWeeks} full weeks.` : "";
    const all = training.length === 6 ? "all six days'" : `all ${training.length} days'`;
    badges.push({ icon: "🏆", text: `You locked in this week: ${all} goals met. ${rank} level achieved.${times}` });
  }
  const seven = pastSeven(locked, today);
  if (seven >= 5 && !weekDone) badges.push({ icon: "💪", text: `You locked in ${seven} of the past 7 days. Arnold would be proud.` });
  const run = streak(locked, today, restDay, autoRests);
  if (STREAK_MARKS.includes(run)) badges.push({ icon: "🔥", text: `${run}-day streak. Rest days don't break it.` });
  if (done.completeDays === 1) badges.push({ icon: "🔑", text: "Your first full lock-in. The first of many." });
  if (TOTAL_MARKS.includes(done.completeDays)) badges.push({ icon: "⭐", text: `${done.completeDays} workouts fully locked in.` });

  return { celebration: { title: "Locked in!", line: pick(DAY_LINES), badges }, achievements: done };
}

// ---- Weekly goals ----

// The US physical activity guidelines (HHS, backed by the American Heart
// Association): at least 150 minutes of moderate cardio a week, or 75 of
// vigorous (so vigorous minutes count double), up to 300 for more benefit;
// and muscle-strengthening on 2 or more days. Days carry what was locked:
// `gym` (anything past the warm-up), `strength` (a lift) and `cardioMin`
// (moderate-equivalent cardio minutes).
export const CARDIO_GOAL = 150;
export const CARDIO_HIGH = 300;
export const STRENGTH_DAYS = 2;

export function weekStats(locked, today, restDay) {
  const stats = { gymDays: 0, strengthDays: 0, cardioMinutes: 0 };
  for (const key of weekDays(today, restDay)) {
    // A day with extra sessions keeps their sum in `total`.
    const day = locked[key]?.total ?? locked[key];
    if (!day) continue;
    if (day.gym) stats.gymDays++;
    if (day.strength) stats.strengthDays++;
    stats.cardioMinutes += day.cardioMin ?? 0;
  }
  return stats;
}

// [days, id, icon, message at a gym, message outdoors & at home]
const GYM_TIERS = [
  [5, "gym5", "🦾", "Five gym days this week. Certified Iron Addict.", "Five workout days this week. Certified Iron Addict."],
  [4, "gym4", "🐀", "You hit the gym four days this week. Certified Gym Rat.", "You worked out four days this week. Certified Park Rat."],
  [3, "gym3", "🏅", "Three gym days this week. Certified Regular.", "Three workout days this week. Certified Regular."],
  [2, "gym2", "🏅", "Looks like you managed to hit the gym twice this week. Certified Maintainer.", "Looks like you managed to work out twice this week. Certified Maintainer."],
];

// Weekly goals reached and not yet celebrated this week. `awarded` lists the
// ones already celebrated; returns the new badges and the updated list.
export function weeklyBadges({ locked, today, restDay, awarded = [], outdoor = false }) {
  const stats = weekStats(locked, today, restDay);
  const badges = [];
  const got = new Set(awarded);
  const award = (id, icon, text) => {
    if (got.has(id)) return;
    got.add(id);
    badges.push({ icon, text });
  };
  // Only the highest new gym tier; the lower ones count as reached.
  const tier = GYM_TIERS.find(([days]) => stats.gymDays >= days);
  if (tier && !got.has(tier[1])) {
    award(tier[1], tier[2], outdoor ? tier[4] : tier[3]);
    for (const [days, id] of GYM_TIERS) if (days < tier[0]) got.add(id);
  }
  if (stats.strengthDays >= STRENGTH_DAYS) {
    award("strength2", "🏋️", "Strength training on 2 days this week, the HHS minimum for muscle-strengthening. Certified Strong.");
  }
  if (stats.cardioMinutes >= CARDIO_HIGH) {
    got.add("cardio150");
    award("cardio300", "🫀", "300 cardio minutes this week, the top of the guideline range. Certified Cardio Machine.");
  } else if (stats.cardioMinutes >= CARDIO_GOAL) {
    award("cardio150", "❤️", "150 minutes of cardio this week: the weekly goal from HHS and the American Heart Association. Certified Heart Healthy.");
  }
  return { badges, awarded: [...got], stats };
}

