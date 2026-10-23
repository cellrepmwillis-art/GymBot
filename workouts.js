// Picks a workout from the day of the week, the time of day and the aim in
// Settings. The week is a push / pull / legs split run twice, Monday to
// Saturday, with Sunday off. Everything uses equipment a typical American gym
// has: dumbbells, cables, selectorized machines, Smith machines and cardio.
// Barbells and squat racks are only used for Anytime Fitness style gyms,
// since most Planet Fitness clubs don't have them.
import { RESET_HOUR } from "./day.js";

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
      [B("Barbell bench press"), E("Smith machine bench press"), E("Dumbbell bench press")],
      [E("Incline dumbbell press"), E("Smith machine incline press"), E("Incline chest press machine")],
      [E("Seated dumbbell shoulder press"), E("Shoulder press machine")],
      [E("Cable fly"), E("Pec deck"), E("Dumbbell fly")],
      [E("Dumbbell lateral raise"), E("Cable lateral raise"), E("Lateral raise machine")],
      [E("Cable rope pushdown"), E("Overhead dumbbell triceps extension"), E("Assisted dip machine")],
    ],
  },
  pullA: {
    title: "Pull A",
    focus: "Back and biceps (back width first)",
    slots: [
      [E("Lat pulldown"), E("Assisted pull-up machine")],
      [E("Seated cable row"), E("Seated row machine")],
      [E("Chest-supported dumbbell row"), E("Single-arm dumbbell row"), E("Plate-loaded row machine")],
      [E("Cable face pull"), E("Rear delt fly machine")],
      [E("Dumbbell curl"), E("Cable curl"), E("Biceps curl machine")],
      [E("Hammer curl"), E("Cable rope hammer curl")],
    ],
  },
  legsA: {
    title: "Legs A",
    focus: "Quads, hamstrings, calves and abs (squat first)",
    slots: [
      [B("Barbell back squat"), E("Smith machine squat"), E("Leg press")],
      [E("Leg press"), E("Hack squat machine"), E("Goblet squat")],
      [E("Leg extension"), E("Dumbbell walking lunge")],
      [E("Lying leg curl"), E("Seated leg curl")],
      [E("Standing calf raise (Smith machine)"), E("Calf press on the leg press")],
      [E("Cable crunch"), E("Hanging knee raise"), E("Ab crunch machine")],
    ],
  },
  pushB: {
    title: "Push B",
    focus: "Shoulders, chest and triceps (shoulders first)",
    slots: [
      [B("Standing barbell overhead press"), E("Smith machine shoulder press"), E("Seated dumbbell shoulder press")],
      [E("Chest press machine"), E("Dumbbell bench press"), E("Smith machine bench press")],
      [E("Incline dumbbell press"), E("Incline chest press machine")],
      [E("Cable lateral raise"), E("Dumbbell lateral raise"), E("Lateral raise machine")],
      [E("Pec deck"), E("Cable fly")],
      [E("Overhead cable triceps extension"), E("Dumbbell skull crusher"), E("Triceps extension machine")],
    ],
  },
  pullB: {
    title: "Pull B",
    focus: "Back, rear delts and biceps (back thickness first)",
    slots: [
      [B("Barbell bent-over row"), E("Single-arm dumbbell row"), E("Plate-loaded row machine")],
      [E("Assisted pull-up machine"), E("Lat pulldown (close grip)")],
      [E("Straight-arm cable pulldown"), E("Dumbbell pullover")],
      [E("Rear delt fly machine"), E("Bent-over dumbbell reverse fly")],
      [E("Preacher curl machine"), E("Incline dumbbell curl")],
      [E("Back extension"), E("Cable pull-through")],
    ],
  },
  legsB: {
    title: "Legs B",
    focus: "Hamstrings, glutes, quads and core (hinge first)",
    slots: [
      [B("Barbell Romanian deadlift"), E("Smith machine Romanian deadlift"), E("Dumbbell Romanian deadlift")],
      [E("Leg press (feet high)"), E("Hack squat machine"), E("Smith machine squat")],
      [E("Dumbbell Bulgarian split squat"), E("Dumbbell reverse lunge")],
      [E("Seated leg curl"), E("Lying leg curl")],
      [E("Hip thrust (Smith machine)"), E("Glute kickback machine"), E("Hip abduction machine")],
      [E("Seated calf raise"), E("Plank", "30–60 sec")],
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
      [B("Barbell bench press"), E("Smith machine bench press"), E("Dumbbell bench press")],
      [E("Incline dumbbell press"), E("Smith machine incline press"), E("Incline chest press machine")],
      [E("Chest press machine"), E("Dumbbell bench press")],
      [E("Pec deck"), E("Cable fly"), E("Dumbbell fly")],
      [E("Low-to-high cable fly"), E("Incline dumbbell fly")],
      [E("Push-up", "as many as you can"), E("Assisted dip machine")],
    ],
  },
  back: {
    title: "Back day",
    focus: "Width, thickness and lower back",
    slots: [
      [E("Lat pulldown"), E("Assisted pull-up machine")],
      [B("Barbell bent-over row"), E("Single-arm dumbbell row"), E("Plate-loaded row machine")],
      [E("Seated cable row"), E("Seated row machine")],
      [E("Chest-supported dumbbell row"), E("Lat pulldown (close grip)")],
      [E("Straight-arm cable pulldown"), E("Dumbbell pullover")],
      [E("Back extension"), E("Cable pull-through")],
    ],
  },
  shoulders: {
    title: "Shoulder day",
    focus: "Front, side and rear delts, plus traps",
    slots: [
      [B("Standing barbell overhead press"), E("Smith machine shoulder press"), E("Seated dumbbell shoulder press")],
      [E("Shoulder press machine"), E("Dumbbell Arnold press")],
      [E("Dumbbell lateral raise"), E("Cable lateral raise"), E("Lateral raise machine")],
      [E("Rear delt fly machine"), E("Bent-over dumbbell reverse fly")],
      [E("Cable face pull"), E("Cable rear delt fly")],
      [E("Dumbbell shrug"), E("Smith machine shrug")],
    ],
  },
  biceps: {
    title: "Biceps day",
    focus: "Curls from every angle, plus forearms",
    small: true,
    slots: [
      [B("Barbell curl"), E("Dumbbell curl"), E("Cable curl")],
      [E("Preacher curl machine"), E("Dumbbell preacher curl")],
      [E("Incline dumbbell curl"), E("Cable curl (behind the body)")],
      [E("Hammer curl"), E("Cable rope hammer curl")],
      [E("Biceps curl machine"), E("Concentration curl")],
      [E("Dumbbell wrist curl"), E("Farmer's carry", "40–60 sec")],
    ],
  },
  triceps: {
    title: "Triceps day",
    focus: "Pressing, pushdowns and overhead work",
    small: true,
    slots: [
      [B("Close-grip barbell bench press"), E("Close-grip Smith machine bench press"), E("Close-grip dumbbell press")],
      [E("Assisted dip machine"), E("Triceps dip machine")],
      [E("Cable rope pushdown"), E("Straight-bar cable pushdown")],
      [E("Overhead cable triceps extension"), E("Overhead dumbbell triceps extension")],
      [E("Dumbbell skull crusher"), E("Triceps extension machine")],
      [E("Single-arm cable kickback"), E("Dumbbell kickback")],
    ],
  },
  legs: {
    title: "Leg day",
    focus: "Quads, hamstrings, glutes and calves",
    slots: [
      [B("Barbell back squat"), E("Smith machine squat"), E("Leg press")],
      [B("Barbell Romanian deadlift"), E("Smith machine Romanian deadlift"), E("Dumbbell Romanian deadlift")],
      [E("Leg press"), E("Hack squat machine"), E("Dumbbell Bulgarian split squat")],
      [E("Lying leg curl"), E("Seated leg curl")],
      [E("Leg extension"), E("Dumbbell walking lunge")],
      [E("Standing calf raise (Smith machine)"), E("Seated calf raise")],
    ],
  },
  abs: {
    title: "Ab day",
    focus: "Upper and lower abs, obliques and core",
    small: true,
    reps: "12–20",
    rest: "45 sec",
    slots: [
      [E("Cable crunch"), E("Ab crunch machine")],
      [E("Hanging knee raise"), E("Captain's chair knee raise")],
      [E("Plank", "30–60 sec"), E("Dead bug")],
      [E("Cable woodchop"), E("Dumbbell Russian twist")],
      [E("Reverse crunch"), E("Decline bench sit-up")],
      [E("Side plank", "30 sec each side"), E("Dumbbell side bend")],
    ],
  },
};

