import { dayKey, previousDay, nextReset } from "./day.js";
import { AIMS, GYMS, DAY_NAMES, TARGETS, TARGET_LABELS, TRAINERS, suggest, gymDay, timeWindow, caloriesBurned } from "./workouts.js";
import { celebrate, streak, level, unexpectedRests, unexpectedRestPrompt, weeklyBadges, trainingWeek, CARDIO_GOAL, STRENGTH_DAYS } from "./celebrate.js";
import { analyzeWeight, daysBetween, WEEK_DAYS } from "./weight.js";

// Shown at the bottom of Settings, to check which version a phone is running.
const VERSION = "2026-10-24 · 8:00 PM";
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
  // (`shuffle` is from the old "Different exercises" button.)
  // focus: { day, target }, the body part picked on the options screen. It
  // only applies to that day; the next day starts back on the split.
  // trainer: a key of TRAINERS (the "AI Trainer" setting); shotDay: the
  // weekday of a weekly GLP-1 shot, or "".
  // restDay: the weekday off (Sunday is 0). restAck: the day "Lock in anyway"
  // was tapped on the rest day, so the reminder shows once.
  // weightLb: for calories burned; null uses CookBot's weight, if any.
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
    aim: "maintain", gym: "pf", trainer: "none", shotDay: "", restDay: 0, restAck: null, weightLb: null,
    locked: {}, focus: null, apiKey: "", chat: null, achievements: { completeDays: 0, fullWeeks: 0, weeks: [] },
    weighIns: [], weightStart: null, weightSetDay: null,
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

// CookBot, hosted on the same site, keeps its settings under "cookbot".
function cookbot() {
  try {
    return JSON.parse(localStorage.getItem("cookbot")) ?? {};
  } catch {
    return {};
  }
}

// Body weight for calories: GymBot's own setting, else CookBot's profile.
function weight() {
  if (state.weightLb > 0) return { lb: state.weightLb, from: "settings" };
  const lb = Number(cookbot().profile?.weightLb);
  if (lb > 0) return { lb, from: "cookbot" };
  return { lb: DEFAULT_WEIGHT_LB, from: "default" };
}

// ---- Shared ----

// The body part picked for today, or null for today's split.
const todaysTarget = () => (state.focus?.day === dayKey() && TARGETS[state.focus.target] ? state.focus.target : null);

// The workout for `date` with the current settings.
const workout = (date, target, shuffle = 0, swaps = {}, mode = null) =>
  suggest({ date, aim: state.aim, gym: state.gym, trainer: state.trainer, shotDay: state.shotDay, restDay: state.restDay, target, shuffle, swaps, mode });

// Today's locked-in workout, or null.
function lockedWorkout() {
  const lock = state.locked[dayKey()];
  return lock ? { lock, w: workout(new Date(lock.at), lock.focus, lock.shuffle, lock.swaps, lock.mode) } : null;
}

// Short trainer names for the chip on the options screen.
const TRAINER_CHIPS = { bodybuilder: "Bodybuilder", powerlifter: "Powerlifter", marathon: "Marathon", weightLoss: "Weight loss", glp1: "GLP-1" };

// The split's "Pull A" style names stay out of sight. A split day shows what
// it trains ("Back and biceps") with its emphasis ("Back width first") as the
// detail; a body part picked under Focus shows as "Back (selected)".
const isSplitDay = (w) => /^(Push|Pull|Legs) [AB]$/.test(w.title);

function displayName(w) {
  if (w.mode === "cardio") return "Cardio only";
  if (w.target) return `${TARGET_LABELS[w.target]} (selected)`;
  return isSplitDay(w) ? w.focus.replace(/ \(.*\)$/, "") : w.title;
}

function displayDetail(w) {
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
  $("open-ask").hidden = name !== "workout";
}

// ---- Options screen ----

