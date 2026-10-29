import { dayKey, previousDay, nextReset } from "./day.js";
import { AIMS, GYMS, DAY_NAMES, TARGETS, TARGET_LABELS, TRAINERS, suggest, gymDay, timeWindow, caloriesBurned, sessionLimits, ROUTINE_CARDIO, ROUTINE_STRENGTH } from "./workouts.js";
import { celebrate, streak, level, unexpectedRests, unexpectedRestPrompt, weeklyBadges, trainingWeek, weekDays, CARDIO_GOAL, STRENGTH_DAYS } from "./celebrate.js";
import { restDayOn, isRestDate, planPosition, addDays, weekdayOf } from "./week.js";
import { backToBackRests, bodyPart, partName } from "./backtoback.js";
import { HEALING_AREAS, HEALING_KINDS, HEALING_DAYS, activeHealing, healingContext } from "./healing.js";
import { analyzeWeight, daysBetween, WEEK_DAYS } from "./weight.js";
import { healthNotes, mergeHealth } from "./health.js";

// Shown at the bottom of Settings, to check which version a phone is running.
const VERSION = "2026-10-30 · 12:00 PM";
const STORAGE_KEY = "gymbot";
// Locked-in days are kept about a year, for streaks.
const KEEP_DAYS = 400;
// Weight used for calories burned until one is entered.
const DEFAULT_WEIGHT_LB = 170;

const $ = (id) => document.getElementById(id);

// ---- Storage (everything lives in this browser's localStorage) ----

function load() {
  // locked: { "2026-10-23": { at, shuffle, swaps, mode, focus, done, active, burned } } for
  // every day the Lock in button was pressed. `at` keeps the workout picked
  // for the time it was locked in, even if the app is opened again later.
  // `focus` is a body part picked instead of the split, `done` the ids of
  // the items locked so far, `active` whether the workout screen is open
  // (until Lock out) and `burned` the calories from the locked items.
  // `swaps` counts taps on each exercise's "Taken?" swap, by position, and
  // `mode` is "cardio" or "strength" when an override limits the day.
  // `extra` holds the day's extra sessions, each { kind: "cardio" or
  // "strength", focus, at, swaps, done, ... } with the same per-session
  // fields as the day's plan, and `total` the sums across all of them.
  // (`shuffle` is from the old "Different exercises" button.)
  // focus: { day, target }, the body part picked on the options screen. It
  // only applies to that day; the next day starts back on the split.
  // trainer: a key of TRAINERS (the "AI Trainer" setting); shotDay: the
  // weekday of a weekly GLP-1 shot, or "".
  // restDay: the weekday off (Sunday is 0). restHistory: [{ from, day }],
  // every rest day there's been and the day it started (see week.js), so
  // changing it midweek doesn't rewrite the days already done. restAck: the
  // day "Lock in anyway" was tapped on the rest day, so the reminder shows
  // once.
  // autoRests: { day: body part }, days made unexpected rest days because
  // the same body part was planned the day before or after (see
  // backtoback.js). Kept so streaks skip them even if the app isn't opened.
  // healing: { area, kind, since }, a new tattoo or minor injury the plan
  // works around for 14 days from `since` (see healing.js), or null.
  // weightLb: for calories burned and the protein target, or null.
  // heightIn: for the protein target, or null.
  // routine: "User selected", { cardio, minutes, strength }, and useRoutine
  // whether it's the plan (until Default is picked). A lock's `routine` is
  // the routine it was locked in with.
  // apiKey: the person's Anthropic API key, for Ask the trainer. chat: today's
  // questions, { day, history, shown: [{ q, a }], context }, where history is
  // the conversation as sent to the API and context the last workout
  // description sent with a question.
  // weighIns: [{ day, lb }] from Lock-In Weight, one a day, oldest first.
  // weightStart: { day, lb } the latest weigh-in is compared with: the one
  // before it, or the weight from Settings before the first. weightSetDay:
  // the day the weight in Settings was last changed.
  // achievements: { completeDays, fullWeeks, weeks: [week ids], weekly:
  // { week id: [weekly goals celebrated] } }, the totals
  // behind the milestones (see celebrate.js). A lock's `complete` says every
  // item that day is locked, `celebrated` that the celebration was shown.
  const defaults = {
    aim: "maintain", gym: "pf", trainer: "none", shotDay: "", restDay: 0, restHistory: null, restAck: null, healing: null, autoRests: {}, weightLb: null,
    locked: {}, focus: null, apiKey: "", chat: null, achievements: { completeDays: 0, fullWeeks: 0, weeks: [] },
    weighIns: [], weightStart: null, weightSetDay: null, heightIn: null, routine: null, useRoutine: false,
  };
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data) return { ...defaults, ...data };
  } catch {}
  return defaults;
}

function save() {
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  for (const [day, lock] of Object.entries(state.locked)) if (lock.at < cutoff) delete state.locked[day];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const state = load();

// Locks saved before the checklist held exercise numbers; they're item ids now.
for (const lock of Object.values(state.locked)) lock.done = (lock.done ?? []).map((id) => (typeof id === "number" ? `ex${id}` : id));

// A day key at a time of day (10am unless given), as a Date.
const dateOfKey = (key, hour = 10, minute = 0) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, hour, minute);
};

// A starting weight from Settings entered the same day as the first
// weigh-in used to win over the scale; the weigh-in is the start.
{
  const first = state.weighIns[0];
  if (first && state.weightStart?.day === first.day && state.weightStart.lb !== first.lb) state.weightStart = { ...first };
}

// Before the day ended at midnight it ended at 3am, so a session started
// after midnight was saved under the day before with the next day's time.
// Those become late-night sessions at the end of their own day.
for (const [key, lock] of Object.entries(state.locked)) {
  if (lock.at && dayKey(new Date(lock.at)) !== key) lock.at = dateOfKey(key, 23, 30).getTime();
}

// Body weight for calories, from Settings (or the latest weigh-in).
function weight() {
  if (state.weightLb > 0) return { lb: state.weightLb, from: "settings" };
  return { lb: DEFAULT_WEIGHT_LB, from: "default" };
}

// Height in inches from Settings, or null.
const height = () => (state.heightIn > 0 ? state.heightIn : null);

// ---- Shared ----

// The body part picked for today, or null for today's split.
const todaysTarget = () => (state.focus?.day === dayKey() && TARGETS[state.focus.target] ? state.focus.target : null);

// The workout for `date` with the current settings.
const workout = (date, target, shuffle = 0, swaps = {}, mode = null, extra = false, routine = null) =>
  suggest({ date, aim: state.aim, gym: state.gym, trainer: state.trainer, shotDay: state.shotDay, restDay: restDayOn(rests(), dayKey(date)), position: planPosition(dayKey(date), rests()), healing: activeHealing(state.healing, dayKey(date)), target, shuffle, swaps, mode, extra, routine });

// The rest day and its history, for week.js.
const rests = () => (state.restHistory?.length ? state.restHistory : Number(state.restDay));

// My routine, while it's the plan.
const activeRoutine = () => (state.useRoutine && state.routine ? state.routine : null);

// An earlier day of this week opened from the week strip for editing, or
// null for today. The workout screen works on currentDay().
let viewDay = null;
const currentDay = () => viewDay ?? dayKey();
// The session on screen: 0 for the day's plan, 1 and up for extra sessions.
let viewSession = 0;

// The locked-in workout for the day on screen, or null.
// `lock` is the session on screen (the day itself for the plan) and `day`
// the day.
function lockedWorkout() {
  const day = state.locked[currentDay()];
  if (!day) return null;
  // The day comes from the key, the time of day from `at`; a time that isn't
  // on that day falls back to 10am (6pm for extra sessions).
  const timeOf = (lock, hour) => (lock.at && dayKey(new Date(lock.at)) === currentDay() ? new Date(lock.at) : dateOfKey(currentDay(), hour));
  const session = viewSession > 0 ? day.extra?.[viewSession - 1] : null;
  if (!session) {
    viewSession = 0;
    return { lock: day, day, w: workout(timeOf(day, 10), day.focus, day.shuffle, day.swaps, day.mode, false, day.routine) };
  }
  return { lock: session, day, w: workout(timeOf(session, 18), session.focus, 0, session.swaps, session.kind === "cardio" ? "cardio" : "strength", true) };
}

