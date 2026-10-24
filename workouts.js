// Picks a workout from the day of the week, the time of day and the aim in
// Settings. The week is a push / pull / legs split run twice, Monday to
// Saturday, with Sunday off. Everything uses equipment a typical American gym
// has: dumbbells, cables, selectorized machines, Smith machines and cardio.
// Barbells and squat racks are only used for Anytime Fitness style gyms,
// since most Planet Fitness clubs don't have them.
import { RESET_HOUR } from "./day.js";
import { TRAINERS, RUNNER_LEGS } from "./trainers.js";
import { MET } from "./met.js";

export { TRAINERS };
export { MET, caloriesBurned } from "./met.js";

// Aims match CookBot's Settings: "gain", "maintain" or "cut".
export const AIMS = {
  gain: {
    label: "Gain",
    blurb: "Heavier main lift, more sets, little cardio.",
    main: { sets: 4, reps: "6–8", rest: "2–3 min" },
    accessory: { sets: 3, reps: "8–12", rest: "90 sec" },
    tip: "Beat last week: one more rep or a little more weight on each lift.",
  },
  maintain: {
    label: "Maintain",
    blurb: "Moderate volume plus some cardio.",
    main: { sets: 3, reps: "8–10", rest: "2 min" },
    accessory: { sets: 3, reps: "10–12", rest: "75 sec" },
    tip: "Keep the weights about the same and focus on clean reps.",
  },
  cut: {
    label: "Cut",
    blurb: "Keep the main lift heavy to hold muscle, shorter rests, more cardio.",
    main: { sets: 3, reps: "6–8", rest: "2 min" },
    accessory: { sets: 3, reps: "12–15", rest: "45–60 sec" },
    tip: "Try to keep the weight on your main lift. Losing a rep or two on a cut is normal.",
  },
};

export const GYMS = {
  pf: { label: "Planet Fitness style (Smith machines, dumbbells, machines)" },
  af: { label: "Anytime Fitness style (also barbells and squat racks)" },
};

// Each slot lists choices in order of preference. "barbell" choices are only
// used at Anytime Fitness style gyms. The next choice is shown as the swap
// when the first is taken. `reps` replaces the aim's reps for holds and
// bodyweight sets.
const B = (name) => ({ name, barbell: true });
const E = (name, reps) => (reps ? { name, reps } : { name });