export const TARGET_LABELS = { chest: "Chest", back: "Back", shoulders: "Shoulders", biceps: "Biceps", triceps: "Triceps", legs: "Legs", abs: "Abs" };

// Sunday is 0 in JavaScript. Monday to Saturday run the split twice.
const WEEK = [null, "pushA", "pullA", "legsA", "pushB", "pullB", "legsB"];

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
  // 0:00–2:59 belongs to the late-night window of the day before.
  if (hour < RESET_HOUR) return WINDOWS[WINDOWS.length - 1];
  return [...WINDOWS].reverse().find((w) => hour >= w.from);
}

// The gym day: before 3am still counts as the day before, like CookBot.
export function gymDay(date = new Date()) {
  const shifted = new Date(date.getTime());
  shifted.setHours(shifted.getHours() - RESET_HOUR);
  return shifted.getDay();
}

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function splitFor(day) {
  const key = WEEK[day];
  return key ? { key, ...SPLITS[key] } : null;
}

// Cardio after lifting, by aim, as [minutes, what to do]. Leg days get less
// so the legs can recover; late at night it stays easy.
function cardio(aim, split, window) {
  const legs = split.key.startsWith("legs");
  const easy = window.key === "late" || window.key === "evening";
  const short = window.budget < 6;
  if (aim === "gain") return [5, "Optional: 5–10 min easy bike or elliptical to cool down."];
  if (aim === "maintain") {
    const minutes = short || legs ? 10 : 20;
    return [minutes, `${minutes} min at a steady pace on the elliptical, bike or rower.`];
  }
  // Cut
  if (short) return [15, "15 min incline treadmill walk (10–12% incline, about 3 mph)."];
  if (legs) return [20, "15–20 min incline treadmill walk (10–12% incline, about 3 mph)."];
  if (easy) return [30, "30 min incline treadmill walk (10–12% incline, about 3 mph)."];
  return [30, "25–30 min incline treadmill walk or 15 min on the StairMaster."];
}