// A day's totals across its plan and extra sessions, for the week strip and
// weekly goals.
function updateTotals(day) {
  const sessions = [day, ...(day.extra ?? [])];
  day.total = {
    burned: sessions.reduce((sum, s) => sum + (s.burned ?? 0), 0),
    cardioMin: sessions.reduce((sum, s) => sum + (s.cardioMin ?? 0), 0),
    gym: sessions.some((s) => s.gym),
    strength: sessions.some((s) => s.strength),
  };
}

// Short trainer names for the chip on the options screen.
const TRAINER_CHIPS = { ppl: "PPL", bodybuilder: "Bodybuilder", powerlifter: "Powerlifter", marathon: "Marathon", weightLoss: "Weight loss", glp1: "GLP-1" };

// The split's "Pull A" style names stay out of sight. A split day shows what
// it trains ("Back and biceps") with its emphasis ("Back width first") as the
// detail; a body part picked under Focus shows as "Back (selected)".
const isSplitDay = (w) => /^(Push|Pull|Legs) [AB]$/.test(w.title);

function displayName(w) {
  if (w.routine) return w.title;
  if (w.extra) return w.mode === "cardio" ? "Cardio session" : `${TARGET_LABELS[w.target] ?? "Strength"} session`;
  if (w.mode === "cardio") return "Cardio only";
  if (w.target) return `${TARGET_LABELS[w.target]} (selected)`;
  return isSplitDay(w) ? w.focus.replace(/ \(.*\)$/, "") : w.title;
}

function displayDetail(w) {
  if (w.routine) return w.focus;
  if (w.extra) return "Extra session";
  if (w.mode === "cardio") return "Override";
  const emphasis = isSplitDay(w) ? w.focus.match(/\((.*)\)$/)?.[1] : w.focus;
  const detail = emphasis ? emphasis[0].toUpperCase() + emphasis.slice(1) : "";
  return w.mode === "strength" ? [detail, "Strength only"].filter(Boolean).join(" · ") : detail;
}

// "See example": a YouTube search for the exercise done with good form. It
// opens in the YouTube app on phones that have it.
function exampleLink(name) {
  const link = document.createElement("a");
  link.className = "example";
  link.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(`how to do ${name} proper form`)}`;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "▶ See example";
  // Following the link shouldn't also lock the exercise.
  link.addEventListener("click", (event) => event.stopPropagation());
  return link;
}

// A padlock, open or shut.
function lockIcon(locked) {
  const shackle = locked ? "M8 11V7a4 4 0 0 1 8 0v4" : "M8 11V7a4 4 0 0 1 7.6-1.8";
  return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="${shackle}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><rect x="5" y="11" width="14" height="10" rx="2.5" fill="currentColor"/></svg>`;
}

// "options", "workout" or "rest".
function showScreen(name) {
  $("options-screen").hidden = name !== "options";
  $("workout-screen").hidden = name !== "workout";
  $("rest-screen").hidden = name !== "rest";
  $("open-ask").hidden = name !== "workout" || Boolean(viewDay);
}

// ---- Back-to-back body parts ----

// What a day's lifting trains, for spotting the same body part two days
// running; null without lifting.
const liftedPart = (w) => (!w.rest && w.items.some((item) => item.kind === "lift") ? bodyPart(w.split ?? w.target) : null);

// This week's days made rest days for back-to-back body parts, from what
// was done on earlier days and what's planned from today on. Today and
// later are worked out fresh each time; earlier days keep theirs.
function updateAutoRests() {
  const today = dayKey();
  const schedule = rests();
  const keys = weekDays(today, schedule);
  const days = keys.map((key) => {
    if (isRestDate(schedule, key)) return { key, rest: true };
    const lock = state.locked[key];
    const date = dateOfKey(key, 17);
    if (lock?.mode === "rest") return { key, rest: true, fixed: true };
    if (lock) return { key, part: liftedPart(workout(date, lock.focus, lock.shuffle, lock.swaps, lock.mode, false, lock.routine)), fixed: true };
    if (key < today) return { key, part: null, fixed: true };
    const target = key === today ? todaysTarget() : null;
    return { key, part: liftedPart(workout(date, target, 0, {}, null, false, target ? null : activeRoutine())), fixed: Boolean(target) };
  });
  const autoRests = Object.fromEntries(Object.entries(state.autoRests ?? {}).filter(([key]) => key < today));
  for (const { key, part } of backToBackRests(days, today)) autoRests[key] = part;
  // A day already made a rest day stays one.
  for (const key of keys) if (key >= today && state.locked[key]?.autoRest && state.locked[key].mode === "rest") autoRests[key] ??= state.locked[key].autoRest;
  if (JSON.stringify(autoRests) === JSON.stringify(state.autoRests)) return;
  state.autoRests = autoRests;
  save();
}

// Why today is an automatic rest day, or null.
function autoRestReason(key = dayKey()) {
  const part = state.autoRests?.[key];
  return part ? `two ${partName(part)} days in a row` : null;
}

// ---- Options screen ----

// The week strip: this plan week, from the day after the rest day through
// the rest day. Earlier days can be tapped to open and edit them. Returns
// the week's workout count and calories.
function renderWeekStrip(container) {
  const today = dayKey();
  const restDay = rests();
  let workouts = 0;
  let burned = 0;
  container.replaceChildren(...weekDays(today, restDay).map((key) => {
    const lock = state.locked[key];
    const [y, m, d] = key.split("-").map(Number);
    const weekday = new Date(y, m - 1, d, 12).getDay();
    const li = document.createElement("li");
    li.append(DAY_NAMES[weekday].slice(0, 3));
    const mark = document.createElement("span");
    mark.className = "mark";
    if (lock?.unexpectedRest && lock.mode === "rest") mark.textContent = "💤";
    else if (lock?.total?.burned ?? lock?.burned) mark.textContent = lock.total?.burned ?? lock.burned;
    else mark.textContent = lock?.done?.length ? "✓" : isRestDate(restDay, key) ? "–" : state.autoRests?.[key] && key >= today ? "💤" : "";
    li.append(mark);
    li.classList.toggle("today", key === today);
    li.classList.toggle("done", Boolean(lock?.done?.length));
    if (key < today) {
      li.classList.add("editable");
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      li.setAttribute("aria-label", `Edit ${DAY_NAMES[weekday]}`);
      li.addEventListener("click", () => openDay(key));
      li.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") openDay(key); });
    } else if (key > today) {
      // Upcoming days stay closed: GymBot is for today, in the gym.
      li.classList.add("upcoming");
      li.addEventListener("click", () => toast(UPCOMING_LINES[weekday % UPCOMING_LINES.length]));
    }
    if (lock?.done?.length) workouts++;
    burned += lock?.total?.burned ?? lock?.burned ?? 0;
    return li;
  }));
  return { workouts, burned };
}

const UPCOMING_LINES = [
  "One key at a time. Turn today's key in the lock before you open tomorrow's door.",
  "That door's still locked. Today's lock is the only one that matters right now.",
];

// A short message at the bottom of the screen that fades on its own.
let toastTimer = null;
function toast(text) {
  const el = $("toast");
  el.textContent = text;
  el.hidden = false;
  el.classList.remove("fade");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.add("fade");
    toastTimer = setTimeout(() => { el.hidden = true; }, 400);
  }, 3500);
}

// Open an earlier day of this week on the workout screen. A day that was
// never locked in gets its plan as of 10am that day.
function openDay(key) {
  const routine = activeRoutine();
  state.locked[key] ??= { at: dateOfKey(key).getTime(), focus: null, routine: routine ? { ...routine } : null, shuffle: 0, swaps: {}, done: [], burned: 0, active: false };
  viewDay = key;
  viewSession = 0;
  save();
  render();
  window.scrollTo({ top: 0 });
}