const SPLITS = {
  pushA: {
    title: "Push A",
    focus: "Chest, shoulders and triceps (chest first)",
    slots: [
      [B("Barbell bench press"), E("Smith machine bench press"), E("Dumbbell bench press"), E("Chest press machine")],
      [E("Incline dumbbell press"), E("Smith machine incline press"), E("Incline chest press machine")],
      [E("Seated dumbbell shoulder press"), E("Shoulder press machine"), E("Smith machine shoulder press")],
      [E("Cable fly"), E("Pec deck"), E("Dumbbell fly")],
      [E("Dumbbell lateral raise"), E("Cable lateral raise"), E("Lateral raise machine")],
      [E("Cable rope pushdown"), E("Overhead dumbbell triceps extension"), E("Assisted dip machine")],
    ],
  },
  pullA: {
    title: "Pull A",
    focus: "Back and biceps (back width first)",
    slots: [
      [E("Lat pulldown"), E("Assisted pull-up machine"), E("Single-arm cable lat pulldown")],
      [E("Seated cable row"), E("Seated row machine"), E("Smith machine bent-over row")],
      [E("Chest-supported dumbbell row"), E("Single-arm dumbbell row"), E("Plate-loaded row machine")],
      [E("Cable face pull"), E("Rear delt fly machine"), E("Bent-over dumbbell reverse fly")],
      [E("Dumbbell curl"), E("Cable curl"), E("Biceps curl machine")],
      [E("Hammer curl"), E("Cable rope hammer curl"), E("Biceps curl machine (neutral grip)")],
    ],
  },
  legsA: {
    title: "Legs A",
    focus: "Quads, hamstrings, calves and abs (squat first)",
    slots: [
      [B("Barbell back squat"), E("Smith machine squat"), E("Leg press"), E("Hack squat machine")],
      [E("Leg press"), E("Hack squat machine"), E("Goblet squat")],
      [E("Leg extension"), E("Dumbbell walking lunge"), E("Dumbbell step-up onto a bench")],
      [E("Lying leg curl"), E("Seated leg curl"), E("Cable hamstring curl (ankle strap)")],
      [E("Standing calf raise (Smith machine)"), E("Calf press on the leg press"), E("Seated calf raise")],
      [E("Cable crunch"), E("Hanging knee raise"), E("Ab crunch machine")],
    ],
  },
  pushB: {
    title: "Push B",
    focus: "Shoulders, chest and triceps (shoulders first)",
    slots: [
      [B("Standing barbell overhead press"), E("Smith machine shoulder press"), E("Seated dumbbell shoulder press"), E("Standing dumbbell shoulder press")],
      [E("Chest press machine"), E("Dumbbell bench press"), E("Smith machine bench press")],
      [E("Incline dumbbell press"), E("Incline chest press machine"), E("Smith machine incline press")],
      [E("Cable lateral raise"), E("Dumbbell lateral raise"), E("Lateral raise machine")],
      [E("Pec deck"), E("Cable fly"), E("Dumbbell fly")],
      [E("Overhead cable triceps extension"), E("Dumbbell skull crusher"), E("Triceps extension machine")],
    ],
  },
  pullB: {
    title: "Pull B",
    focus: "Back, rear delts and biceps (back thickness first)",
    slots: [
      [B("Barbell bent-over row"), E("Single-arm dumbbell row"), E("Plate-loaded row machine"), E("Chest-supported row machine")],
      [E("Assisted pull-up machine"), E("Lat pulldown (close grip)"), E("Single-arm cable lat pulldown")],
      [E("Straight-arm cable pulldown"), E("Dumbbell pullover"), E("Cable rope pullover")],
      [E("Rear delt fly machine"), E("Bent-over dumbbell reverse fly"), E("Chest-supported dumbbell reverse fly")],
      [E("Preacher curl machine"), E("Incline dumbbell curl"), E("Cable curl")],
      [E("Back extension"), E("Cable pull-through"), E("Lower back extension machine")],
    ],
  },
  legsB: {
    title: "Legs B",
    focus: "Hamstrings, glutes, quads and calves (hinge first)",
    slots: [
      [B("Barbell Romanian deadlift"), E("Smith machine Romanian deadlift"), E("Dumbbell Romanian deadlift"), E("Cable pull-through")],
      [E("Leg press (feet high)"), E("Hack squat machine"), E("Smith machine squat")],
      [E("Dumbbell Bulgarian split squat"), E("Dumbbell reverse lunge"), E("Smith machine split squat")],
      [E("Seated leg curl"), E("Lying leg curl"), E("Cable hamstring curl (ankle strap)")],
      [E("Hip thrust (Smith machine)"), E("Glute kickback machine"), E("Hip abduction machine")],
      [E("Seated calf raise"), E("Calf press on the leg press"), E("Standing calf raise (Smith machine)")],
    ],
  },
};

