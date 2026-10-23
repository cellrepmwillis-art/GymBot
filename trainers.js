// The "AI Trainer" setting: how the workout changes for a kind of athlete or
// situation. For now these are built-in rules that follow published
// guidance, not a live AI. Each trainer can change:
//   scheme(plan)   sets, reps and rest for the main lift and the rest
//   maxLifts       how many exercises at most
//   superset       "always" (when the gym isn't packed) or "never"
//   cardio(ctx)    [minutes, what to do, MET] after lifting (MET: how hard,
//                  for calories burned; see met.js)
//   runs           a different week, with a run each day (marathon)
//   mainSwap       a different first exercise on some split days
//   equipment      kinds of equipment in order of preference (see
//                  equipmentKind in workouts.js): each exercise starts with
//                  the most preferred choice the gym has, and swaps follow
//                  the same order
//   notes(ctx)     tips shown with the workout
//   restTips(plan) advice for the rest day (the rest day itself is always
//                  just stretching; see suggest in workouts.js)
// ctx is { plan, split, window, gym, shotSoon }.

import { MET } from "./met.js";

const B = (name) => ({ name, barbell: true });
const E = (name, reps) => (reps ? { name, reps } : { name });

// Single-leg strength for runners: steadier hips and knees, and stronger
// calves for the miles.
export const RUNNER_LEGS = {
  title: "Runner's legs",
  focus: "Single-leg strength, hips and calves",
  slots: [
    [E("Dumbbell Bulgarian split squat"), E("Dumbbell reverse lunge")],
    [E("Single-leg dumbbell Romanian deadlift"), E("Dumbbell Romanian deadlift")],
    [E("Dumbbell step-up onto a bench"), E("Single-leg leg press")],
    [E("Standing calf raise (Smith machine)"), E("Single-leg dumbbell calf raise")],
    [E("Hip abduction machine"), E("Cable hip abduction")],
    [E("Side plank", "30 sec each side"), E("Dead bug")],
  ],
};

const easyRun = (ctx, extra = 0) => {
  const minutes = (ctx.window.budget < 6 ? 25 : 35) + extra;
  return [minutes, `Easy run, ${minutes} min, at a pace you could talk at (1% incline on a treadmill).`, MET.easyRun];
};