function segmented(container, entries, current, choose) {
  container.replaceChildren(...entries.map(([value, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.setAttribute("aria-pressed", String(value === current));
    button.addEventListener("click", () => choose(value));
    return button;
  }));
}

function renderOptions() {
  const now = new Date();
  const window = timeWindow(now);
  $("now-day").textContent = DAY_NAMES[gymDay(now)];
  const clock = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  $("now-time").textContent = state.gym === "outdoor" ? `${window.label} · ${clock}` : `${window.label} · ${clock} · gym is usually ${window.crowd}`;
  const aim = AIMS[state.aim]?.label ?? "Maintain";
  const coach = TRAINER_CHIPS[state.trainer];
  $("aim-chip").textContent = coach ? `${aim} · ${coach}` : aim;

  const target = todaysTarget();
  const today = workout(now, target, 0, {}, null, false, activeRoutine());
  const todayLock = state.locked[dayKey(now)];
  const auto = !todayLock && !target ? autoRestReason() : null;
  $("now-split").textContent = auto
    ? `Today: unexpected rest day · ${auto}`
    : todayLock?.unexpectedRest && todayLock.mode === "rest"
    ? `Today: unexpected rest day${target ? ` (${TARGET_LABELS[target]} if you work out anyway)` : ""}`
    : today.rest
    ? "Today: rest day · stretching only"
    : `Today: ${displayName(today)}${today.healingChange === "swapped" || today.healingChange === "trimmed" ? ` · around your ${HEALING_AREAS[activeHealing(state.healing, dayKey()).area].toLowerCase()}` : ""}`;

  // Default and My routine last until changed; a body part is for today.
  const focusChoices = [[null, "Default"], ["routine", "User selected"], ...Object.entries(TARGET_LABELS)];
  segmented($("focus"), focusChoices, target ?? (activeRoutine() ? "routine" : null), (value) => {
    if (value === "routine" && !state.routine) {
      openRoutine();
      return;
    }
    if (value === null || value === "routine") state.useRoutine = value === "routine";
    state.focus = value && value !== "routine" ? { day: dayKey(), target: value } : null;
    save();
    renderOptions();
  });
  $("edit-routine").hidden = !activeRoutine();

  segmented($("aim-choices"), Object.entries(AIMS).map(([value, { label }]) => [value, label]), state.aim, (value) => {
    state.aim = value;
    save();
    renderOptions();
  });
  $("aim-blurb").textContent = AIMS[state.aim]?.blurb ?? "";

  $("trainer-input").value = TRAINERS[state.trainer] ? state.trainer : "none";
  $("trainer-blurb").textContent = TRAINERS[state.trainer]?.blurb ?? "";
  $("shot-field").hidden = state.trainer !== "glp1";
  $("shot-input").value = state.shotDay;

  // "Planet Fitness style (Smith machines, ...)": the name on the button,
  // the part in parentheses under it.
  segmented($("gym-choices"), Object.keys(GYMS).map((key) => [key, GYMS[key].label.split(" (")[0].replace(/ style$/, "")]), state.gym, (value) => {
    state.gym = value;
    save();
    renderOptions();
  });
  $("gym-blurb").textContent = (GYMS[state.gym] ?? GYMS.pf).label.split(" (")[1]?.replace(/\)$/, "") ?? "";

  const todayKey = dayKey(now);
  const { workouts, burned } = renderWeekStrip($("week"));
  $("week-total").textContent = workouts
    ? `${workouts} ${workouts === 1 ? "workout" : "workouts"} · ${burned.toLocaleString()} cal burned this week`
    : "Nothing locked yet this week.";
  // Progress toward the weekly guideline goals.
  const { stats } = weeklyBadges({ locked: state.locked, today: todayKey, restDay: rests() });
  const tick = (ok) => (ok ? " ✓" : "");
  $("week-goals").textContent = `${stats.gymDays} ${state.gym === "outdoor" ? "workout" : "gym"} ${stats.gymDays === 1 ? "day" : "days"} · ${Math.min(stats.cardioMinutes, 999)} of ${CARDIO_GOAL} cardio min${tick(stats.cardioMinutes >= CARDIO_GOAL)} · strength ${Math.min(stats.strengthDays, STRENGTH_DAYS)} of ${STRENGTH_DAYS} days${tick(stats.strengthDays >= STRENGTH_DAYS)}`;
  const run = streak(state.locked, todayKey, rests(), state.autoRests);
  const rank = level(state.achievements.fullWeeks);
  $("streak-line").textContent = [run >= 2 ? `🔥 ${run}-day streak` : null, rank ? `🏆 ${rank}` : null].filter(Boolean).join(" · ");

  renderWeight();

  const lock = state.locked[todayKey];
  $("lock-in-label").textContent = lock?.unexpectedRest && lock.mode === "rest" ? "Back to my rest day" : lock?.done?.length ? "Lock back in" : "Lock in";
  // Unexpected rest days are for training days.
  $("rest-link").hidden = Boolean(lock?.unexpectedRest) || isRestDate(rests(), dayKey(now)) || Boolean(!lock && !todaysTarget() && autoRestReason());
}

// ---- My routine ----

function openRoutine() {
  const outdoor = state.gym === "outdoor";
  const cardio = $("routine-cardio");
  cardio.replaceChildren(...Object.entries(ROUTINE_CARDIO)
    .filter(([, c]) => c.place === "both" || c.place === (outdoor ? "outdoor" : "gym"))
    .map(([key, c]) => new Option(c.label, key)));
  const r = state.routine ?? { cardio: outdoor ? "walk" : "12-3-30", minutes: 45, strength: "rotate" };
  cardio.value = r.cardio;
  if (!cardio.value) cardio.selectedIndex = 0;
  $("routine-minutes").value = String(r.minutes);
  $("routine-strength").value = r.strength;
  $("routine-dialog").showModal();
}

for (const [key, label] of Object.entries(ROUTINE_STRENGTH)) $("routine-strength").add(new Option(label, key));
$("edit-routine").addEventListener("click", openRoutine);

$("routine-dialog").addEventListener("close", () => {
  if ($("routine-dialog").returnValue !== "save") return;
  state.routine = { cardio: $("routine-cardio").value, minutes: Number($("routine-minutes").value), strength: $("routine-strength").value };
  state.useRoutine = true;
  state.focus = null;
  save();
  renderOptions();
});

// ---- Lock-In Weight ----

const shortDate = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { month: "short", day: "numeric" });
};

function renderWeight() {
  const latest = state.weighIns.at(-1) ?? null;
  const start = state.weightStart;
  const sinceLast = latest ? daysBetween(latest.day, dayKey()) : WEEK_DAYS;
  $("weigh-input").placeholder = latest?.day === dayKey() ? `Logged ${latest.lb} lb today`
    : sinceLast < WEEK_DAYS ? `Next weigh-in in ${WEEK_DAYS - sinceLast} ${WEEK_DAYS - sinceLast === 1 ? "day" : "days"}`
    : "Today's weight (lb)";
  if (!start || !latest) {
    $("weigh-summary").textContent = "Log your weight about once a week, at the same time of day. Each weigh-in is compared with the one before it.";
    $("weigh-verdict").hidden = true;
    return;
  }
  const result = start.day === latest.day ? null : analyzeWeight({ start, latest, aim: state.aim, trainer: state.trainer });
  const days = daysBetween(start.day, latest.day);
  const weeks = Math.round(days / 7);
  const span = days < 7 ? (days ? ` in ${days} ${days === 1 ? "day" : "days"}` : "") : ` in ${weeks} ${weeks === 1 ? "week" : "weeks"}`;
  const change = latest.lb - start.lb;
  const moved = change === 0 ? "no change" : `${change < 0 ? "down" : "up"} ${Math.abs(change).toFixed(1)} lb`;
  $("weigh-summary").textContent = start.day === latest.day
    ? `Starting at ${latest.lb} lb on ${shortDate(latest.day)}. Log again next week to see how it's moving.`
    : `${state.weighIns.some((w) => w.day === start.day && w.lb === start.lb) ? "Last weigh-in" : "Started at"} ${start.lb} lb on ${shortDate(start.day)} · now ${latest.lb} lb · ${moved}${span}`;
  $("weigh-verdict").hidden = !result;
  if (!result) return;
  $("weigh-verdict").dataset.tone = result.tone;
  $("weigh-label").textContent = result.label;
  $("weigh-headline").textContent = result.headline;
  $("weigh-detail").textContent = result.detail;
}

// The last weigh-in from before today.
const previousWeighIn = () => state.weighIns.filter((w) => w.day !== dayKey()).at(-1);

// A weight typed in, waiting on "Lock weight anyway".
let pendingLb = null;