// One body part instead of today's split, picked on the main screen. "small"
// muscles use the lighter rep range for every exercise, the first included;
// abs also use their own reps and rest.
export const TARGETS = {
  chest: {
    title: "Chest day",
    focus: "Flat, incline and fly work",
    slots: [
      [B("Barbell bench press"), E("Smith machine bench press"), E("Dumbbell bench press"), E("Chest press machine")],
      [E("Incline dumbbell press"), E("Smith machine incline press"), E("Incline chest press machine")],
      [E("Chest press machine"), E("Dumbbell bench press"), E("Cable chest press")],
      [E("Pec deck"), E("Cable fly"), E("Dumbbell fly")],
      [E("Low-to-high cable fly"), E("Incline dumbbell fly"), E("Single-arm cable fly")],
      [E("Push-up", "as many as you can"), E("Assisted dip machine"), E("Dumbbell squeeze press")],
    ],
  },
  back: {
    title: "Back day",
    focus: "Width, thickness and lower back",
    slots: [
      [E("Lat pulldown"), E("Assisted pull-up machine"), E("Single-arm cable lat pulldown")],
      [B("Barbell bent-over row"), E("Single-arm dumbbell row"), E("Plate-loaded row machine"), E("Chest-supported row machine")],
      [E("Seated cable row"), E("Seated row machine"), E("Smith machine bent-over row")],
      [E("Chest-supported dumbbell row"), E("Lat pulldown (close grip)"), E("Seated row machine (wide grip)")],
      [E("Straight-arm cable pulldown"), E("Dumbbell pullover"), E("Cable rope pullover")],
      [E("Back extension"), E("Cable pull-through"), E("Lower back extension machine")],
    ],
  },
  shoulders: {
    title: "Shoulder day",
    focus: "Front, side and rear delts, plus traps",
    slots: [
      [B("Standing barbell overhead press"), E("Smith machine shoulder press"), E("Seated dumbbell shoulder press"), E("Standing dumbbell shoulder press")],
      [E("Shoulder press machine"), E("Dumbbell Arnold press"), E("Cable shoulder press")],
      [E("Dumbbell lateral raise"), E("Cable lateral raise"), E("Lateral raise machine")],
      [E("Rear delt fly machine"), E("Bent-over dumbbell reverse fly"), E("Chest-supported dumbbell reverse fly")],
      [E("Cable face pull"), E("Cable rear delt fly"), E("Dumbbell rear delt row")],
      [E("Dumbbell shrug"), E("Smith machine shrug"), E("Cable shrug")],
    ],
  },
  biceps: {
    title: "Biceps day",
    focus: "Curls from every angle, plus forearms",
    small: true,
    slots: [
      [B("Barbell curl"), E("Dumbbell curl"), E("Cable curl"), E("Fixed-weight EZ-bar curl")],
      [E("Preacher curl machine"), E("Dumbbell preacher curl"), E("Cable preacher curl")],
      [E("Incline dumbbell curl"), E("Cable curl (behind the body)"), E("Dumbbell spider curl")],
      [E("Hammer curl"), E("Cable rope hammer curl"), E("Biceps curl machine (neutral grip)")],
      [E("Biceps curl machine"), E("Concentration curl"), E("Single-arm cable curl")],
      [E("Dumbbell wrist curl"), E("Farmer's carry", "40–60 sec"), E("Cable wrist curl")],
    ],
  },
  triceps: {
    title: "Triceps day",
    focus: "Pressing, pushdowns and overhead work",
    small: true,
    slots: [
      [B("Close-grip barbell bench press"), E("Close-grip Smith machine bench press"), E("Close-grip dumbbell press"), E("Diamond push-up", "as many as you can")],
      [E("Assisted dip machine"), E("Triceps dip machine"), E("Bench dip", "as many as you can")],
      [E("Cable rope pushdown"), E("Straight-bar cable pushdown"), E("Reverse-grip cable pushdown")],
      [E("Overhead cable triceps extension"), E("Overhead dumbbell triceps extension"), E("Single-arm overhead dumbbell extension")],
      [E("Dumbbell skull crusher"), E("Triceps extension machine"), E("Cable skull crusher")],
      [E("Single-arm cable kickback"), E("Dumbbell kickback"), E("Triceps press machine")],
    ],
  },
  legs: {
    title: "Leg day",
    focus: "Quads, hamstrings, glutes and calves",
    slots: [
      [B("Barbell back squat"), E("Smith machine squat"), E("Leg press"), E("Hack squat machine")],
      [B("Barbell Romanian deadlift"), E("Smith machine Romanian deadlift"), E("Dumbbell Romanian deadlift"), E("Cable pull-through")],
      [E("Leg press"), E("Hack squat machine"), E("Dumbbell Bulgarian split squat")],
      [E("Lying leg curl"), E("Seated leg curl"), E("Cable hamstring curl (ankle strap)")],
      [E("Leg extension"), E("Dumbbell walking lunge"), E("Dumbbell step-up onto a bench")],
      [E("Standing calf raise (Smith machine)"), E("Seated calf raise"), E("Calf press on the leg press")],
    ],
  },
  abs: {
    title: "Ab day",
    focus: "Upper and lower abs, obliques and core",
    small: true,
    reps: "12–20",
    rest: "45 sec",
    slots: [
      [E("Cable crunch"), E("Ab crunch machine"), E("Weighted crunch (dumbbell on the chest)")],
      [E("Hanging knee raise"), E("Captain's chair knee raise"), E("Lying leg raise")],
      [E("Plank", "30–60 sec"), E("Dead bug"), E("Bird dog")],
      [E("Cable woodchop"), E("Dumbbell Russian twist"), E("Cable Pallof press")],
      [E("Reverse crunch"), E("Decline bench sit-up"), E("Bicycle crunch")],
      [E("Side plank", "30 sec each side"), E("Dumbbell side bend"), E("Cable side bend")],
    ],
  },
};

