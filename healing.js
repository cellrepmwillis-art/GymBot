// Healing: a new tattoo or a minor injury on one part of the body, set in
// Settings. For 14 days the plan works around that part, and the tips say
// how to look after it. A fresh tattoo needs keeping clean and not rubbed
// or stretched; a minor injury needs a lighter load, with pain as the
// signal to stop.
//
// `healing` is { area, kind: "tattoo" | "injury", since: day key }.

export const HEALING_DAYS = 14;

export const HEALING_AREAS = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  legs: "Legs",
  stomach: "Stomach and sides",
};

export const HEALING_KINDS = { tattoo: "New tattoo", injury: "Minor injury" };

// The areas each day's split, or body part, works.
const PUSH = ["chest", "shoulders", "arms"];
const PULL = ["back", "arms"];
const WORKS = {
  pushA: PUSH, pushB: PUSH, pullA: PULL, pullB: PULL, legsA: ["legs"], legsB: ["legs"], runnerLegs: ["legs"],
  chest: PUSH, back: PULL, shoulders: ["shoulders", "arms"], biceps: ["arms"], triceps: ["arms"], legs: ["legs"], abs: ["stomach"],
};

// Full body's slots, in order: squat, press, row, hinge, shoulder press, core.
const FULL_BODY = [["legs"], PUSH, PULL, ["legs"], ["shoulders", "arms"], ["stomach"]];

export const works = (key, area) => (key === "fullBody" ? FULL_BODY.some((areas) => areas.includes(area)) : (WORKS[key] ?? []).includes(area));

// Full body's slot indexes that leave `area` alone.
export const fullBodySlotsAvoiding = (area) => FULL_BODY.map((areas, i) => (areas.includes(area) ? null : i)).filter((i) => i !== null);

// A day to lift instead when the planned one works the healing area: the
// first of these that doesn't.
const INSTEAD = ["legs", "back", "chest", "shoulders", "abs"];
export const insteadOf = (area) => INSTEAD.find((key) => !works(key, area));

// The healing set in Settings, while it lasts, with `daysLeft`; or null.
export function activeHealing(healing, today) {
  if (!healing?.area || !HEALING_AREAS[healing.area] || !healing.since) return null;
  const days = Math.round((new Date(`${today}T12:00`) - new Date(`${healing.since}T12:00`)) / 86400000);
  if (days < 0 || days >= HEALING_DAYS) return null;
  return { ...healing, daysLeft: HEALING_DAYS - days };
}

const lower = (area) => HEALING_AREAS[area].toLowerCase();

// Session tips, safety first. `change` says what the plan did about it:
// "swapped" (a different body part today), "trimmed" (full body without the
// moves that work it), "picked" (you chose to train it anyway) or null.
export function healingNotes(healing, { change, gym, lifting }) {
  const { area, kind, daysLeft } = healing;
  const what = kind === "tattoo" ? `New tattoo on your ${lower(area)}` : `Healing ${lower(area)}`;
  const left = `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`;
  const notes = [];
  if (change === "swapped") notes.push(`${what}: today trains something else so it can heal (${left}).`);
  else if (change === "trimmed") notes.push(`${what}: today skips the moves that work it (${left}).`);
  else if (change === "picked") notes.push(kind === "tattoo"
    ? `${what}, and you picked a day that works it: go light, skip anything that presses on it or stretches it hard, and stop if it stings.`
    : `${what}, and you picked a day that works it: go light, and stop if it hurts.`);
  if (kind === "tattoo") {
    if (area === "back" && lifting) notes.push("Lying on a bench or a back pad presses on a new back tattoo: pick standing or cable versions where you can, with a clean shirt between you and any pad.");
    notes.push(gym === "outdoor"
      ? "Keep it covered with loose, clean clothing and out of direct sun; fresh tattoos burn and fade easily."
      : "Wear loose, clean clothing over it and wipe down benches and pads before you use them; gym equipment carries bacteria.");
  } else {
    notes.push("Pain is the stop sign: mild discomfort that doesn't build is OK, sharp or growing pain means stop that exercise.");
    if (area === "legs") notes.push("If walking or running on it hurts, try the bike or the elliptical, or skip cardio today.");
  }
  return notes;
}

// Food & health notes.
export function healingHealth({ kind }) {
  return kind === "tattoo"
    ? ["New tattoo: wash it gently with unscented soap soon after your workout, since sweat sitting on it slows healing. No pools, hot tubs or saunas until it's healed (about 2 weeks)."]
    : ["Minor injury: if it isn't getting better in a week or two, or there's swelling, numbness or you can't put weight on it, see a doctor or physical therapist. Not medical advice."];
}

// For Ask the trainer.
export const healingContext = ({ area, kind, daysLeft }) =>
  `${kind === "tattoo" ? "I have a new tattoo" : "I have a minor injury"} on my ${lower(area)} (${HEALING_DAYS - daysLeft + 1} of ${HEALING_DAYS} days in).`;
