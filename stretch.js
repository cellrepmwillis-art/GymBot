// The days between two rest days when the rest day moves. A normal week
// runs the plan's six days in order. When the rest day moves, the days
// between the last rest day and the new one aren't six, so from the day the
// change applies, each day takes the plan's next day whose body part is
// still to do since the last rest day: what's already been done counts, a
// skipped day's body part stays available, and the same body part isn't
// planned two days running. Fewer days than are left: the rest wait for
// next week. More days: once everything's done, the extra days are cardio
// days (position 0), so nothing is done twice.
//
// `days`: the training days between the two rest days, in order.
// `from`: the day the change applies; earlier days ran the plan in order.
// `today`: days before it count what was actually done.
// `partAt(position)`: what the plan's day at a position (1 to 6) trains,
// "cardio" for no lifting.
// `donePart(day, position)`: what was actually done on an earlier day, or
// null if nothing was.
// Returns a Map of day to position, 0 for a cardio day.
export function stretchPositions({ days, from, today, partAt, donePart }) {
  let left = [1, 2, 3, 4, 5, 6].map((position) => ({ position, part: partAt(position) }));
  const positions = new Map();
  let previous = null;
  days.forEach((day, i) => {
    let position;
    if (day < from) position = i < 6 ? i + 1 : 0;
    else position = (left.find((slot) => slot.part !== previous) ?? left[0])?.position ?? 0;
    positions.set(day, position);
    const part = day < today ? donePart(day, position) : position ? partAt(position) : "cardio";
    if (part) {
      let index = left.findIndex((slot) => slot.position === position && slot.part === part);
      if (index < 0) index = left.findIndex((slot) => slot.part === part);
      if (index >= 0) left = left.filter((_, j) => j !== index);
    }
    previous = part;
  });
  return positions;
}