$("weigh-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const lb = Math.round(Number($("weigh-input").value) * 10) / 10;
  if (!(lb >= 50 && lb <= 700)) return;
  // Weighing in daily mostly shows water, so less than a week after the
  // last weigh-in GymBot suggests waiting. Fixing today's number doesn't ask.
  const previous = previousWeighIn();
  const fixingToday = state.weighIns.at(-1)?.day === dayKey();
  const days = previous ? daysBetween(previous.day, dayKey()) : WEEK_DAYS;
  if (days < WEEK_DAYS && !fixingToday) {
    const wait = WEEK_DAYS - days;
    const [y, m, d] = previous.day.split("-").map(Number);
    const when = new Date(y, m - 1, d + WEEK_DAYS).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
    pendingLb = lb;
    $("weigh-wait-text").textContent = `No need to call the locksmith yet. Your last weigh-in was ${days === 1 ? "yesterday" : `${days} days ago`}; weigh in again in ${wait} ${wait === 1 ? "day" : "days"} (${when}) to see the real trend.`;
    $("weigh-wait").hidden = false;
    return;
  }
  logWeight(lb);
});

$("weigh-anyway").addEventListener("click", () => {
  if (pendingLb !== null) logWeight(pendingLb);
});

$("weigh-wait-ok").addEventListener("click", () => {
  pendingLb = null;
  $("weigh-wait").hidden = true;
  $("weigh-input").value = "";
});

function logWeight(lb) {
  pendingLb = null;
  $("weigh-wait").hidden = true;
  const today = dayKey();
  // Compare with the last weigh-in from an earlier day (so fixing today's
  // number keeps the comparison). Before there is one, with the weight from
  // Settings if it was entered on an earlier day; a weight from Settings
  // entered today gives way to the scale, so this weigh-in is the start.
  const previous = previousWeighIn();
  if (previous) state.weightStart = { ...previous };
  else if (state.weightStart?.day < today) {
    // Keep the earlier weight from Settings.
  } else if (!state.weighIns.length && state.weightLb > 0 && state.weightSetDay < today) {
    state.weightStart = { day: state.weightSetDay, lb: state.weightLb };
  } else {
    state.weightStart = { day: today, lb };
  }
  state.weighIns = [...state.weighIns.filter((w) => w.day !== today), { day: today, lb }].slice(-400);
  // The latest weight is also what calories burned use.
  state.weightLb = lb;
  $("weigh-input").value = "";
  save();
  renderOptions();
}

// Settings on the options screen save as soon as they change.
for (const [value, { label }] of Object.entries(TRAINERS)) $("trainer-input").add(new Option(label, value));
$("trainer-input").addEventListener("change", () => {
  state.trainer = $("trainer-input").value;
  save();
  renderOptions();
});
$("shot-input").addEventListener("change", () => {
  state.shotDay = $("shot-input").value;
  save();
});

$("lock-in").addEventListener("click", () => {
  // Locking back in later the same day keeps what's already locked, unless
  // the focus changed. The time of day is updated either way.
  const today = dayKey();
  const previous = state.locked[today];
  const focus = todaysTarget();
  const routine = focus ? null : activeRoutine();
  // A body part picked for the day under User selected stays too.
  const { part, ...previousRoutine } = previous?.routine ?? {};
  const same = previous && (previous.focus ?? null) === focus && JSON.stringify(previous.routine ? previousRoutine : null) === JSON.stringify(routine);
  // An unexpected rest day stays one whatever the focus: "Back to my rest
  // day" goes back to it, and a focus picked meanwhile waits for "Work out
  // anyway".
  const resting = previous?.unexpectedRest && previous.mode === "rest";
  // Back-to-back body parts: today rests, unless a body part was picked.
  const autoRest = !previous && !focus ? state.autoRests?.[today] ?? null : null;
  state.locked[today] = {
    at: Date.now(),
    focus,
    shuffle: same ? previous.shuffle ?? 0 : 0,
    mode: resting || autoRest ? "rest" : same ? previous.mode ?? null : null,
    routine: routine ? { ...routine, ...(same && part ? { part } : {}) } : null,
    extra: previous?.extra ?? [],
    total: previous?.total,
    celebrated: same ? previous.celebrated ?? false : false,
    unexpectedRest: previous?.unexpectedRest ?? Boolean(autoRest),
    ...(autoRest || previous?.autoRest ? { autoRest: autoRest ?? previous.autoRest } : {}),
    streakBreak: previous?.streakBreak ?? false,
    swaps: same ? previous.swaps ?? {} : {},
    done: same ? previous.done ?? [] : [],
    active: true,
    burned: 0,
  };
  save();
  render();
  window.scrollTo({ top: 0 });
});

// User selected: the day's body part, from a drop-down under the title.
// The routine's turn is first and marked; picking it again clears the pick.
function renderRoutinePart(lock, w) {
  const select = $("routine-part");
  $("routine-part-row").hidden = !(w.routine && lock.routine);
  if (!w.routine || !lock.routine) return;
  const label = (key) => (key === "none" ? "Just the cardio" : TARGET_LABELS[key]);
  const keys = [w.turn, ...[...Object.keys(TARGET_LABELS), "none"].filter((key) => key !== w.turn)];
  select.replaceChildren(...keys.map((key) => new Option(key === w.turn ? `${label(key)} (today's turn)` : label(key), key)));
  select.value = w.part;
}

$("routine-part").addEventListener("change", () => {
  const today = lockedWorkout();
  if (!today?.lock.routine) return;
  const { lock, w } = today;
  const part = $("routine-part").value;
  lock.routine = { ...lock.routine };
  if (part === w.turn) delete lock.routine.part;
  else lock.routine.part = part;
  lock.swaps = {};
  save();
  render();
});

// ---- Rest-day screen ----

// One per rest day, in turn.
const REST_QUOTES = [
  ["Take rest; a field that has rested gives a bountiful crop.", "Ovid"],
  ["Rest is not idleness, and to lie sometimes on the grass under trees on a summer's day, listening to the murmur of the water, or watching the clouds float across the sky, is by no means a waste of time.", "John Lubbock"],
  ["Almost everything will work again if you unplug it for a few minutes, including you.", "Anne Lamott"],
  ["Muscles are torn in the gym, fed in the kitchen and built in bed.", "Gym saying"],
];

function renderRest() {
  const now = new Date();
  $("rest-day").textContent = DAY_NAMES[gymDay(now)];
  const weeks = Math.floor(new Date(dayKey(now)).getTime() / (7 * 24 * 60 * 60 * 1000));
  const [quote, who] = REST_QUOTES[weeks % REST_QUOTES.length];
  $("rest-quote").textContent = `“${quote}”`;
  $("rest-cite").textContent = `— ${who}`;
  renderWeekStrip($("rest-week"));
}

$("rest-exit").addEventListener("click", () => {
  // Pages can only close themselves in some browsers; otherwise say goodbye.
  window.close();
  $("rest-bye").hidden = false;
});

$("rest-anyway").addEventListener("click", () => {
  state.restAck = dayKey();
  save();
  render();
});

// ---- Workout screen ----

