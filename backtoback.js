// Back-to-back days on the same body part (a healing swap can put two leg
// days together, say) make one of them an unexpected rest day. The one
// picked is the one farther from the week's other rest days, so the rest is
// spread out; ties go to the later day. Days already done, and days someone
// set by hand (a body part picked, an override, a workout locked in), stay
// as they are.

// What a day's lifting mostly trains: push A and B and chest day all count
// as push, and so on.
const PARTS = {
  pushA: "push", pushB: "push", chest: "push",
  pullA: "pull", pullB: "pull", back: "pull",
  legsA: "legs", legsB: "legs", legs: "legs", runnerLegs: "legs",
};
export const bodyPart = (split) => (split ? PARTS[split] ?? split : null);

const NAMES = { push: "push", pull: "pull", legs: "leg", fullBody: "full-body", abs: "ab" };
export const partName = (part) => NAMES[part] ?? part;

// `days` is the training week in order, rest day included:
// [{ key, part, rest, fixed }], where `part` is from bodyPart (null for no
// lifting), `rest` marks a rest day and `fixed` a day that can't change.
// Returns the days to rest, [{ key, part }].
export function backToBackRests(days, today) {
  const week = days.map((day) => ({ ...day }));
  const rested = [];
  // The day before the week is a rest day.
  const distance = (i) => Math.min(i + 1, ...week.map((day, j) => (day.rest && j !== i ? Math.abs(i - j) : Infinity)));
  for (let i = 0; i + 1 < week.length; i++) {
    const [a, b] = [week[i], week[i + 1]];
    if (a.rest || b.rest || !a.part || a.part !== b.part) continue;
    const open = [i, i + 1].filter((j) => week[j].key >= today && !week[j].fixed);
    if (!open.length) continue;
    const pick = open.reduce((best, j) => (distance(j) >= distance(best) ? j : best));
    week[pick].rest = true;
    rested.push({ key: week[pick].key, part: week[pick].part });
  }
  return rested;
}

// Days that put a body part in a 7-day stretch more often than a normal
// week of the plan does (moving the rest day earlier, say, starts the next
// week sooner). `keys` are consecutive days and `parts` what each trains
// (null for nothing); `normal` is { part: times in a normal week }. Only
// days from `today` on are returned, as a Map of day to part.
export function extraDays(keys, parts, normal, today) {
  const extra = new Map();
  for (let start = 0; start + 7 <= keys.length; start++) {
    const seen = {};
    for (let i = start; i < start + 7; i++) {
      const part = parts[i];
      if (!part) continue;
      seen[part] = (seen[part] ?? 0) + 1;
      if (seen[part] > (normal[part] ?? 0) && keys[i] >= today) extra.set(keys[i], part);
    }
  }
  return extra;
}