// This week's Monday to Sunday as day keys, for the week strip.
function weekKeys(now = new Date()) {
  const today = dayKey(now);
  const back = (gymDay(now) + 6) % 7; // days since Monday
  let monday = today;
  for (let i = 0; i < back; i++) monday = previousDay(monday);
  const keys = [monday];
  const [y, m, d] = monday.split("-").map(Number);
  for (let i = 1; i < 7; i++) keys.push(dayKey(new Date(y, m - 1, d + i, 12)));
  return keys;
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
  $("now-time").textContent = `${window.label} · ${clock} · gym is usually ${window.crowd}`;
  const aim = AIMS[state.aim]?.label ?? "Maintain";
  const coach = TRAINER_CHIPS[state.trainer];
  $("aim-chip").textContent = coach ? `${aim} · ${coach}` : aim;

  const target = todaysTarget();
  const today = workout(now, target);
  $("now-split").textContent = today.rest
    ? "Today: rest day · stretching only"
    : `Today: ${displayName(today)}`;

  const focusChoices = [[null, "Default"], ...Object.entries(TARGET_LABELS)];
  segmented($("focus"), focusChoices, target, (value) => {
    state.focus = value ? { day: dayKey(), target: value } : null;
    save();
    renderOptions();
  });

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
  segmented($("gym-choices"), Object.keys(GYMS).map((key) => [key, GYMS[key].label.split(" (")[0]]), state.gym, (value) => {
    state.gym = value;
    save();
    renderOptions();
  });
  $("gym-blurb").textContent = (GYMS[state.gym] ?? GYMS.pf).label.split(" (")[1]?.replace(/\)$/, "") ?? "";

  const todayKey = dayKey(now);
  const week = $("week");
  week.replaceChildren();
  let workouts = 0;
  let burned = 0;
  weekKeys(now).forEach((key, i) => {
    const lock = state.locked[key];
    const li = document.createElement("li");
    li.append(DAY_NAMES[(i + 1) % 7].slice(0, 3));
    const mark = document.createElement("span");
    mark.className = "mark";
    if (lock?.unexpectedRest && lock.mode === "rest") mark.textContent = "💤";
    else if (lock?.burned) mark.textContent = lock.burned;
    else mark.textContent = lock ? "✓" : (i + 1) % 7 === Number(state.restDay) ? "–" : "";
    li.append(mark);
    li.classList.toggle("today", key === todayKey);
    li.classList.toggle("done", Boolean(lock?.done?.length));
    week.append(li);
    if (lock?.done?.length) workouts++;
    burned += lock?.burned ?? 0;
  });
  $("week-total").textContent = workouts
    ? `${workouts} ${workouts === 1 ? "workout" : "workouts"} · ${burned.toLocaleString()} cal burned this week`
    : "Nothing locked yet this week.";
  // Progress toward the weekly guideline goals.
  const { stats } = weeklyBadges({ locked: state.locked, today: todayKey, restDay: Number(state.restDay) });
  const tick = (ok) => (ok ? " ✓" : "");
  $("week-goals").textContent = `${stats.gymDays} gym ${stats.gymDays === 1 ? "day" : "days"} · ${Math.min(stats.cardioMinutes, 999)} of ${CARDIO_GOAL} cardio min${tick(stats.cardioMinutes >= CARDIO_GOAL)} · strength ${Math.min(stats.strengthDays, STRENGTH_DAYS)} of ${STRENGTH_DAYS} days${tick(stats.strengthDays >= STRENGTH_DAYS)}`;
  const run = streak(state.locked, todayKey, Number(state.restDay));
  const rank = level(state.achievements.fullWeeks);
  $("streak-line").textContent = [run >= 2 ? `🔥 ${run}-day streak` : null, rank ? `🏆 ${rank}` : null].filter(Boolean).join(" · ");

  renderWeight();

  const lock = state.locked[todayKey];
  $("lock-in-label").textContent = lock?.unexpectedRest && lock.mode === "rest" ? "Back to my rest day" : lock?.done?.length ? "Lock back in" : "Lock in";
  // Unexpected rest days are for training days.
  $("rest-link").hidden = Boolean(lock?.unexpectedRest) || gymDay(now) === Number(state.restDay);
}

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
    ? `Starting at ${start.lb} lb on ${shortDate(start.day)}. Log again next week to see how it's moving.`
    : `Last weigh-in ${start.lb} lb on ${shortDate(start.day)} · now ${latest.lb} lb · ${moved}${span}`;
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
  // number keeps the comparison); before the first one, with the weight from
  // Settings, or else this weigh-in itself.
  const previous = previousWeighIn();
  if (previous) state.weightStart = { ...previous };
  else if (!state.weightStart) state.weightStart = state.weightLb > 0 ? { day: state.weightSetDay ?? today, lb: state.weightLb } : { day: today, lb };
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
  const same = previous && (previous.focus ?? null) === focus;
  state.locked[today] = {
    at: Date.now(),
    focus,
    shuffle: same ? previous.shuffle ?? 0 : 0,
    mode: same ? previous.mode ?? null : null,
    unexpectedRest: same ? previous.unexpectedRest ?? false : false,
    streakBreak: same ? previous.streakBreak ?? false : false,
    swaps: same ? previous.swaps ?? {} : {},
    done: same ? previous.done ?? [] : [],
    active: true,
    burned: 0,
  };
  save();
  render();
  window.scrollTo({ top: 0 });
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
  const { lock, w } = today;

  $("plan-title").textContent = w.rest ? w.title : displayName(w);
  $("plan-focus").textContent = w.rest ? w.focus : [`${w.day} ${w.window.label.toLowerCase()}`, displayDetail(w)].filter(Boolean).join(" · ");
  $("plan-minutes").textContent = `~${w.minutes} min`;

  const notes = w.notes;
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
  save();

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
    : `Estimated for ${lb} lb${from === "cookbot" ? " (from CookBot)" : ""}.`;

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
        detail.append(" · Taken? ", swap);
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
      const today = dayKey();
      const week = trainingWeek(today, Number(state.restDay)).id;
      state.achievements.weekly ??= {};
      // Rest-day stretching doesn't move the weekly goals, so it doesn't check.
      const weekly = w.rest ? { badges: [], awarded: state.achievements.weekly[week] ?? [] }
        : weeklyBadges({ locked: state.locked, today, restDay: Number(state.restDay), awarded: state.achievements.weekly[week] });
      state.achievements.weekly[week] = weekly.awarded;
      save();
      if (lock.complete && !lock.celebrated) celebrateToday(lock, weekly.badges);
      else if (weekly.badges.length) showCelebration({ title: "Weekly goal hit!", line: "Keep locking in.", badges: weekly.badges }, 0);
    });
    list.append(li);
  }
  // The scheduled rest day has no overrides: training on it takes picking a
  // body part. An unexpected rest day only offers working out anyway, which
  // stays open all day.
  const restOverride = lock.mode === "rest";
  $("overrides").hidden = w.rest && !restOverride;
  $("cardio-only").hidden = restOverride;
  $("strength-only").hidden = restOverride;
  for (const [id, mode, label] of [["cardio-only", "cardio", "Cardio only override"], ["strength-only", "strength", "Strength training only override"]]) {
    const on = lock.mode === mode;
    $(id).setAttribute("aria-pressed", String(on));
    $(id).textContent = on ? `${label} on · tap for the full plan` : label;
  }
  $("rest-override").setAttribute("aria-pressed", "false");
  $("rest-override").textContent = restOverride ? "Feeling better? Work out anyway" : lock.unexpectedRest ? "Back to my rest day" : "Unexpected rest day override";
}