function renderWorkout() {
  const today = lockedWorkout();
  if (!today) return;
  const { lock, day, w } = today;

  $("plan-title").textContent = w.rest ? w.title : displayName(w);
  const autoFocus = w.rest && lock.autoRest && lock.mode === "rest" ? `Planned: ${autoRestReason(currentDay()) ?? `two ${partName(lock.autoRest)} days in a row`}, so this one rests.` : null;
  $("plan-focus").textContent = autoFocus ?? (w.rest ? w.focus : [`${w.day} ${w.window.label.toLowerCase()}`, displayDetail(w)].filter(Boolean).join(" · "));
  $("plan-minutes").textContent = `~${w.minutes} min`;
  renderRoutinePart(lock, w);

  const notes = w.notes;
  // The trainer's own notes, then everyday protein, water and sleep.
  const known = weight();
  const health = mergeHealth(w.health ?? [], healthNotes({ weightLb: known.from === "default" ? null : known.lb, heightIn: height(), aim: w.aim }), 5);
  $("health").hidden = !health.length;
  $("health-summary").textContent = `Food & health (${health.length})`;
  $("health-notes").replaceChildren(...health.map((text) => Object.assign(document.createElement("li"), { textContent: text })));
  $("tips").hidden = !notes.length && !w.sources.length;
  $("tips-summary").textContent = `Tips for this session (${notes.length})`;
  $("plan-notes").replaceChildren(...notes.map((text) => Object.assign(document.createElement("li"), { textContent: text })));
  $("plan-sources").hidden = !w.sources.length;
  $("plan-sources").textContent = `Trainer: ${TRAINERS[w.trainer].label}. Based on ${w.sources.join(", ")}.`;

  // Only ids in today's checklist count; a changed workout drops the rest.
  const ids = new Set(w.items.map((item) => item.id));
  const done = new Set(lock.done.filter((id) => ids.has(id)));
  const { lb, from } = weight();
  lock.burned = caloriesBurned(w.items, [...done], lb);
  // A day with nothing to lock (an unexpected rest day) isn't "complete".
  lock.complete = w.items.length > 0 && done.size === w.items.length;
  lock.rest = w.rest;
  // For the weekly goals: a gym day is anything locked past the warm-up;
  // cardio minutes count warm-ups, cardio and runs, vigorous ones (6 METs
  // and up, like running) double.
  const locked = w.items.filter((item) => done.has(item.id));
  lock.gym = !w.rest && locked.some((item) => item.kind !== "warmup");
  lock.strength = locked.some((item) => item.kind === "lift");
  lock.cardioMin = w.rest ? 0 : Math.round(locked.filter((item) => ["warmup", "cardio", "run"].includes(item.kind)).reduce((sum, item) => sum + item.minutes * (item.met >= 6 ? 2 : 1), 0));
  updateTotals(day);
  save();
  renderSessions(day, w);

  $("locked-count").textContent = `${done.size} of ${w.items.length} locked`;
  $("burned").textContent = `🔥 ${lock.burned.toLocaleString()} cal burned`;
  $("bar-fill").style.width = w.items.length ? `${(done.size / w.items.length) * 100}%` : "0";
  const nothingToLock = w.items.length === 0;
  $("progress").hidden = nothingToLock;
  $("rest-up").hidden = !nothingToLock;
  $("lock-hint").hidden = nothingToLock;
  $("plan-minutes").hidden = nothingToLock;
  $("burned-note").textContent = from === "default"
    ? `Estimated for ${DEFAULT_WEIGHT_LB} lb. Add your weight in Settings for a better number.`
    : `Estimated for ${lb} lb.`;

  const list = $("items");
  list.replaceChildren();
  let lifts = 0;
  for (const item of w.items) {
    const locked = done.has(item.id);
    const li = document.createElement("li");
    li.className = `item ${item.kind}`;
    li.classList.toggle("locked", locked);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "lock-btn";
    toggle.innerHTML = lockIcon(locked);
    toggle.setAttribute("aria-pressed", String(locked));
    toggle.setAttribute("aria-label", `${locked ? "Unlock" : "Lock"} ${item.name}`);

    const body = document.createElement("div");
    body.className = "item-body";
    const head = document.createElement("div");
    head.className = "item-head";
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = item.name;
    head.append(name);
    if (item.kind === "lift") {
      const scheme = document.createElement("span");
      scheme.className = "scheme";
      scheme.textContent = `${item.sets} × ${item.reps}`;
      head.append(scheme);
    }
    body.append(head);

    const detail = document.createElement("div");
    detail.className = "detail";
    if (item.kind === "lift") {
      lifts++;
      // Supersets number each pair: 2A, 2B, 3A, 3B...
      const pair = w.superset && !item.main && item.superset ? `Superset ${Math.floor((lifts - 2) / 2) + 2}${item.superset}` : null;
      const rest = item.superset === "A" ? "no rest, go straight to B" : `rest ${item.rest}`;
      detail.textContent = [item.main ? "Main lift" : pair, rest].filter(Boolean).join(" · ");
      if (item.alternative) {
        // Tapping the alternative swaps it in; the next tap moves on to the
        // exercise's third choice, if it has one.
        const swap = document.createElement("button");
        swap.type = "button";
        swap.className = "link-btn swap";
        swap.textContent = `${item.alternative} ⇄`;
        swap.setAttribute("aria-label", `Swap to ${item.alternative}`);
        swap.addEventListener("click", (event) => {
          event.stopPropagation();
          const position = Number(item.id.slice(2));
          lock.swaps = { ...lock.swaps, [position]: (lock.swaps?.[position] ?? 0) + 1 };
          // The new exercise hasn't been done yet.
          lock.done = lock.done.filter((id) => id !== item.id);
          renderWorkout();
        });
        // Nothing's ever taken at the park.
        detail.append(state.gym === "outdoor" ? " · Swap: " : " · Taken? ", swap);
      }
      detail.append(" ", exampleLink(item.name));
    } else {
      detail.textContent = item.text ?? "";
      if (item.kind === "stretch") detail.append(" ", exampleLink(item.name));
    }
    if (detail.textContent) body.append(detail);

    li.append(toggle, body);
    li.addEventListener("click", () => {
      if (done.has(item.id)) done.delete(item.id); else done.add(item.id);
      // Keep locks from other versions of today (the workout behind an
      // override or a rest day), so they're back if it is.
      lock.done = [...lock.done.filter((id) => !ids.has(id)), ...done];
      renderWorkout();
      // Weekly goals reached by this lock, then the day itself if it's done.
      const today = currentDay();
      const week = trainingWeek(today, rests()).id;
      state.achievements.weekly ??= {};
      // Rest-day stretching doesn't move the weekly goals, so it doesn't check.
      const weekly = w.rest ? { badges: [], awarded: state.achievements.weekly[week] ?? [] }
        : weeklyBadges({ locked: state.locked, today, restDay: rests(), awarded: state.achievements.weekly[week], outdoor: state.gym === "outdoor" });
      state.achievements.weekly[week] = weekly.awarded;
      save();
      if (lock.complete && !lock.celebrated && lock === day) celebrateToday(lock, weekly.badges);
      else if (lock.complete && !lock.celebrated) {
        // An extra session gets its own, smaller celebration.
        lock.celebrated = true;
        save();
        showCelebration({ title: "Session locked in!", line: "Extra work, extra credit.", badges: weekly.badges }, lock.burned);
      } else if (weekly.badges.length) showCelebration({ title: "Weekly goal hit!", line: "Keep locking in.", badges: weekly.badges }, 0);
    });
    list.append(li);
  }
  // The scheduled rest day has no overrides: training on it takes picking a
  // body part. An unexpected rest day only offers working out anyway, which
  // stays open all day.
  const restOverride = lock.mode === "rest";
  // Extra sessions are already cardio or strength; they can only be removed.
  $("remove-session").hidden = lock === day;
  $("overrides").hidden = lock !== day || (w.rest && !restOverride);
  $("cardio-only").hidden = restOverride;
  $("strength-only").hidden = restOverride;
  for (const [id, mode, label] of [["cardio-only", "cardio", "Cardio only override"], ["strength-only", "strength", "Strength training only override"]]) {
    const on = lock.mode === mode;
    $(id).setAttribute("aria-pressed", String(on));
    $(id).textContent = on ? `${label} on · tap for the full plan` : label;
  }
  $("rest-override").setAttribute("aria-pressed", "false");
  $("rest-override").textContent = restOverride ? (lock.autoRest ? "Work out anyway" : "Feeling better? Work out anyway") : lock.unexpectedRest ? "Back to my rest day" : "Unexpected rest day override";
}

// ---- Sessions ----

const HERCULES = "Don't break the lock: even Hercules needed a rest. That's the most sessions recommended for one day.";

// Sessions used today by kind: the plan counts as strength, or as cardio
// under the cardio-only override.
function sessionCounts(day) {
  const counts = { strength: 0, cardio: 0, total: 0 };
  for (const kind of [day.mode === "cardio" ? "cardio" : "strength", ...(day.extra ?? []).map((s) => s.kind)]) {
    counts[kind]++;
    counts.total++;
  }
  return counts;
}

function renderSessions(day, w) {
  const extras = day.extra ?? [];
  // Rest days don't add sessions; one already added still shows.
  const resting = day.rest || day.mode === "rest";
  $("sessions").hidden = resting && extras.length === 0;
  const tabs = [["1 · Plan", 0], ...extras.map((s, i) => [`${i + 2} · ${s.kind === "cardio" ? "Cardio" : TARGET_LABELS[s.focus] ?? "Strength"}`, i + 1])];
  $("session-tabs").replaceChildren(...tabs.map(([label, index]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.setAttribute("aria-pressed", String(index === viewSession));
    button.addEventListener("click", () => {
      viewSession = index;
      renderWorkout();
      window.scrollTo({ top: 0 });
    });
    return button;
  }));
  $("add-session").hidden = resting;
}