// Warm-up: 5 minutes of easy cardio, longer in the early morning, then light
// sets of the first exercise.
function warmup(window, first) {
  const minutes = window.key === "early" ? 8 : 5;
  const name = first.startsWith("Smith") ? first : first[0].toLowerCase() + first.slice(1);
  return `${minutes} min easy on the bike or treadmill, then 2 light sets of ${name}.`;
}

const pick = (options, i) => options[((i % options.length) + options.length) % options.length];

// The workout for `date`. `shuffle` moves every exercise to its next choice,
// for the "Different exercises" button. `target` is a body part from TARGETS
// instead of today's split. Sunday without a target returns a rest day.
export function suggest({ date = new Date(), aim = "maintain", gym = "pf", shuffle = 0, target = null } = {}) {
  const plan = AIMS[aim] ? aim : "maintain";
  const scheme = AIMS[plan];
  const day = gymDay(date);
  const window = timeWindow(date);
  const split = TARGETS[target] ? { key: target, ...TARGETS[target] } : splitFor(day);
  const base = { day: DAY_NAMES[day], window, aim: plan };

  if (!split) {
    return {
      ...base,
      rest: true,
      title: "Rest day",
      focus: "Recover for Monday's push day",
      steps: [
        plan === "cut" ? "Walk 45–60 min, or get 10,000 steps." : "Walk 20–40 min at an easy pace.",
        "10 min of stretching: hips, hamstrings, chest and shoulders.",
        plan === "gain" ? "Eat at your calorie goal anyway; muscle is built on rest days." : "Get to bed on time; sleep is when you recover.",
      ],
    };
  }

  const allowed = (option) => gym === "af" || !option.barbell;
  const slots = split.slots.slice(0, window.budget).map((slot) => slot.filter(allowed));
  const superset = window.key === "lunch" || (plan === "cut" && window.crowd !== "packed");
  const exercises = slots.map((options, i) => {
    const choice = pick(options, shuffle);
    const alternative = options.length > 1 ? pick(options, shuffle + 1).name : null;
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

  const [cardioMinutes, cardioText] = cardio(plan, split, window);
  const minutes = 8 + exercises.reduce((total, e) => total + (e.main && !split.small ? 12 : superset ? 5 : 7), 0) + cardioMinutes;

  const notes = [window.note, scheme.tip];
  if (window.key === "late" && gym === "pf") notes.push("Many Planet Fitness clubs aren't open 24 hours anymore, so check your club's hours.");

  return {
    ...base,
    rest: false,
    split: split.key,
    target: TARGETS[target] ? target : null,
    title: split.title,
    focus: split.focus,
    minutes: Math.round(minutes / 5) * 5,
    warmup: warmup(window, exercises[0].name),
    exercises,
    superset,
    cardio: cardioText,
    notes,
  };
}
