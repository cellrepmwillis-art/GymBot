// Picks a workout from the day of the week, the time of day and the aim in
// Settings. The week is a push / pull / legs split run twice, Monday to
// Saturday, with Sunday off. Everything uses equipment a typical American gym
// has: dumbbells, cables, selectorized machines, Smith machines and cardio.
// Barbells and squat racks are only used for Anytime Fitness style gyms,
// since most Planet Fitness clubs don't have them.
import { RESET_HOUR } from "./day.js";
import { TRAINERS, RUNNER_LEGS } from "./trainers.js";
import { MET } from "./met.js";
import { OUTDOOR } from "./outdoor.js";

export { TRAINERS };
export { sessionLimits } from "./trainers.js";
export { MET, caloriesBurned } from "./met.js";

// Aims match CookBot's Settings: "gain", "maintain" or "cut". All three
// build muscle; they differ in what body weight does: cut loses fat while
// keeping and building muscle, maintain holds weight while building muscle
// (recomposition), and gain adds healthy mass and muscle.
export const AIMS = {
  gain: {
    label: "Gain",
    blurb: "Gain healthy mass and muscle: a heavier main lift, more sets, little cardio, and a small calorie surplus.",
    main: { sets: 4, reps: "6–8", rest: "2–3 min" },
    accessory: { sets: 3, reps: "8–12", rest: "90 sec" },
    tip: "Beat last week: one more rep or a little more weight on each lift.",
  },
  maintain: {
    label: "Maintain",
    blurb: "Keep your weight steady while building muscle: keep adding reps or weight, with some cardio for your heart.",
    main: { sets: 3, reps: "8–10", rest: "2 min" },
    accessory: { sets: 3, reps: "10–12", rest: "75 sec" },
    tip: "Your weight stays steady, but your lifts shouldn't: add a rep or a little weight when you can. That's how you build muscle without gaining.",
  },
  cut: {
    label: "Cut",
    blurb: "Lose fat while keeping and building muscle: the main lift stays heavy, with shorter rests and more cardio.",
    main: { sets: 3, reps: "6–8", rest: "2 min" },
    accessory: { sets: 3, reps: "12–15", rest: "45–60 sec" },
    tip: "Keep the weight on your main lift: it tells your body to hold on to muscle while you lose fat. Losing a rep or two on a cut is normal.",
  },
};

export const GYMS = {
  pf: { label: "Planet Fitness style (Smith machines, dumbbells, machines)" },
  af: { label: "Anytime Fitness style (also barbells and squat racks)" },
  outdoor: { label: "Outdoors & home (parks, tracks, your living room)" },
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
  // One exercise for each major area. Best 2–3 days a week with a day off
  // between, so the same muscles get about 48 hours to recover (ACSM).
  fullBody: {
    title: "Full body",
    focus: "Legs, chest, back, hips, shoulders and core",
    slots: [
      [B("Barbell back squat"), E("Smith machine squat"), E("Leg press"), E("Goblet squat")],
      [B("Barbell bench press"), E("Smith machine bench press"), E("Dumbbell bench press"), E("Chest press machine")],
      [E("Lat pulldown"), E("Seated cable row"), E("Single-arm dumbbell row")],
      [B("Barbell Romanian deadlift"), E("Smith machine Romanian deadlift"), E("Dumbbell Romanian deadlift"), E("Lying leg curl")],
      [E("Seated dumbbell shoulder press"), E("Shoulder press machine"), E("Cable lateral raise")],
      [E("Plank", "30–60 sec"), E("Cable crunch"), E("Dead bug")],
    ],
  },
};

export const TARGET_LABELS = { chest: "Chest", back: "Back", shoulders: "Shoulders", biceps: "Biceps", triceps: "Triceps", legs: "Legs", abs: "Abs", fullBody: "Full body" };

// ---- My routine ----