$("add-session").addEventListener("click", () => {
  const day = state.locked[currentDay()];
  if (!day) return;
  const limits = sessionLimits(state.trainer, state.gym);
  const used = sessionCounts(day);
  const cardioLeft = limits.cardio - used.cardio;
  const strengthLeft = limits.strength - used.strength;
  // The total is firm; the split between cardio and strength is only a
  // recommendation, so a kind that's used up can still be picked, after a
  // question.
  if (used.total >= limits.total) {
    toast(HERCULES);
    return;
  }
  $("session-dialog-text").textContent = `Session ${used.total + 1} of up to ${limits.total} today.`;
  $("session-cardio").textContent = cardioLeft > 0 ? "Cardio session" : "Cardio session anyway";
  $("session-cardio-note").hidden = cardioLeft > 0;
  $("session-strength").textContent = strengthLeft > 0 ? "Strength session" : "Strength session anyway";
  $("session-strength-note").hidden = strengthLeft > 0;
  // The recommended kind goes first, highlighted.
  const strengthFirst = cardioLeft <= 0 && strengthLeft > 0;
  $("session-choices").classList.toggle("strength-first", strengthFirst);
  $("session-cardio").classList.toggle("primary", cardioLeft > 0);
  $("session-strength").classList.toggle("primary", strengthFirst);
  $("session-dialog").dataset.cardioLeft = String(cardioLeft);
  $("session-dialog").dataset.strengthLeft = String(strengthLeft);
  $("session-dialog").showModal();
});

function addSession(kind) {
  const left = Number($("session-dialog").dataset[`${kind}Left`]);
  if (left <= 0) {
    const ask = kind === "strength"
      ? "Today already covers your recommended strength training, and the next suggested session is cardio. Do another strength session anyway?"
      : "Today already covers your recommended cardio, and the next suggested session is strength. Do another cardio session anyway?";
    if (!confirm(ask)) return;
  }
  $("session-dialog").close();
  const day = state.locked[currentDay()];
  if (!day) return;
  day.extra = [...(day.extra ?? []), {
    kind,
    focus: kind === "strength" ? $("session-focus").value : null,
    at: viewDay ? dateOfKey(viewDay, 18).getTime() : Date.now(),
    swaps: {},
    done: [],
  }];
  viewSession = day.extra.length;
  save();
  renderWorkout();
  window.scrollTo({ top: 0 });
}
for (const [value, label] of Object.entries(TARGET_LABELS)) $("session-focus").add(new Option(label, value));
$("session-cardio").addEventListener("click", () => addSession("cardio"));
$("session-cancel").addEventListener("click", () => $("session-dialog").close());
$("session-strength").addEventListener("click", () => addSession("strength"));

$("remove-session").addEventListener("click", () => {
  const day = state.locked[currentDay()];
  if (!day || viewSession === 0 || !confirm("Remove this session? Its locks and calories go with it.")) return;
  day.extra.splice(viewSession - 1, 1);
  viewSession = 0;
  updateTotals(day);
  save();
  renderWorkout();
});

// The overrides limit the day to cardio or to lifting; tapping the one
// that's on goes back to the full plan. What's already locked stays locked.
function setMode(mode) {
  const today = lockedWorkout();
  if (!today) return;
  const next = today.lock.mode === mode ? null : mode;
  if (!confirmEarlierDay(next === "cardio" ? "Change that day to cardio only?" : next === "strength" ? "Change that day to strength training only?" : "Change that day back to its full plan?")) return;
  today.lock.mode = next;
  renderWorkout();
}

// Overrides on an earlier day rewrite what that day's workout was, so they
// ask first; today's don't. True to go ahead.
function confirmEarlierDay(change) {
  if (!viewDay) return true;
  const [y, m, d] = viewDay.split("-").map(Number);
  const name = DAY_NAMES[new Date(y, m - 1, d, 12).getDay()];
  return confirm(`You're editing ${name}, not today. ${change} Anything already locked stays locked.`);
}
$("cardio-only").addEventListener("click", () => setMode("cardio"));
$("strength-only").addEventListener("click", () => setMode("strength"));

// ---- Unexpected rest day ----

// Asks first, more firmly each time this week; the third unexpected rest day
// in a week (the fourth rest day, counting the scheduled one) costs the
// streak.
function askUnexpectedRest() {
  const prompt = unexpectedRestPrompt(unexpectedRests(state.locked, currentDay(), rests()));
  $("rest-dialog-title").textContent = prompt.title;
  $("rest-dialog-text").textContent = prompt.text;
  $("rest-dialog-yes").textContent = prompt.yes;
  $("rest-dialog-no").textContent = prompt.no;
  $("rest-dialog").dataset.breaks = String(prompt.breaksStreak);
  $("rest-dialog").showModal();
}

$("rest-dialog").addEventListener("close", () => {
  if ($("rest-dialog").returnValue !== "yes") return;
  const today = currentDay();
  const lock = state.locked[today] ?? { at: Date.now(), focus: null, shuffle: 0, swaps: {}, done: [], burned: 0 };
  Object.assign(lock, {
    mode: "rest",
    unexpectedRest: true,
    streakBreak: $("rest-dialog").dataset.breaks === "true",
    // Editing an earlier day doesn't open it as today's workout.
    active: viewDay ? Boolean(lock.active) : true,
    // What's already locked stays locked, for if the workout comes back.
    done: lock.done ?? [],
  });
  state.locked[today] = lock;
  save();
  render();
  window.scrollTo({ top: 0 });
});

$("rest-link").addEventListener("click", askUnexpectedRest);

// Taking the rest day asks first. "Work out anyway" keeps it as an excused
// day: the streak is covered if the workout isn't finished, and counts if
// it is. Either way, what's locked stays locked.
$("rest-override").addEventListener("click", () => {
  const today = lockedWorkout();
  if (!today) return;
  const { lock } = today;
  if (lock.mode === "rest") {
    const ask = viewDay ? "Change that day from a rest day back to a workout? The rest day still covers your streak if the workout isn't finished." : "Work out anyway? Your rest day still covers your streak if you don't finish. Finish the workout and it counts.";
    if (!(viewDay ? confirmEarlierDay(ask) : confirm(ask))) return;
    // The rest day's celebration shouldn't stop the workout's.
    if (lock.celebrated && lock.rest) lock.celebrated = false;
    lock.mode = null;
  } else if (lock.unexpectedRest) {
    if (!confirmEarlierDay("Change that day back to a rest day?")) return;
    lock.mode = "rest";
  } else {
    if (!confirmEarlierDay("Mark that day as an unexpected rest day instead of a workout?")) return;
    askUnexpectedRest();
    return;
  }
  save();
  renderWorkout();
  window.scrollTo({ top: 0 });
});

function lockOut() {
  viewSession = 0;
  // While editing an earlier day, the button is "Done editing".
  if (viewDay) {
    viewDay = null;
    render();
    window.scrollTo({ top: 0 });
    return;
  }
  const lock = state.locked[dayKey()];
  if (lock) lock.active = false;
  save();
  render();
  window.scrollTo({ top: 0 });
}
$("lock-out").addEventListener("click", lockOut);

// ---- Celebration ----

// Shown once a day, when the last lock is locked.
function celebrateToday(lock, weekly = []) {
  lock.celebrated = true;
  const { celebration, achievements } = celebrate({
    locked: state.locked, today: currentDay(), restDay: rests(), achievements: state.achievements, rest: lock.rest, autoRests: state.autoRests ?? {},
  });
  state.achievements = achievements;
  save();
  showCelebration({ ...celebration, badges: [...celebration.badges, ...weekly] }, lock.burned);
}

function showCelebration(celebration, burned) {
  $("celebrate-title").textContent = celebration.title;
  $("celebrate-line").textContent = celebration.line;
  $("celebrate-burned").textContent = burned ? `🔥 ${burned.toLocaleString()} cal burned today` : "";
  $("celebrate-badges").replaceChildren(...celebration.badges.map(({ icon, text }) => {
    const li = document.createElement("li");
    li.append(Object.assign(document.createElement("span"), { className: "badge-icon", textContent: icon }), text);
    return li;
  }));
  $("celebrate").hidden = false;
  $("celebrate-close").focus();
  try { navigator.vibrate?.([80, 60, 80, 60, 160]); } catch {}
  confetti($("confetti"));
}