export const TARGET_LABELS = { chest: "Chest", back: "Back", shoulders: "Shoulders", biceps: "Biceps", triceps: "Triceps", legs: "Legs", abs: "Abs" };

// The training week by position: 0 is the rest day (Sunday by default), and
// the six days after it run the split twice, so with Sunday off, Monday is
// Push A and Saturday Legs B.
const WEEK = [null, "pushA", "pullA", "legsA", "pushB", "pullB", "legsB"];

// Position in the training week of weekday `day` (Sunday is 0 in JavaScript).
export const weekPosition = (day, restDay = 0) => (day - restDay + 7) % 7;

// Times of day, by the hour they start. "budget" is how many exercises fit,
// "crowd" how busy a typical gym is then.
export const WINDOWS = [
  { from: 3, key: "early", label: "Early morning", crowd: "quiet", budget: 6,
    note: "The gym is quiet. Take a few extra minutes to warm up; joints are stiff this early." },
  { from: 6, key: "beforeWork", label: "Before work", crowd: "busy", budget: 5,
    note: "Before-work crowd and a clock to beat, so this is a trimmed session." },
  { from: 9, key: "morning", label: "Late morning", crowd: "quiet", budget: 6,
    note: "One of the quietest times. Every station should be open." },
  { from: 11, key: "lunch", label: "Lunch break", crowd: "busy", budget: 4,
    note: "Lunch-hour express: four exercises, with supersets to save time." },
  { from: 14, key: "afternoon", label: "Afternoon", crowd: "quiet", budget: 6,
    note: "Quiet stretch before the after-work rush." },
  { from: 16, key: "peak", label: "After work", crowd: "packed", budget: 6,
    note: "Peak hours. Benches and Smith machines go first, so use the swap listed under any exercise that's taken." },
  { from: 20, key: "evening", label: "Evening", crowd: "moderate", budget: 6,
    note: "The rush is thinning out." },
  { from: 23, key: "late", label: "Late night", crowd: "empty", budget: 5,
    note: "Nearly empty. Keep cardio easy so you can still sleep." },
];

export function timeWindow(date = new Date()) {
  const hour = date.getHours();
  // Midnight to 2:59am is still late night: the window that starts at 11pm.
  if (hour < WINDOWS[0].from) return WINDOWS[WINDOWS.length - 1];
  return [...WINDOWS].reverse().find((w) => hour >= w.from);
}

// The gym day, which rolls over at midnight (RESET_HOUR).
export function gymDay(date = new Date()) {
  const shifted = new Date(date.getTime());
  shifted.setHours(shifted.getHours() - RESET_HOUR);
  return shifted.getDay();
}

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function splitFor(day, restDay = 0) {
  const key = WEEK[weekPosition(day, restDay)];
  return key ? { key, ...SPLITS[key] } : null;
}

// Cardio after lifting, by aim, as [minutes, what to do, MET]. Leg days get less
// so the legs can recover; late at night it stays easy.
function cardio(aim, split, window) {
  const legs = split.key.startsWith("legs");
  const easy = window.key === "late" || window.key === "evening";
  const short = window.budget < 6;
  if (aim === "gain") return [5, "Optional: 5–10 min easy bike or elliptical to cool down.", MET.easyMachine];
  if (aim === "maintain") {
    const minutes = short || legs ? 10 : 20;
    return [minutes, `${minutes} min at a steady pace on the elliptical, bike or rower.`, MET.moderateMachine];
  }
  // Cut
  if (short) return [15, "15 min incline treadmill walk (10–12% incline, about 3 mph).", MET.inclineWalk];
  if (legs) return [20, "15–20 min incline treadmill walk (10–12% incline, about 3 mph).", MET.inclineWalk];
  if (easy) return [30, "30 min incline treadmill walk (10–12% incline, about 3 mph).", MET.inclineWalk];
  return [30, "25–30 min incline treadmill walk or 15 min on the StairMaster.", MET.inclineWalk];
}

// Warm-up: 5 minutes of easy cardio, longer in the early morning, then light
// sets of the first exercise.
function warmup(window, first) {
  const minutes = window.key === "early" ? 8 : 5;
  const name = first.startsWith("Smith") ? first : first[0].toLowerCase() + first.slice(1);
  return `${minutes} min easy on the bike or treadmill, then 2 light sets of ${name}.`;
}