export const TRAINERS = {
  none: {
    label: "Off (standard plan)",
    blurb: "Push, pull, legs twice a week, shaped by your aim.",
    sources: [],
  },

  bodybuilder: {
    label: "Bodybuilder",
    blurb: "Muscle size first: every muscle twice a week, moderate reps, sets taken close to failure.",
    // Cables and machines keep tension on the muscle through the whole rep.
    equipment: ["cable", "machine", "dumbbell", "smith", "barbell", "other"],
    sources: ["ACSM progression models for resistance training", "Bodybuilding.com", "Schoenfeld's hypertrophy research"],
    scheme: (plan) => ({
      main: { reps: plan === "cut" ? "6–8" : "6–10" },
      accessory: { sets: plan === "gain" ? 4 : 3, reps: plan === "cut" ? "10–15" : "8–12", rest: "60–90 sec" },
    }),
    notes: () => [
      "Take the last set of each exercise to 1–2 reps short of failure.",
      "Control the lowering part of every rep (about 2 seconds).",
      "Sleep 7–9 hours; that's when muscle is built.",
    ],
  },

  powerlifter: {
    label: "Powerlifter",
    blurb: "Strength on the squat, bench and deadlift: heavy low-rep sets with long rests.",
    // The barbell lifts, or the Smith machine where there are no barbells.
    equipment: ["barbell", "smith", "dumbbell", "machine", "cable", "other"],
    sources: ["ACSM progression models for resistance training", "NSCA strength training guidelines"],
    scheme: (plan) => ({
      main: { sets: plan === "gain" ? 5 : 4, reps: "3–5", rest: "3–5 min" },
      accessory: { sets: 3, reps: "6–10", rest: "2 min" },
    }),
    maxLifts: 5,
    superset: "never",
    // Pull A starts with the deadlift, so the week has all three lifts.
    mainSwap: { pullA: [B("Barbell deadlift"), E("Smith machine deadlift"), E("Dumbbell Romanian deadlift")] },
    cardio: (ctx) => (ctx.plan === "cut"
      ? [15, "15 min incline treadmill walk. Keep it easy so it doesn't cut into your lifting.", MET.inclineWalk]
      : [10, "10 min easy walk or bike. Light cardio still helps your heart and recovery.", MET.easyWalk]),
    notes: (ctx) => [
      "Warm up the main lift in steps: empty bar, then about 50%, 70% and 85% of your working weight.",
      "Stop each heavy set with 1–2 good reps left. Form breaking down means the set is over.",
      ...(ctx.gym === "pf" ? ["Planet Fitness style gyms don't have barbells for squats or deadlifts. For real powerlifting training, switch Gym to Anytime Fitness style in Settings."] : []),
    ],
  },

  marathon: {
    label: "Marathon runner",
    blurb: "Running comes first: easy runs, one speed day, one tempo day and a long run, with lifting twice a week to stay injury-free.",
    // Free weights and bodyweight train balance and each leg on its own.
    equipment: ["dumbbell", "other", "cable", "machine", "smith", "barbell"],
    sources: ["ACSM", "Runner's World", "the 80/20 easy-to-hard running guideline"],
    scheme: () => ({
      main: { sets: 3, reps: "6–8", rest: "2 min" },
      accessory: { sets: 2, reps: "10–12", rest: "60 sec" },
    }),
    maxLifts: 4,
    superset: "never",
    // Position in the training week (1 is the day after the rest day, so
    // Monday with Sunday off) to a run plus, on some days, lifting.
    runs: {
      1: { title: "Easy run + upper body", split: "pushA", run: (ctx) => easyRun(ctx, ctx.plan === "cut" ? 10 : 0) },
      2: { title: "Speed work", run: (ctx) => (ctx.window.budget < 6
        ? [30, "Intervals, 30 min: 8 min easy, then 5 × (2 min hard, 2 min easy), then 2 min easy.", MET.intervals]
        : [45, "Intervals, 45 min: 10 min easy, then 6 × (3 min hard, 2 min easy), then 5 min easy.", MET.intervals]) },
      3: { title: "Easy run + runner's legs", split: "runnerLegs", run: (ctx) => easyRun(ctx) },
      4: { title: "Tempo run + upper body", split: "pullA", run: (ctx) => (ctx.window.budget < 6
        ? [30, "Tempo run, 30 min: 8 min easy, 15 min comfortably hard, 7 min easy.", MET.tempo]
        : [40, "Tempo run, 40 min: 10 min easy, 20 min comfortably hard (a few words at a time), 10 min easy.", MET.tempo]) },
      5: { title: "Cross-train + core", split: "abs", run: () => [30, "30 min on the bike or elliptical, easy. It builds fitness without the pounding.", MET.easyMachine] },
      6: { title: "Long run", run: (ctx) => [90, `Long run, 60–150 min at an easy pace. Add no more than about 10% a week.${ctx.window.key === "late" || ctx.window.key === "evening" ? " Most runners do this one in the morning." : ""}`, MET.easyRun] },
    },
    cardio: () => [25, "Easy run, 20–30 min, at a pace you could talk at.", MET.easyRun],
    notes: (ctx) => [
      "About 80% of your running should be easy. Save the hard effort for speed and tempo days.",
      ...(ctx.split ? ["Run first, then lift, so the run gets your fresh legs."] : []),
      "Strength training twice a week improves running economy and helps prevent injury.",
    ],
    restTips: () => [
      "Eat enough carbs today to refuel from yesterday.",
      "Foam rolling your calves, hips and hamstrings after the stretches helps the legs recover.",
    ],
  },

  weightLoss: {
    label: "Weight loss",
    blurb: "More cardio and circuit-style lifting with short rests, following the HHS and ACSM weight-loss guidelines.",
    // Machines and cables are quick to set up between circuit exercises.
    equipment: ["machine", "cable", "dumbbell", "smith", "other", "barbell"],
    sources: ["HHS Physical Activity Guidelines for Americans", "American Heart Association", "ACSM position stand on weight loss", "LiveStrong"],
    scheme: () => ({
      main: { sets: 3, reps: "8–12", rest: "90 sec" },
      accessory: { sets: 3, reps: "12–15", rest: "30–45 sec" },
    }),
    superset: "always",
    cardio: (ctx) => (ctx.window.budget < 6
      ? [20, "20 min brisk incline walk or elliptical.", MET.moderateMachine]
      : [40, "35–45 min of moderate cardio: incline walk, elliptical or bike, hard enough that talking takes effort.", MET.moderateMachine]),
    notes: (ctx) => [
      "Guidelines call for 150–300 min of moderate cardio a week plus strength training twice. To lose weight, ACSM suggests working up to 200–300 min a week; this plan gets you there.",
      "Aim for 8,000–10,000 steps a day outside the gym too.",
      "Food does most of the work. Keep your calorie goal in CookBot.",
      ...(ctx.plan === "gain" ? ["Your aim is set to Gain. For weight loss, set Aim to Cut in Settings."] : []),
    ],
    restTips: () => [
      "Get 7–9 hours of sleep; short sleep makes hunger harder to manage.",
      "Food still does most of the work today. Keep your calorie goal in CookBot.",
    ],
  },

  glp1: {
    label: "GLP-1 medication (Mounjaro, Zepbound, Ozempic, Wegovy)",
    blurb: "Lifting comes first to keep muscle while the medication takes weight off, at a pace that respects lower appetite and side effects.",
    // Machines guide the movement, which is safer on a lightheaded day.
    equipment: ["machine", "smith", "cable", "dumbbell", "other", "barbell"],
    sources: [
      "2025 joint advisory on GLP-1 nutrition and lifestyle (ACLM, ASN, Obesity Medicine Association, The Obesity Society)",
      "HHS Physical Activity Guidelines for Americans",
      "American Heart Association",
      "Mounjaro and Ozempic prescribing information",
    ],
    scheme: () => ({
      main: { sets: 3, reps: "8–10", rest: "2 min" },
      accessory: { sets: 2, reps: "10–12", rest: "90 sec" },
    }),
    maxLifts: 5,
    superset: "never",
    cardio: (ctx) => (ctx.shotSoon
      ? [15, "Easy 15–20 min walk. Skip it if you feel sick.", MET.easyWalk]
      : [20, "20 min brisk walk or bike at a pace you can still talk at.", MET.briskWalk]),
    notes: (ctx) => [
      ...(ctx.shotSoon ? ["Shot day or the day after: nausea and low energy are most common now, so this is a lighter session. If you feel unwell, just walk."] : []),
      "Lifting is the priority. In the big trials, about a quarter to over a third of the weight lost on these drugs was lean mass; strength training helps keep it.",
      "Eat a small meal with protein 1–2 hours before. Don't train on an empty stomach, and hit your protein goal (CookBot tracks it).",
      "Drink water before and during. Nausea, vomiting and diarrhea can dehydrate you.",
      "If you feel dizzy, shaky or faint, stop and eat something. The risk of low blood sugar is higher if you also take insulin or a sulfonylurea.",
      "Not medical advice. Check with your prescriber before starting a new program, especially after a dose increase.",
    ],
    restTips: () => [
      "Keep up protein and water even on days you aren't hungry.",
    ],
  },
};