function closeCelebration() {
  $("celebrate").hidden = true;
}
$("celebrate-close").addEventListener("click", closeCelebration);

// A few seconds of falling confetti in the theme's colors. Skipped for
// people who ask for reduced motion.
function confetti(canvas) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = canvas.getContext("2d");
  const scale = devicePixelRatio || 1;
  canvas.width = innerWidth * scale;
  canvas.height = innerHeight * scale;
  ctx.scale(scale, scale);
  const colors = ["#f97316", "#c2410c", "#fbbf24", "#22c55e", "#3b82f6", "#ffedd5"];
  const pieces = Array.from({ length: 140 }, () => ({
    x: Math.random() * innerWidth,
    y: -20 - Math.random() * innerHeight * 0.6,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    speed: 2 + Math.random() * 3.5,
    drift: (Math.random() - 0.5) * 1.5,
    spin: Math.random() * Math.PI,
    turn: (Math.random() - 0.5) * 0.25,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  const end = performance.now() + 3500;
  const frame = (now) => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of pieces) {
      p.y += p.speed;
      p.x += p.drift;
      p.spin += p.turn;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (now < end && !$("celebrate").hidden) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, innerWidth, innerHeight);
  };
  requestAnimationFrame(frame);
}

// ---- Ask the trainer ----

// Start over after this many questions, so a long chat doesn't keep
// resending (and paying for) old turns.
const MAX_TURNS = 10;

// Today's workout in a sentence or two, sent with a question so the answer
// fits the plan.
function workoutContext() {
  const w = lockedWorkout()?.w ?? workout(new Date(), todaysTarget());
  const parts = [`${w.day}, ${w.window.label.toLowerCase()}.`];
  if (w.rest) parts.push("Rest day.");
  else {
    parts.push(`${w.title} (${w.focus}).`);
    if (w.run) parts.push(`Run: ${w.run}`);
    if (w.exercises.length) parts.push(`Exercises: ${w.exercises.map((e) => `${e.name} ${e.sets} × ${e.reps}`).join("; ")}.`);
    if (w.cardio) parts.push(`Cardio: ${w.cardio}`);
  }
  parts.push(`Aim: ${AIMS[w.aim].label}.`);
  if (w.trainer !== "none") parts.push(`Training style: ${TRAINERS[w.trainer].label}.`);
  if (w.trainer === "glp1" && w.health?.some((n) => n.startsWith("Shot day"))) parts.push("It's my shot day or the day after.");
  parts.push(`Gym: ${GYMS[state.gym]?.label ?? GYMS.pf.label}.`);
  const healing = activeHealing(state.healing, dayKey());
  if (healing) parts.push(healingContext(healing));
  return parts.join(" ");
}

// Bumped when ask.js's instructions change: a conversation is only valid
// with the instructions it started with, so older ones start over.
const CHAT_VERSION = 2;

function todaysChat() {
  if (state.chat?.day !== dayKey() || state.chat.version !== CHAT_VERSION) {
    state.chat = { day: dayKey(), version: CHAT_VERSION, history: [], shown: [], context: null };
  }
  return state.chat;
}

function renderChat() {
  const chat = todaysChat();
  const list = $("chat");
  list.replaceChildren();
  for (const { q, a } of chat.shown) {
    list.append(Object.assign(document.createElement("li"), { className: "q", textContent: q }));
    list.append(Object.assign(document.createElement("li"), { className: "a", textContent: a }));
  }
  $("ask-clear").hidden = chat.shown.length === 0;
  $("ask-note").textContent = state.apiKey
    ? "Quick answers from Claude, about a penny each. Not medical advice."
    : "Add your Anthropic API key in Settings to ask questions (about a penny each).";
}

$("ask-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = $("ask-input").value.trim();
  if (!question) return;
  const status = $("ask-status");
  status.classList.remove("error");
  if (!state.apiKey) {
    status.classList.add("error");
    status.textContent = "Add your Anthropic API key in Settings first.";
    return;
  }
  if (!navigator.onLine) {
    status.classList.add("error");
    status.textContent = "You're offline. Asking the trainer needs a connection.";
    return;
  }
  const chat = todaysChat();
  // Start over once the chat gets long, rather than resending every old turn.
  if (chat.shown.length >= MAX_TURNS) Object.assign(chat, { history: [], shown: [], context: null });
  const context = workoutContext();
  const button = $("ask-btn");
  button.disabled = true;
  status.textContent = "Asking…";
  try {
    const { askTrainer } = await import("./ask.js");
    const result = await askTrainer({ apiKey: state.apiKey, history: chat.history, question, context: context === chat.context ? null : context });
    Object.assign(chat, { history: result.history, context });
    chat.shown.push({ q: question, a: result.answer });
    $("ask-input").value = "";
    status.textContent = "";
    save();
    renderChat();
    $("chat").lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (err) {
    status.classList.add("error");
    status.textContent = err.name === "AskError" ? err.message : `Something went wrong: ${err.message}`;
  } finally {
    button.disabled = false;
  }
});

$("open-ask").addEventListener("click", () => {
  $("ask-card").scrollIntoView({ behavior: "smooth", block: "start" });
  $("ask-input").focus({ preventScroll: true });
});

$("ask-clear").addEventListener("click", () => {
  state.chat = null;
  save();
  renderChat();
});

// ---- Settings ----

$("version").textContent = `Version ${VERSION}`;
document.querySelector("#lock-in .lock-icon").innerHTML = lockIcon(true);
document.querySelector("#lock-out .lock-icon").innerHTML = lockIcon(false);

function showSettingsHints() {
  const typed = Number($("weight-input").value);
  $("weight-note").textContent = typed > 0 ? "" : `Until you add it, calories are estimated for ${DEFAULT_WEIGHT_LB} lb.`;
}
$("settings-form").addEventListener("input", showSettingsHints);

for (const [key, label] of Object.entries(HEALING_AREAS)) $("healing-area").add(new Option(label, key));
for (const [key, label] of Object.entries(HEALING_KINDS)) $("healing-kind").add(new Option(label, key));

// The healing fields: what kind only once there's an area, and how long
// the one already set has left.
function showHealing() {
  const area = $("healing-area").value;
  $("healing-kind-row").hidden = !area;
  const active = activeHealing(state.healing, dayKey());
  const same = active && active.area === area && active.kind === $("healing-kind").value;
  $("healing-note").hidden = !same;
  if (same) {
    const ends = dateOfKey(active.since);
    ends.setDate(ends.getDate() + HEALING_DAYS);
    $("healing-note").textContent = `${active.daysLeft} ${active.daysLeft === 1 ? "day" : "days"} left: the plan goes back to normal on ${ends.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}.`;
  }
}
$("healing-area").addEventListener("change", showHealing);
$("healing-kind").addEventListener("change", showHealing);

function openSettings() {
  $("rest-input").value = String(state.restDay);
  showRestNote();
  const healing = activeHealing(state.healing, dayKey());
  $("healing-area").value = healing?.area ?? "";
  $("healing-kind").value = healing?.kind ?? "tattoo";
  showHealing();
  $("weight-input").value = state.weightLb ?? "";
  $("feet-input").value = state.heightIn ? Math.floor(state.heightIn / 12) : "";
  $("inches-input").value = state.heightIn ? state.heightIn % 12 : "";
  $("key-input").value = state.apiKey;
  showSettingsHints();
  $("settings").showModal();
}

$("open-settings").addEventListener("click", openSettings);

// ---- Backup and restore ----

// A backup is everything GymBot keeps, as one JSON file the person saves.
// Today's Ask the trainer chat is left out; it starts over each day anyway.
$("backup-btn").addEventListener("click", () => {
  const { chat, ...data } = state;
  const backup = { app: "gymbot", version: 1, savedAt: new Date().toISOString(), data };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `gymbot-backup-${dayKey()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
  $("backup-status").textContent = `Saved ${link.download} to your downloads.`;
});

$("restore-btn").addEventListener("click", () => $("restore-file").click());

$("restore-file").addEventListener("change", async () => {
  const file = $("restore-file").files[0];
  $("restore-file").value = "";
  if (!file) return;
  let backup;
  try {
    backup = JSON.parse(await file.text());
  } catch {
    backup = null;
  }
  if (backup?.app !== "gymbot" || typeof backup.data !== "object" || typeof backup.data.locked !== "object") {
    $("backup-status").textContent = "That file isn't a GymBot backup.";
    return;
  }
  const when = new Date(backup.savedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  if (!confirm(`Restore the backup from ${when}? It replaces GymBot's current settings and workouts.`)) return;
  const restored = { ...load(), ...backup.data, chat: null };
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, restored);
  save();
  $("settings").close("restored");
  render();
});