// Cardio for "User selected", by key: what it's called, what to do for
// `minutes`, its MET and whether it's done outdoors (for the Outdoors & home
// gym) or at a gym.
export const ROUTINE_CARDIO = {
  // 12-3-30: treadmill at a 12% incline and 3 mph. The ACSM walking equation
  // puts that at about 8.3 METs, vigorous.
  "12-3-30": { label: "12-3-30 (treadmill, 12% incline, 3 mph)", text: (m) => `12-3-30 for ${m} min: treadmill at a 12% incline and 3 mph. Hold the rails only for balance.`, met: 8.3, place: "gym" },
  inclineWalk: { label: "Incline treadmill walk", text: (m) => `${m} min incline treadmill walk (10–12% incline, about 3 mph).`, met: MET.inclineWalk, place: "gym" },
  stairs: { label: "StairMaster", text: (m) => `${m} min on the StairMaster at a steady pace.`, met: 9.0, place: "gym" },
  elliptical: { label: "Elliptical", text: (m) => `${m} min on the elliptical at a pace that's hard but lets you talk.`, met: MET.moderateMachine, place: "gym" },
  bike: { label: "Stationary bike", text: (m) => `${m} min on the bike at a pace that's hard but lets you talk.`, met: 6.8, place: "gym" },
  rower: { label: "Rowing machine", text: (m) => `${m} min on the rower at a steady pace.`, met: 7.0, place: "gym" },
  run: { label: "Easy run", text: (m) => `${m} min easy run, at a pace you could talk at.`, met: MET.easyRun, place: "both" },
  walk: { label: "Brisk walk", text: (m) => `${m} min brisk walk at the park or around the track.`, met: MET.briskWalk, place: "both" },
  hike: { label: "Hilly walk or hike", text: (m) => `${m} min walk with hills, at a pace where talking takes some effort.`, met: 6.0, place: "outdoor" },
};

// The body parts "One body part a day" goes through, one per training day.
export const ROUTINE_ROTATION = ["chest", "back", "legs", "shoulders", "biceps", "triceps"];

export const ROUTINE_STRENGTH = {
  rotate: "One body part a day (chest, back, legs, shoulders, biceps, triceps)",
  fullBody: "Full body every other day (3 days a week, the recommended most)",
  none: "No lifting, just the cardio",
};

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
function warmup(window, first, gym) {
  const minutes = window.key === "early" ? 8 : 5;
  if (gym === "outdoor") return `${minutes} min easy walk, then arm circles, leg swings and a few bodyweight squats.`;
  const name = first.startsWith("Smith") ? first : first[0].toLowerCase() + first.slice(1);
  return `${minutes} min easy on the bike or treadmill, then 2 light sets of ${name}.`;
}

// The aims' tips, for bodyweight work.
const OUTDOOR_TIPS = {
  gain: "Beat last week: a rep or two more on each exercise, or move to the harder swap.",
  maintain: "Weight steady, reps climbing: add a rep or two, or move to the harder swap, when you can.",
  cut: "Keep your reps up on the first exercise. Too easy? Lower slowly, over 3 seconds.",
};

// Cardio after the workout for the "Outdoors & home" gym: walking at the
// park or around a track, as [minutes, what to do, MET].
function outdoorCardio({ plan, coachKey, split, window, shotSoon }) {
  const legs = /^legs|runnerLegs/.test(split.key);
  const short = window.budget < 6;
  if (coachKey === "glp1") {
    return shotSoon ? [15, "Easy 15–20 min walk. Skip it if you feel sick.", MET.easyWalk]
      : [30, "30 min brisk walk at the park or around the track, at a pace you can still talk at.", MET.briskWalk];
  }
  if (coachKey === "weightLoss") return short ? [20, "20 min brisk walk.", MET.briskWalk] : [45, "45 min brisk walk at the park or around the track.", MET.briskWalk];
  if (coachKey === "powerlifter") return [10, "10 min easy walk.", MET.easyWalk];
  if (plan === "gain") return [10, "Optional: 10 min easy walk to cool down.", MET.easyWalk];
  if (plan === "maintain") {
    const minutes = short || legs ? 15 : 30;
    return [minutes, `${minutes} min brisk walk at the park or around the track.`, MET.briskWalk];
  }
  const minutes = short ? 20 : legs ? 25 : 40;
  return [minutes, `${minutes} min brisk walk, with hills if you can find them, at a pace where talking takes some effort.`, MET.inclineWalk];
}