// The "Cardio only" override: a warm-up and one longer cardio session in
// place of the lifting. On a run day it's the run by itself.
function cardioOnly({ base, coachKey, plan, window, gym, shotSoon, runDay, ctx, split, target }) {
  const long = window.budget >= 6 ? 45 : 30;
  let session;
  if (runDay) session = runDay.run(ctx);
  else if (coachKey === "marathon") session = [long, `Easy run, ${long} min, at a pace you could talk at.`, MET.easyRun];
  else if (coachKey === "glp1") session = shotSoon
    ? [20, "Easy 20 min walk. Skip it if you feel sick.", MET.easyWalk]
    : [long, `${long} min brisk walk or bike at a pace you can still talk at.`, MET.briskWalk];
  else if (plan === "cut" || coachKey === "weightLoss") session = [long, `${long} min incline treadmill walk (10–12% incline, about 3 mph). Split it with the StairMaster or bike if you like.`, MET.inclineWalk];
  else session = [long, `${long} min of steady cardio: mix the bike, elliptical and rower at a pace that's hard but lets you talk.`, MET.moderateMachine];
  const [minutes, text, met] = session;
  const warmupText = runDay ? "5 min brisk walk, then leg swings and a few 20-second strides." : "5 min easy on the bike or treadmill, building up to your cardio pace.";
  const items = [
    { id: "warmup", kind: "warmup", name: "Warm-up", text: warmupText, minutes: 5, met: MET.warmup },
    { id: runDay ? "run" : "cardio", kind: runDay ? "run" : "cardio", name: runDay ? runDay.title.split(" + ")[0] : "Cardio", text, minutes, met },
  ];
  const notes = ["Cardio only today, by your choice. Tomorrow is back to the full plan."];
  if (window.key === "late" && gym === "pf") notes.push("Many Planet Fitness clubs aren't open 24 hours anymore, so check your club's hours.");
  return {
    ...base,
    rest: false,
    mode: "cardio",
    split: split?.key ?? null,
    target: TARGETS[target] ? target : null,
    title: "Cardio only",
    focus: "Cardio only",
    minutes: Math.round((5 + minutes) / 5) * 5,
    run: runDay ? text : null,
    warmup: warmupText,
    items,
    exercises: [],
    superset: false,
    cardio: runDay ? null : text,
    notes,
  };
}

const pick = (options, i) => options[((i % options.length) + options.length) % options.length];

// Sets, reps and rest from the aim, with the trainer's changes on top.
function schemeFor(coach, plan) {
  const base = AIMS[plan];
  const changes = coach.scheme?.(plan) ?? {};
  return { main: { ...base.main, ...changes.main }, accessory: { ...base.accessory, ...changes.accessory }, tip: base.tip };
}

// The rest day's gentle stretching routine: [name, how, minutes].
const REST_STRETCHES = [
  ["Cat-cow", "Slow, on hands and knees, 10 breaths", 1],
  ["Kneeling hip flexor stretch", "1 min each side, squeeze the glute of the back leg", 2],
  ["Seated hamstring stretch", "1 min each side, back long, reach for the foot", 2],
  ["Figure-4 glute stretch", "On your back, 1 min each side", 2],
  ["Calf stretch against a wall", "1 min each side, back heel down", 2],
  ["Doorway chest stretch", "Forearms on the frame, lean through gently, 1 min", 1],
  ["Child's pose with a side reach", "Reach the hands to each side to stretch the lats, 1 min", 1],
];

// Splits the trainers can ask for by name, besides the week's own.
const splitByKey = (key) => (key === "runnerLegs" ? RUNNER_LEGS : SPLITS[key] ?? TARGETS[key]);

// The kind of equipment an exercise uses, for trainers' preferences.
export function equipmentKind(name) {
  if (/smith/i.test(name)) return "smith";
  if (/barbell/i.test(name)) return "barbell";
  if (/cable|pushdown|face pull/i.test(name)) return "cable";
  if (/machine|leg press|pec deck|pulldown|hack squat|leg curl|leg extension|calf press|seated calf raise/i.test(name)) return "machine";
  if (/dumbbell|goblet|farmer|hammer curl|concentration curl/i.test(name)) return "dumbbell";
  return "other";
}

// Without a trainer, swaps go machines (Smith machines included) first, then
// dumbbells and barbells, then the rest (cables, bodyweight, benches).
export function equipmentRank(name) {
  return { machine: 0, smith: 0, dumbbell: 1, barbell: 1 }[equipmentKind(name)] ?? 2;
}

