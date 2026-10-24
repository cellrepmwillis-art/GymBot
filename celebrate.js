// Celebrations for finishing a day (every lock locked) and the milestones
// that come with it: full weeks, 5 of the past 7 days, streaks and totals.
// `locked` is the app's { "2026-10-23": { complete, ... } } map, where
// `complete` means every item that day was locked.
import { previousDay } from "./day.js";

// Weekday (Sunday is 0) of a day key like "2026-10-23".
export function weekdayOf(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12).getDay();
}

const isComplete = (locked, key) => Boolean(locked[key]?.complete);

// Training days finished in a row, counting back from today (or yesterday,
// while today isn't finished yet). Rest days are skipped, not counted, so
// they never break a streak.
export function streak(locked, today, restDay) {
  let count = 0;
  let key = isComplete(locked, today) ? today : previousDay(today);
  for (let i = 0; i < 1000; i++, key = previousDay(key)) {
    if (weekdayOf(key) === restDay) continue;
    if (!isComplete(locked, key)) break;
    count++;
  }
  return count;
}

// Finished workouts in the last seven days, today included. Rest-day
// stretching doesn't count; a workout on the rest day does.
export function pastSeven(locked, today, restDay) {
  let count = 0;
  for (let i = 0, key = today; i < 7; i++, key = previousDay(key)) {
    if (isComplete(locked, key) && !(weekdayOf(key) === restDay && locked[key].rest)) count++;
  }
  return count;
}

// The training week holding `today`: the day after the rest day through the
// rest day itself. Returns its first day's key (the week's id) and the six
// training days.
export function trainingWeek(today, restDay) {
  let start = today;
  while ((weekdayOf(start) - restDay + 7) % 7 !== 1) start = previousDay(start);
  const days = [];
  const [y, m, d] = start.split("-").map(Number);
  for (let i = 0; i < 6; i++) {
    const date = new Date(y, m - 1, d + i, 12);
    days.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`);
  }
  return { id: start, days };
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
export function celebrate({ locked, today, restDay, achievements, rest }) {
  const done = { completeDays: 0, fullWeeks: 0, weeks: [], ...achievements };
  const pick = (lines) => lines[weekdayOf(today) % lines.length];
  if (rest) return { celebration: { title: "Recovery locked in", line: pick(REST_LINES), badges: [] }, achievements: done };

  done.completeDays++;
  const badges = [];
  const week = trainingWeek(today, restDay);
  const weekDone = week.days.every((key) => isComplete(locked, key)) && !done.weeks.includes(week.id);
  if (weekDone) {
    done.weeks = [...done.weeks, week.id];
    done.fullWeeks++;
    const rank = level(done.fullWeeks);
    const times = done.fullWeeks > 1 ? ` That's ${done.fullWeeks} full weeks.` : "";
    badges.push({ icon: "🏆", text: `You locked in this week: all six days' goals met. ${rank} level achieved.${times}` });
  }
  const seven = pastSeven(locked, today, restDay);
  if (seven >= 5 && !weekDone) badges.push({ icon: "💪", text: `You locked in ${seven} of the past 7 days. Arnold would be proud.` });
  const run = streak(locked, today, restDay);
  if (STREAK_MARKS.includes(run)) badges.push({ icon: "🔥", text: `${run}-day streak. Rest days don't break it.` });
  if (done.completeDays === 1) badges.push({ icon: "🔑", text: "Your first full lock-in. The first of many." });
  if (TOTAL_MARKS.includes(done.completeDays)) badges.push({ icon: "⭐", text: `${done.completeDays} workouts fully locked in.` });

  return { celebration: { title: "Locked in!", line: pick(DAY_LINES), badges }, achievements: done };
}