// The overrides limit the day to cardio or to lifting; tapping the one
// that's on goes back to the full plan. What's already locked stays locked.
function setMode(mode) {
  const today = lockedWorkout();
  if (!today) return;
  today.lock.mode = today.lock.mode === mode ? null : mode;
  renderWorkout();
}
$("cardio-only").addEventListener("click", () => setMode("cardio"));
$("strength-only").addEventListener("click", () => setMode("strength"));

// ---- Unexpected rest day ----

// Asks first, more firmly each time this week; the third unexpected rest day
// in a week (the fourth rest day, counting the scheduled one) costs the
// streak.
function askUnexpectedRest() {
  const prompt = unexpectedRestPrompt(unexpectedRests(state.locked, dayKey(), Number(state.restDay)));
  $("rest-dialog-title").textContent = prompt.title;
  $("rest-dialog-text").textContent = prompt.text;
  $("rest-dialog-yes").textContent = prompt.yes;
  $("rest-dialog-no").textContent = prompt.no;
  $("rest-dialog").dataset.breaks = String(prompt.breaksStreak);
  $("rest-dialog").showModal();
}

$("rest-dialog").addEventListener("close", () => {
  if ($("rest-dialog").returnValue !== "yes") return;
  const today = dayKey();
  const lock = state.locked[today] ?? { at: Date.now(), focus: null, shuffle: 0, swaps: {}, done: [], burned: 0 };
  Object.assign(lock, {
    mode: "rest",
    unexpectedRest: true,
    streakBreak: $("rest-dialog").dataset.breaks === "true",
    active: true,
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
    if (!confirm("Work out anyway? Your rest day still covers your streak if you don't finish. Finish the workout and it counts.")) return;
    // The rest day's celebration shouldn't stop the workout's.
    if (lock.celebrated && lock.rest) lock.celebrated = false;
    lock.mode = null;
  } else if (lock.unexpectedRest) {
    lock.mode = "rest";
  } else {
    askUnexpectedRest();
    return;
  }
  save();
  renderWorkout();
  window.scrollTo({ top: 0 });
});

function lockOut() {
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
    locked: state.locked, today: dayKey(), restDay: Number(state.restDay), achievements: state.achievements, rest: lock.rest,
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
$("celebrate-lock-out").addEventListener("click", () => {
  closeCelebration();
  lockOut();
});

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
  if (w.trainer === "glp1" && w.notes?.some((n) => n.startsWith("Shot day"))) parts.push("It's my shot day or the day after.");
  parts.push(`Gym: ${GYMS[state.gym]?.label ?? GYMS.pf.label}.`);
  return parts.join(" ");
}

function todaysChat() {
  if (state.chat?.day !== dayKey()) state.chat = { day: dayKey(), history: [], shown: [], context: null };
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
  const fromCookbot = Number(cookbot().profile?.weightLb);
  $("weight-note").textContent = typed > 0 ? ""
    : fromCookbot > 0 ? `Leave it blank to use your CookBot weight (${fromCookbot} lb).`
    : `Until you add it, calories are estimated for ${DEFAULT_WEIGHT_LB} lb.`;
  const shared = cookbot().apiKey || "";
  $("cookbot-key").hidden = !shared || $("key-input").value.trim() === shared;
}
$("settings-form").addEventListener("input", showSettingsHints);

$("use-cookbot-key").addEventListener("click", () => {
  $("key-input").value = cookbot().apiKey || "";
  showSettingsHints();
});

function openSettings() {
  $("rest-input").value = String(state.restDay);
  $("weight-input").value = state.weightLb ?? "";
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

$("settings").addEventListener("close", () => {
  if ($("settings").returnValue !== "save") return;
  state.restDay = Number($("rest-input").value);
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
  const today = dayKey();
  const lock = state.locked[today];
  if (lock?.active) return "workout";
  if (gymDay() === Number(state.restDay) && !lock && state.restAck !== today) return "rest";
  return "options";
}

function render() {
  const screen = screenNow();
  showScreen(screen);
  if (screen === "workout") {
    renderWorkout();
    renderChat();
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
