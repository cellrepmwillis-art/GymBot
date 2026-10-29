// The training week: six training days, then the rest day. The rest day can
// change in Settings, and each change applies from the day it was made, so
// days already done keep the plan they were done under and the rest of the
// week carries on from them.
//
// `schedule` is the rest weekday (Sunday is 0) or the history of it:
// [{ from: day key, day: weekday }], oldest first; the first entry also
// covers the days before it.
import { previousDay } from "./day.js";

const pad = (n) => String(n).padStart(2, "0");

// Weekday (Sunday is 0) of a day key like "2026-10-23".
export function weekdayOf(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12).getDay();
}

// The day key `n` days after `key`.
export function addDays(key, n) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d + n, 12);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const between = (from, to) => Math.round((new Date(`${to}T12:00`) - new Date(`${from}T12:00`)) / 86400000);

// The rest weekday in effect on `key`.
export function restDayOn(schedule, key) {
  if (!Array.isArray(schedule)) return Number(schedule) || 0;
  let day = schedule[0]?.day ?? 0;
  for (const entry of schedule) if (entry.from <= key) day = entry.day;
  return Number(day) || 0;
}

export const isRestDate = (schedule, key) => weekdayOf(key) === restDayOn(schedule, key);

// The first day of the week holding `key`: the day after the last rest day
// before it. The rest day always ends the week.
export function weekStart(key, schedule) {
  let last = previousDay(key);
  for (let i = 0; i < 13 && !isRestDate(schedule, last); i++) last = previousDay(last);
  return addDays(last, 1);
}

// Every day of the week holding `key`, its rest day last: seven days, or
// fewer or more the week the rest day moves.
export function weekDays(key, schedule) {
  const days = [];
  for (let day = weekStart(key, schedule); days.length < 14; day = addDays(day, 1)) {
    days.push(day);
    if (isRestDate(schedule, day)) break;
  }
  return days;
}

// The week's id (its first day) and its training days.
export function trainingWeek(key, schedule) {
  const days = weekDays(key, schedule);
  return { id: days[0], days: days.filter((day) => !isRestDate(schedule, day)) };
}

// Where `key` falls in its week: 1 to 6 for training days, 0 on the rest
// day. With an unchanged rest day it's the weekday's place after it. (The
// week the rest day moves, stretch.js plans the days instead.)
export function planPosition(key, schedule) {
  if (isRestDate(schedule, key)) return 0;
  return (between(weekStart(key, schedule), key) % 6) + 1;
}
