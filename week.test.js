import { test } from "node:test";
import assert from "node:assert/strict";
import { planPosition, weekDays, trainingWeek, isRestDate, addDays } from "./week.js";
import { suggest } from "./workouts.js";

// Oct 25, 2026 is a Sunday.
const keys = (from, n) => Array.from({ length: n }, (_, i) => addDays("2026-10-01", from - 1 + i));
const positions = (schedule, from, n) => keys(from, n).map((key) => planPosition(key, schedule));
const title = (key, schedule, trainer) => {
  const [y, m, d] = key.split("-").map(Number);
  const w = suggest({ date: new Date(y, m - 1, d, 17), trainer, position: planPosition(key, schedule) });
  return w.rest ? "Rest" : w.title;
};

test("an unchanged rest day gives the usual week", () => {
  assert.deepEqual(positions(0, 25, 8), [0, 1, 2, 3, 4, 5, 6, 0]);
  assert.deepEqual(positions([{ from: "", day: 0 }], 25, 8), [0, 1, 2, 3, 4, 5, 6, 0]);
  assert.deepEqual(weekDays("2026-10-28", 0), keys(26, 7));
  assert.deepEqual(trainingWeek("2026-11-01", 0).days, keys(26, 6));
});

test("moving the rest day midweek carries on from the days already done", () => {
  // Sunday off; Monday and Tuesday done; on Wednesday it moves to Thursday.
  const schedule = [{ from: "", day: 0 }, { from: "2026-10-28", day: 4 }];
  assert.deepEqual(positions(schedule, 26, 10), [1, 2, 3, 0, 1, 2, 3, 4, 5, 6]);
  assert.equal(planPosition("2026-11-05", schedule), 0);
  // Standard: full body Monday, cardio Tuesday, so full body Wednesday.
  assert.deepEqual(keys(26, 4).map((key) => title(key, schedule, "none")), ["Full body", "Cardio day", "Full body", "Rest"]);
  assert.deepEqual(keys(26, 3).map((key) => title(key, schedule, "ppl")), ["Push A", "Pull A", "Legs A"]);
  // This week is Monday through the new rest day; the next starts Friday.
  assert.deepEqual(weekDays("2026-10-28", schedule), keys(26, 4));
  assert.deepEqual(trainingWeek("2026-10-28", schedule).days, keys(26, 3));
  assert.deepEqual(weekDays("2026-10-30", schedule), [...keys(30, 2), "2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"]);
});

test("moving the rest day later makes one longer week", () => {
  // Sunday off, moved to Tuesday on Wednesday (after this week's Tuesday).
  const schedule = [{ from: "", day: 0 }, { from: "2026-10-28", day: 2 }];
  // Raw positions; the app plans that week's extra days with stretch.js.
  assert.deepEqual(positions(schedule, 26, 9), [1, 2, 3, 4, 5, 6, 1, 2, 0]);
  // One week, Monday through the new Tuesday rest day: the rest day ends it.
  assert.deepEqual(weekDays("2026-11-01", schedule), [...keys(26, 6), "2026-11-01", "2026-11-02", "2026-11-03"]);
  assert.deepEqual(weekDays("2026-10-28", schedule), weekDays("2026-11-01", schedule));
});

test("days before the change keep their rest day", () => {
  const schedule = [{ from: "", day: 0 }, { from: "2026-10-28", day: 1 }];
  // Monday moved to on Wednesday: this Monday was still a training day.
  assert.equal(isRestDate(schedule, "2026-10-26"), false);
  assert.equal(isRestDate(schedule, "2026-10-25"), true);
  assert.equal(isRestDate(schedule, "2026-11-02"), true);
  assert.equal(planPosition("2026-10-26", schedule), 1);
});