// The "Cardio only" override: a warm-up and one longer cardio session in
// place of the lifting. On a run day it's the run by itself.
// With `planned` (a trainer with a cardio day in its week), it's that day.
function cardioOnly({ base, coachKey, plan, window, gym, shotSoon, runDay, ctx, split, target, planned }) {
  const long = window.budget >= 6 ? 45 : 30;
  let session;
  if (planned) {
    const minutes = window.budget >= 6 ? 40 : 25;
    session = gym === "outdoor" ? [minutes, `${minutes} min brisk walk at the park or around the track, at a pace where you can talk but not sing.`, MET.briskWalk]
      : plan === "cut" ? [minutes, `${minutes} min incline treadmill walk: start around a 5% incline at 3 mph and go up as it gets easy.`, MET.inclineWalk]
      : [minutes, `${minutes} min brisk walk on the treadmill (or outside), or the elliptical, at a pace where you can talk but not sing.`, MET.briskWalk];
  } else if (runDay) session = runDay.run(ctx);
  else if (coachKey === "marathon") session = [long, `Easy run, ${long} min, at a pace you could talk at.`, MET.easyRun];
  else if (gym === "outdoor") session = coachKey === "glp1" && shotSoon
    ? [20, "Easy 20 min walk. Skip it if you feel sick.", MET.easyWalk]
    : plan === "cut" || coachKey === "weightLoss"
      ? [long, `${long} min brisk walk at the park or around the track, with hills if you can find them.`, MET.inclineWalk]
      : [long, `${long} min brisk walk at the park or around the track, at a pace that's hard but lets you talk.`, MET.briskWalk];
  else if (coachKey === "glp1") session = shotSoon
    ? [20, "Easy 20 min walk. Skip it if you feel sick.", MET.easyWalk]
    : [long, `${long} min brisk walk or bike at a pace you can still talk at.`, MET.briskWalk];
  else if (plan === "cut" || coachKey === "weightLoss") session = [long, `${long} min incline treadmill walk (10–12% incline, about 3 mph). Split it with the StairMaster or bike if you like.`, MET.inclineWalk];
  else session = [long, `${long} min of steady cardio: mix the bike, elliptical and rower at a pace that's hard but lets you talk.`, MET.moderateMachine];
  const [minutes, text, met] = session;
  const warmupText = runDay ? "5 min brisk walk, then leg swings and a few 20-second strides."
    : gym === "outdoor" ? "5 min easy walk, building up to your pace." : "5 min easy on the bike or treadmill, building up to your cardio pace.";
  const items = [
    { id: "warmup", kind: "warmup", name: "Warm-up", text: warmupText, minutes: 5, met: MET.warmup },
    { id: runDay ? "run" : "cardio", kind: runDay ? "run" : "cardio", name: runDay ? runDay.title.split(" + ")[0] : "Cardio", text, minutes, met },
  ];
  const notes = planned ? [...planned.cardioDayNotes] : ["Cardio only today, by your choice. Tomorrow is back to the full plan."];
  if (window.key === "late" && gym === "pf") notes.push("Many Planet Fitness clubs aren't open 24 hours anymore, so check your club's hours.");
  return {
    ...base,
    rest: false,
    mode: planned ? null : "cardio",
    split: split?.key ?? null,
    target: TARGETS[target] ? target : null,
    title: planned ? "Cardio day" : "Cardio only",
    focus: planned ? "Walk or easy cardio between full-body days" : "Cardio only",
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

// At most this many tips a session.
export const MAX_TIPS = 5;

// The session's training tips (food, recovery and medical notes are kept
// apart, as `health`, with their own MAX_TIPS): the time-of-day note, the
// trainer's (or the aim's) tips, then the Planet Fitness hours note. Over MAX_TIPS, the general
// notes go first (hours, then time of day); the trainer's tips, safety ones
// included, stay.
function limitTips(placeNote, coachNotes, hoursNote) {
  const notes = [placeNote, ...coachNotes, hoursNote].filter(Boolean);
  if (notes.length > MAX_TIPS && hoursNote) notes.splice(notes.indexOf(hoursNote), 1);
  if (notes.length > MAX_TIPS && placeNote) notes.splice(notes.indexOf(placeNote), 1);
  return notes.slice(0, MAX_TIPS);
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
  // Resistance bands pull like cables.
  if (/cable|pushdown|face pull|\bband\b/i.test(name)) return "cable";
  if (/machine|leg press|pec deck|pulldown|hack squat|leg curl|leg extension|calf press|seated calf raise/i.test(name)) return "machine";
  // A backpack or a water jug is a free weight too.
  if (/dumbbell|goblet|farmer|hammer curl|concentration curl|backpack|water|jug/i.test(name)) return "dumbbell";
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
// lifting only, "rest" for an unexpected rest day, or null for the full plan.
// `extra` makes it an extra session of the day (with mode "cardio" or
// "strength"). `target` is a body part from TARGETS
// instead of today's split. `trainer` is a key of TRAINERS, and `shotDay` the
// weekday (Sunday is 0) of a weekly GLP-1 shot. `restDay` is the weekday off;
// on it, without a target, this returns a rest day.
// "User selected": a person's own day, made of their cardio and their choice of
// lifting, as one session. `routine` is { cardio, minutes, strength } (keys
// of ROUTINE_CARDIO and ROUTINE_STRENGTH). It applies on training days when
// no body part is picked and no override is on; the rest day stays a rest
// day. `routine.part` swaps the day's body part for another, or "none".
export function suggest(args = {}) {
  const { routine, target, mode, extra, date = new Date(), restDay = 0, gym = "pf" } = args;
  let cardio = routine && ROUTINE_CARDIO[routine.cardio];
  // Cardio that doesn't fit the gym gives way: a treadmill outdoors becomes
  // a brisk walk, a hike at the gym an incline walk.
  if (cardio?.place === "gym" && gym === "outdoor") cardio = ROUTINE_CARDIO.walk;
  if (cardio?.place === "outdoor" && gym !== "outdoor") cardio = ROUTINE_CARDIO.inclineWalk;
  const position = weekPosition(gymDay(date), Number(restDay) || 0);
  if (!cardio || target || mode || extra || position === 0) return suggestDay(args);
  const minutes = Number(routine.minutes) || 30;
  const turn = routine.strength === "fullBody" ? (position % 2 === 1 ? "fullBody" : null)
    : routine.strength === "none" ? null
    : ROUTINE_ROTATION[(position - 1) % ROUTINE_ROTATION.length];
  // A body part picked for the day ("none" for just the cardio) replaces
  // the routine's turn.
  const lifting = routine.part === "none" ? null : TARGETS[routine.part] ? routine.part : turn;
  const w = suggestDay({ ...args, target: lifting, mode: lifting ? null : "cardio" });
  // The routine's cardio replaces the plan's.
  const cardioItem = w.items.find((item) => item.kind === "cardio" || item.kind === "run");
  const text = cardio.text(minutes);
  if (cardioItem) Object.assign(cardioItem, { id: "cardio", kind: "cardio", name: "Cardio", text, minutes, met: cardio.met });
  else w.items.push({ id: "cardio", kind: "cardio", name: "Cardio", text, minutes, met: cardio.met });
  const lifted = w.items.filter((item) => item.kind === "lift").reduce((sum, item) => sum + item.minutes, 0);
  const short = cardio.label.split(" (")[0];
  return {
    ...w,
    routine: true,
    part: lifting ?? "none",
    turn: turn ?? "none",
    mode: null,
    run: null,
    cardio: text,
    title: lifting ? `${TARGET_LABELS[lifting]} + ${short}` : short,
    focus: lifting ? "User selected" : "User selected · cardio day",
    minutes: Math.round((5 + lifted + minutes) / 5) * 5,
  };
}

function suggestDay({ date = new Date(), aim = "maintain", gym = "pf", shuffle = 0, swaps = {}, mode = null, target = null, trainer = "ppl", shotDay = null, restDay = 0, extra = false } = {}) {
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
  // An extra session is just its cardio or its lifting: no run day, and
  // always something to do.
  if (extra) {
    runDay = null;
    split ??= splitFor(day, off) ?? { key: "legs", ...TARGETS.legs };
  }
  // An unexpected rest day is a rest day like the scheduled one.
  if (mode === "rest") {
    split = null;
    runDay = null;
  }
  // Standard: full body on the 1st, 3rd and 5th training days, a cardio day
  // between. Strength only on a cardio day lifts full body too.
  let cardioDay = false;
  if (coach.fullBodyWeek && split && !TARGETS[target] && !extra && mode !== "rest") {
    if (weekPosition(day, off) % 2 === 1 || mode === "strength") split = { key: "fullBody", ...TARGETS.fullBody };
    else if (mode !== "cardio") cardioDay = true;
  }
  if (split && coach.mainSwap?.[split.key] && !TARGETS[target] && gym !== "outdoor") split = { ...split, slots: [coach.mainSwap[split.key], ...split.slots.slice(1)] };
  // Outdoors & home: the same day, with no-gym exercises.
  if (split && gym === "outdoor") split = { ...split, slots: OUTDOOR[split.key] ?? split.slots };
  const ctx = { plan, split, window, gym, shotSoon };
  const sources = coach.sources;
  const base = { day: DAY_NAMES[day], window, aim: plan, trainer: coachKey, sources };

  // The rest day is stretching only: nothing that reads as a workout. A body
  // part picked under Focus is the only way to train on it.
  // An unexpected rest day has nothing to lock at all, so nothing nudges
  // someone who's sick or worn out into doing more.
  if (!split && !runDay) {
    const items = mode === "rest" ? [] : REST_STRETCHES.map(([name, text, minutes], i) => ({ id: `stretch${i}`, kind: "stretch", name, text, minutes, met: MET.stretching }));
    return {
      ...base,
      rest: true,
      mode: mode === "rest" ? "rest" : null,
      title: mode === "rest" ? "Unexpected rest day" : "Rest day",
      focus: mode === "rest" ? "Take it easy today." : `Stretching only. Recover for ${DAY_NAMES[(day + 1) % 7]}.`,
      minutes: items.reduce((total, item) => total + item.minutes, 0),
      items,
      notes: ["Rest days are part of the plan: muscles repair and grow between workouts, not during them."],
      health: (coach.restTips?.(plan) ?? [plan === "gain" ? "Eat at your calorie goal anyway; muscle is built on rest days." : "Get to bed on time; sleep is when you recover."]).slice(0, MAX_TIPS),
    };
  }


  if (cardioDay) return { ...cardioOnly({ base, coachKey, plan, window, gym, shotSoon, runDay, ctx, split, target, planned: coach }), health: (coach.health?.(ctx) ?? []).slice(0, MAX_TIPS), extra };
  if (mode === "cardio") return { ...cardioOnly({ base, coachKey, plan, window, gym, shotSoon, runDay, ctx, split, target }), health: (coach.health?.(ctx) ?? []).slice(0, MAX_TIPS), extra };

  const budget = Math.min(window.budget, coach.maxLifts ?? 6, shotSoon ? 4 : 6);
  const allowed = (option) => gym === "af" || !option.barbell;
  const slots = split ? split.slots.slice(0, budget).map((slot) => slot.filter(allowed)) : [];
  const superset = coach.superset === "never" ? false
    : coach.superset === "always" ? window.crowd !== "packed" || window.key === "lunch"
    : window.key === "lunch" || (plan === "cut" && window.crowd !== "packed");
  // An exercise already planned earlier in the day isn't planned twice (the
  // leg press standing in for the squat, then the leg press slot).
  const used = new Set();
  const fresh = (planned, options) => (used.has(planned.name) ? options.find((option) => !used.has(option.name)) ?? planned : planned);
  const exercises = slots.map((options, i) => {
    let planned;
    let others;
    if (coach.equipment) {
      const rank = (option) => coach.equipment.indexOf(equipmentKind(option.name));
      const preferred = [...options].sort((a, b) => rank(a) - rank(b));
      planned = fresh(pick(preferred, shuffle), preferred);
      others = preferred.filter((option) => option !== planned);
    } else {
      planned = fresh(pick(options, shuffle), options);
      // Machine, then free weight, then other, one of each before any repeats.
      const sorted = options.filter((option) => option !== planned).sort((a, b) => equipmentRank(a.name) - equipmentRank(b.name));
      const firstOfKind = sorted.filter((option, k) => k === 0 || equipmentRank(option.name) !== equipmentRank(sorted[k - 1].name));
      others = [...firstOfKind, ...sorted.filter((option) => !firstOfKind.includes(option))];
    }
    const choices = [planned, ...others].slice(0, MAX_CHOICES);
    const swapped = swaps[i] ?? 0;
    const choice = choices[swapped % choices.length];
    used.add(choice.name);
    const alternative = choices.length > 1 ? choices[(swapped + 1) % choices.length].name : null;
    const main = i === 0;
    let { sets, reps, rest } = main && !split.small ? scheme.main : scheme.accessory;
    if (main) sets = scheme.main.sets;
    // Bodyweight work needs more reps than gym weights to be a workout.
    reps = choice.reps ?? split.reps ?? (gym === "outdoor" ? (main ? "10–15" : "12–20") : reps);
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
  const [cardioMinutes, cardioText, cardioMet] = runDay || mode === "strength" ? [0, null, 0]
    : gym === "outdoor" && coachKey !== "marathon" ? outdoorCardio({ plan, coachKey, split, window, shotSoon })
    : coach.cardio?.(ctx) ?? cardio(plan, split, window);
  for (const e of exercises) {
    e.minutes = e.main && !split.small ? 12 : superset ? 5 : 7;
    e.met = superset ? MET.circuit : MET.lifting;
  }
  const liftMinutes = exercises.reduce((total, e) => total + e.minutes, 0);
  const minutes = (exercises.length ? 8 : 0) + liftMinutes + cardioMinutes + runMinutes;
  const warmupText = runDay
    ? `5 min brisk walk, then leg swings and a few 20-second strides.${exercises.length ? " After the run, 1 light set of each lift is enough." : ""}`
    : warmup(window, exercises[0].name, gym);
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
  // The time-of-day notes are about how busy a gym is; outdoors gets its own.
  const placeNote = gym !== "outdoor" ? window.note
    : window.key === "early" || window.key === "late" || window.key === "evening" ? "If it's dark out, stick to well-lit paths, or do the workout at home."
    : "A park bench, a patch of grass and a backpack with a few books in it are all the gym you need.";
  const tip = gym === "outdoor" ? OUTDOOR_TIPS[plan] : scheme.tip;
  const hoursNote = window.key === "late" && gym === "pf" ? "Many Planet Fitness clubs aren't open 24 hours anymore, so check your club's hours." : null;
  const notes = limitTips(split ? placeNote : null, coach.notes?.(ctx) ?? [tip], hoursNote);
  const health = (coach.health?.(ctx) ?? []).slice(0, MAX_TIPS);

  return {
    ...base,
    rest: false,
    split: split?.key ?? null,
    target: TARGETS[target] ? target : null,
    mode: mode === "strength" ? "strength" : null,
    extra,
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
    health,
  };
}