// Changing the rest day can't soft-reset the week. Picked ahead of time, it
// asks whether it starts this week (the week ends on the new rest day and
// the next one starts after it) or next week (this week stays as planned).
// Picked on the day itself (today off), it asks first: an unexpected rest
// day, or the new rest day from today on. A change to this week, either
// way, is allowed once a week; the rest of the week always ends on the
// rest day.
const restHistory = () => state.restHistory ?? [{ from: "", day: Number(state.restDay) }];

// The first day after this week's rest day, when a change made today starts.
function nextWeekStart() {
  const days = weekDays(dayKey(), rests());
  return addDays(days.at(-1), 1);
}

function scheduleRestDay(day, from) {
  const history = restHistory().filter((entry) => entry.from < from);
  if (history.at(-1)?.day !== day) history.push({ from, day, ...(from === dayKey() ? { now: true } : {}) });
  state.restHistory = history;
  state.restDay = day;
}

// A change that applied to the week it was made in, in the past week.
const changedNowThisWeek = () => restHistory().some((entry) => entry.now && entry.from > addDays(dayKey(), -7));

function setRestDay(day) {
  if (day === Number(state.restDay)) return;
  const today = dayKey();
  if (day === weekdayOf(today) && !isRestDate(rests(), today)) {
    askAtlas(day);
    return;
  }
  askWhen(day);
}

// How the weeks run if `day` becomes the rest day from `from`.
function weekPreview(day, from) {
  const schedule = [...restHistory().filter((entry) => entry.from < from), { from, day }];
  const week = weekDays(dayKey(), schedule);
  const next = weekDays(addDays(week.at(-1), 1), schedule);
  const show = (key) => dateOfKey(key).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
  const end = isRestDate(schedule, week.at(-1)) ? `on its rest day, ${show(week.at(-1))}` : show(week.at(-1));
  return `This week ends ${end}. The next runs ${show(next[0])} to ${show(next.at(-1))}${isRestDate(schedule, next.at(-1)) ? ", its rest day" : ""}.`;
}

function askWhen(day) {
  const used = changedNowThisWeek();
  $("rest-when-title").textContent = `Make ${DAY_NAMES[day]} your rest day`;
  $("rest-when-choice").options[0].disabled = used;
  $("rest-when-choice").value = used ? "next" : "this";
  $("rest-when-dialog-day").value = String(day);
  showWhen();
  $("rest-when").showModal();
}

function showWhen() {
  const day = Number($("rest-when-dialog-day").value);
  const now = $("rest-when-choice").value === "this";
  $("rest-when-text").textContent = weekPreview(day, now ? dayKey() : nextWeekStart());
  $("rest-when-note").textContent = $("rest-when-choice").options[0].disabled
    ? "This week's rest day already moved once, so the change can only start next week."
    : now
      ? "Days already done keep their workouts, and the week carries on from them. This week's rest day can only move once a week."
      : "This week stays exactly as planned.";
}
$("rest-when-choice").addEventListener("change", showWhen);

$("rest-when").addEventListener("close", () => {
  if ($("rest-when").returnValue !== "yes") return;
  const now = $("rest-when-choice").value === "this" && !changedNowThisWeek();
  scheduleRestDay(Number($("rest-when-dialog-day").value), now ? dayKey() : nextWeekStart());
  save();
  render();
});

function askAtlas(day) {
  const name = DAY_NAMES[day];
  const used = changedNowThisWeek();
  $("atlas-text").textContent = `Making today, ${name}, your rest day on the day would reset the week. Missed workouts are yours to own, so pick how today goes.`;
  const now = $("atlas-choice").options[1];
  now.textContent = `New rest day: ${name}, from today`;
  now.disabled = used;
  $("atlas-choice").value = "unexpected";
  $("atlas-note").textContent = used
    ? "The rest day already moved on the day once this week, so today can only be an unexpected rest day."
    : `Making it your rest day re-plans the rest of this week and every week after. That can only be done once a week. Picked ahead of time, a new rest day doesn't need this.`;
  $("atlas-dialog").dataset.day = String(day);
  $("atlas-dialog").showModal();
}

$("atlas-dialog").addEventListener("close", () => {
  if ($("atlas-dialog").returnValue !== "yes") return;
  if ($("atlas-choice").value === "now" && !changedNowThisWeek()) {
    scheduleRestDay(Number($("atlas-dialog").dataset.day), dayKey());
    save();
    render();
  } else askUnexpectedRest();
});

// What Settings says about the rest day: one still to start, or that
// saving asks when a new one starts.
function showRestNote() {
  const today = dayKey();
  const pending = restHistory().find((entry) => entry.from > today);
  const picked = Number($("rest-input").value);
  const show = (key) => dateOfKey(key).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
  const text = picked !== Number(state.restDay)
    ? picked === weekdayOf(today) && !isRestDate(rests(), today) ? "That's today: saving asks how today goes." : "Saving asks whether it starts this week or next."
    : pending ? `${DAY_NAMES[pending.day]} starts ${show(pending.from)}; until then the rest day is ${DAY_NAMES[restDayOn(rests(), today)]}.` : "";
  $("rest-note").hidden = !text;
  $("rest-note").textContent = text;
}
$("rest-input").addEventListener("change", showRestNote);

$("settings").addEventListener("close", () => {
  if ($("settings").returnValue !== "save") return;
  setRestDay(Number($("rest-input").value));
  // A changed area or kind starts its 14 days today.
  const area = $("healing-area").value;
  const kind = $("healing-kind").value;
  const healing = activeHealing(state.healing, dayKey());
  state.healing = !area ? null : healing?.area === area && healing.kind === kind ? state.healing : { area, kind, since: dayKey() };
  const feet = Number($("feet-input").value);
  const inches = Number($("inches-input").value);
  state.heightIn = feet || inches ? feet * 12 + inches : null;
  const lb = Number($("weight-input").value);
  const weightLb = lb > 0 ? lb : null;
  if (weightLb !== state.weightLb) state.weightSetDay = weightLb ? dayKey() : null;
  state.weightLb = weightLb;
  state.apiKey = $("key-input").value.trim();
  save();
  render();
});

// ---- Start ----

// On the rest day the app opens on a reminder instead of the options, until
// "Lock in anyway" (or a workout already locked in today).
function screenNow() {
  if (viewDay) return "workout";
  const today = dayKey();
  const lock = state.locked[today];
  if (lock?.active) return "workout";
  if (isRestDate(rests(), today) && !lock && state.restAck !== today) return "rest";
  return "options";
}

function render() {
  // A day being edited stops being editable once it's no longer an earlier
  // day of this week (after midnight on the rest day, say).
  if (viewDay && (viewDay >= dayKey() || !weekDays(dayKey(), rests()).includes(viewDay))) viewDay = null;
  updateAutoRests();
  const screen = screenNow();
  showScreen(screen);
  if (screen === "workout") {
    renderWorkout();
    renderChat();
    $("edit-banner").hidden = !viewDay;
    if (viewDay) $("edit-banner").textContent = `Editing ${dateOfKey(viewDay).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}. Changes count toward that day.`;
    $("ask-card").hidden = Boolean(viewDay);
    $("lock-out-label").textContent = viewDay ? "Done editing" : "Lock out";
  } else if (screen === "rest") {
    renderRest();
  } else {
    renderOptions();
  }
}

render();
// Keep the clock and time of day current while the options screen is open.
setInterval(() => { if (!$("options-screen").hidden) renderOptions(); }, 30 * 1000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });

// Switch to the new day at midnight, even with the app open: the next day's
// options, or its rest-day reminder, replace the old day's workout.
function renderAtMidnight() {
  setTimeout(() => {
    render();
    renderAtMidnight();
  }, nextReset() - Date.now() + 1000);
}
renderAtMidnight();

if ("serviceWorker" in navigator) {
  // updateViaCache: check sw.js itself for changes on every open, too.
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).catch(() => {});
}