// The most choices an exercise cycles through when swapped. Every exercise
// has at least this many at either kind of gym.
const MAX_CHOICES = 3;

// The workout for `date`. `shuffle` moves every exercise to its next choice,
// for the "Different exercises" button. `swaps` swaps single exercises, as
// { position: times swapped }: each swap moves to the next of up to three
// choices, the planned one first. With a trainer, the planned one is the
// trainer's favorite kind of equipment and the rest follow its order;
// without one, the plan's own pick comes first, then machine, free weight,
// other. `mode` limits the day: "cardio" for cardio only, "strength" for
// lifting only, "rest" for an unexpected rest day, or null for the full plan. `target` is a body part from TARGETS
// instead of today's split. `trainer` is a key of TRAINERS, and `shotDay` the
// weekday (Sunday is 0) of a weekly GLP-1 shot. `restDay` is the weekday off;
// on it, without a target, this returns a rest day.
export function suggest({ date = new Date(), aim = "maintain", gym = "pf", shuffle = 0, swaps = {}, mode = null, target = null, trainer = "none", shotDay = null, restDay = 0 } = {}) {
  const plan = AIMS[aim] ? aim : "maintain";
  const coachKey = TRAINERS[trainer] ? trainer : "none";
  const coach = TRAINERS[coachKey];
  const scheme = schemeFor(coach, plan);
  const day = gymDay(date);
  const window = timeWindow(date);
  const shot = shotDay === null || shotDay === "" ? null : Number(shotDay);
  const shotSoon = coachKey === "glp1" && shot !== null && (day === shot || day === (shot + 1) % 7);
  const off = Number(restDay) || 0;
  let runDay = TARGETS[target] ? null : coach.runs?.[weekPosition(day, off)];
  let split = null;
  if (TARGETS[target]) split = { key: target, ...TARGETS[target] };
  else if (runDay) split = runDay.split ? { key: runDay.split, ...splitByKey(runDay.split) } : null;
  else split = splitFor(day, off);
  // Strength only on a run day drops the run; a run-only day lifts the
  // standard plan's split for that day instead.
  if (mode === "strength" && runDay) {
    split ??= splitFor(day, off);
    runDay = null;
  }
  // An unexpected rest day is a rest day like the scheduled one.
  if (mode === "rest") {
    split = null;
    runDay = null;
  }
  if (split && coach.mainSwap?.[split.key] && !TARGETS[target]) split = { ...split, slots: [coach.mainSwap[split.key], ...split.slots.slice(1)] };
  const ctx = { plan, split, window, gym, shotSoon };
  const sources = coach.sources;
  const base = { day: DAY_NAMES[day], window, aim: plan, trainer: coachKey, sources };

  // The rest day is stretching only: nothing that reads as a workout. A body
  // part picked under Focus is the only way to train on it.
  if (!split && !runDay) {
    const items = REST_STRETCHES.map(([name, text, minutes], i) => ({ id: `stretch${i}`, kind: "stretch", name, text, minutes, met: MET.stretching }));
    return {
      ...base,
      rest: true,
      mode: mode === "rest" ? "rest" : null,
      title: mode === "rest" ? "Unexpected rest day" : "Rest day",
      focus: mode === "rest" ? "Stretching only. Back to locking in tomorrow." : `Stretching only. Recover for ${DAY_NAMES[(day + 1) % 7]}.`,
      minutes: items.reduce((total, item) => total + item.minutes, 0),
      items,
      notes: [
        "Rest days are part of the plan: muscles repair and grow between workouts, not during them.",
        ...(coach.restTips?.(plan) ?? [plan === "gain" ? "Eat at your calorie goal anyway; muscle is built on rest days." : "Get to bed on time; sleep is when you recover."]),
      ],
    };
  }


  if (mode === "cardio") return cardioOnly({ base, coachKey, plan, window, gym, shotSoon, runDay, ctx, split, target });

  const budget = Math.min(window.budget, coach.maxLifts ?? 6, shotSoon ? 4 : 6);
  const allowed = (option) => gym === "af" || !option.barbell;
  const slots = split ? split.slots.slice(0, budget).map((slot) => slot.filter(allowed)) : [];
  const superset = coach.superset === "never" ? false
    : coach.superset === "always" ? window.crowd !== "packed" || window.key === "lunch"
    : window.key === "lunch" || (plan === "cut" && window.crowd !== "packed");
  const exercises = slots.map((options, i) => {
    let planned;
    let others;
    if (coach.equipment) {
      const rank = (option) => coach.equipment.indexOf(equipmentKind(option.name));
      const preferred = [...options].sort((a, b) => rank(a) - rank(b));
      planned = pick(preferred, shuffle);
      others = preferred.filter((option) => option !== planned);
    } else {
      planned = pick(options, shuffle);
      // Machine, then free weight, then other, one of each before any repeats.
      const sorted = options.filter((option) => option !== planned).sort((a, b) => equipmentRank(a.name) - equipmentRank(b.name));
      const firstOfKind = sorted.filter((option, k) => k === 0 || equipmentRank(option.name) !== equipmentRank(sorted[k - 1].name));
      others = [...firstOfKind, ...sorted.filter((option) => !firstOfKind.includes(option))];
    }
    const choices = [planned, ...others].slice(0, MAX_CHOICES);
    const swapped = swaps[i] ?? 0;
    const choice = choices[swapped % choices.length];
    const alternative = choices.length > 1 ? choices[(swapped + 1) % choices.length].name : null;
    const main = i === 0;
    let { sets, reps, rest } = main && !split.small ? scheme.main : scheme.accessory;
    if (main) sets = scheme.main.sets;
    reps = choice.reps ?? split.reps ?? reps;
    rest = split.rest ?? rest;
    return { name: choice.name, sets, reps, rest, alternative, main };
  });

  // Supersets pair accessories two at a time (not the main lift): do one set
  // of each back to back, then rest.
  if (superset) {
    for (let i = 1; i + 1 < exercises.length; i += 2) {
      exercises[i].superset = "A";
      exercises[i + 1].superset = "B";
    }
  }

  // A run day's run replaces the cardio after lifting.
  const [runMinutes, runText, runMet] = runDay ? runDay.run(ctx) : [0, null, 0];
  const [cardioMinutes, cardioText, cardioMet] = runDay || mode === "strength" ? [0, null, 0] : coach.cardio?.(ctx) ?? cardio(plan, split, window);
  for (const e of exercises) {
    e.minutes = e.main && !split.small ? 12 : superset ? 5 : 7;
    e.met = superset ? MET.circuit : MET.lifting;
  }
  const liftMinutes = exercises.reduce((total, e) => total + e.minutes, 0);
  const minutes = (exercises.length ? 8 : 0) + liftMinutes + cardioMinutes + runMinutes;
  const warmupText = runDay
    ? `5 min brisk walk, then leg swings and a few 20-second strides.${exercises.length ? " After the run, 1 light set of each lift is enough." : ""}`
    : warmup(window, exercises[0].name);
  const warmupMinutes = runDay || window.key !== "early" ? 5 : 8;

  // Everything to lock in, in order, each with its minutes and MET for the
  // calories burned.
  const items = [
    { id: "warmup", kind: "warmup", name: "Warm-up", text: warmupText, minutes: warmupMinutes, met: MET.warmup },
    ...(runText ? [{ id: "run", kind: "run", name: runDay.title.split(" + ")[0], text: runText, minutes: runMinutes, met: runMet }] : []),
    ...exercises.map((e, i) => ({ id: `ex${i}`, kind: "lift", ...e })),
    ...(cardioText ? [{ id: "cardio", kind: "cardio", name: "Cardio", text: cardioText, minutes: cardioMinutes, met: cardioMet }] : []),
  ];

  // The time-of-day note is about lifting, so a run-only day skips it.
  const notes = [...(split ? [window.note] : []), ...(coach.notes?.(ctx) ?? [scheme.tip])];
  if (window.key === "late" && gym === "pf") notes.push("Many Planet Fitness clubs aren't open 24 hours anymore, so check your club's hours.");

  return {
    ...base,
    rest: false,
    split: split?.key ?? null,
    target: TARGETS[target] ? target : null,
    mode: mode === "strength" ? "strength" : null,
    title: runDay?.title ?? split.title,
    focus: runDay ? (split ? `Run, then ${split.focus.toLowerCase()}` : "Running only today") : split.focus,
    minutes: Math.round(minutes / 5) * 5,
    run: runText,
    warmup: warmupText,
    items,
    exercises,
    superset,
    cardio: cardioText,
    notes,
  };
}
