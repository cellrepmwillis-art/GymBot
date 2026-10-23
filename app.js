import { dayKey, previousDay } from "./day.js";
import { AIMS, GYMS, DAY_NAMES, TARGETS, TARGET_LABELS, TRAINERS, suggest, gymDay, timeWindow } from "./workouts.js";

// Shown at the bottom of Settings, to check which version a phone is running.
const VERSION = "2026-10-23 · 11:00 PM";
const STORAGE_KEY = "gymbot";
const KEEP_DAYS = 60;

const $ = (id) => document.getElementById(id);

// ---- Storage (everything lives in this browser's localStorage) ----

function load() {
  // locked: { "2026-10-23": { at, shuffle, done: [exercise numbers] } } for
  // every day the Lock in button was pressed, plus `focus`, a body part
  // picked instead of the split. `at` keeps the workout picked for the time
  // it was locked in, even if the app is opened again later.
  // focus: { day, target }, the body part picked on the main screen. It only
  // applies to that day; the next day starts back on the split.
  // trainer: a key of TRAINERS (the "AI Trainer" setting); shotDay: the
  // weekday of a weekly GLP-1 shot, or "".
  const defaults = { aim: "maintain", gym: "pf", trainer: "none", shotDay: "", locked: {}, focus: null };
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

let isFirstRun = true;
try { isFirstRun = !localStorage.getItem(STORAGE_KEY); } catch {}
const state = load();

// ---- Today ----

// The body part picked for today, or null for today's split.
const todaysTarget = () => (state.focus?.day === dayKey() && TARGETS[state.focus.target] ? state.focus.target : null);

// The workout for `date` with the current settings.
const workout = (date, target, shuffle = 0) =>
  suggest({ date, aim: state.aim, gym: state.gym, trainer: state.trainer, shotDay: state.shotDay, target, shuffle });

// Short trainer names for the chip on the main screen.
const TRAINER_CHIPS = { bodybuilder: "Bodybuilder", powerlifter: "Powerlifter", marathon: "Marathon", weightLoss: "Weight loss", glp1: "GLP-1" };

function renderFocus(planned) {
  const target = todaysTarget();
  const choices = [[null, planned.rest ? "Rest (today's plan)" : `${planned.title} (today's plan)`], ...Object.entries(TARGET_LABELS)];
  $("focus").replaceChildren(...choices.map(([value, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.setAttribute("aria-pressed", String(value === target));
    button.addEventListener("click", () => chooseTarget(value));
    return button;
  }));
}

// Picking a body part after locking in switches today's workout to it.
function chooseTarget(target) {
  const today = dayKey();
  state.focus = target ? { day: today, target } : null;
  const lock = state.locked[today];
  if (lock && (lock.focus ?? null) !== target) Object.assign(lock, { focus: target, shuffle: 0, done: [] });
  save();
  render();
}

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

function renderNow() {
  const now = new Date();
  const day = gymDay(now);
  const window = timeWindow(now);
  $("now-day").textContent = DAY_NAMES[day];
  const clock = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  $("now-time").textContent = `${window.label} · ${clock} · gym is usually ${window.crowd}`;
  const aim = AIMS[state.aim]?.label ?? "Maintain";
  const coach = TRAINER_CHIPS[state.trainer];
  $("aim-chip").textContent = coach ? `${aim} · ${coach}` : aim;
  const planned = workout(now, null);
  const today = workout(now, todaysTarget());
  $("now-split").textContent = today.rest
    ? "Today: rest day. Lock in for a recovery plan, or pick a body part to train."
    : `Today: ${today.title} · ${today.focus}`;
  renderFocus(planned);

  const todayKey = dayKey(now);
  const week = $("week");
  week.replaceChildren();
  weekKeys(now).forEach((key, i) => {
    const li = document.createElement("li");
    const name = DAY_NAMES[(i + 1) % 7].slice(0, 3);
    const mark = state.locked[key] ? "✓" : i === 6 ? "–" : "";
    li.innerHTML = `${name}<span class="mark">${mark}</span>`;
    li.classList.toggle("today", key === todayKey);
    li.classList.toggle("done", Boolean(state.locked[key]));
    week.append(li);
  });
  const lock = state.locked[todayKey];
  $("lock-in").textContent = lock ? "Locked in ✓ (lock in again)" : "Lock in";
}

// ---- The workout ----

function renderPlan() {
  const lock = state.locked[dayKey()];
  $("plan").hidden = !lock;
  if (!lock) return;
  const w = workout(new Date(lock.at), lock.focus, lock.shuffle);

  $("plan-title").textContent = w.rest ? w.title : `${w.title} · ${w.day} ${w.window.label.toLowerCase()}`;
  $("plan-focus").textContent = w.focus;
  $("plan-minutes").textContent = w.rest ? "Rest" : `~${w.minutes} min`;

  const notes = $("plan-notes");
  notes.replaceChildren(...(w.rest ? [] : w.notes).map((text) => Object.assign(document.createElement("li"), { textContent: text })));

  const lifts = !w.rest && w.exercises.length > 0;
  for (const id of ["warmup-title", "plan-warmup"]) $(id).hidden = w.rest;
  for (const id of ["run-title", "plan-run"]) $(id).hidden = !w.run;
  for (const id of ["cardio-title", "plan-cardio"]) $(id).hidden = !w.cardio;
  for (const id of ["shuffle", "plan-tip"]) $(id).hidden = !lifts;
  $("shuffle").parentElement.hidden = !lifts;
  $("lifts-title").hidden = !w.rest && !lifts;
  $("lifts-title").textContent = w.rest ? "Today" : w.superset ? "Lifts (A and B are supersets)" : "Lifts";
  $("plan-sources").hidden = !w.sources.length;
  $("plan-sources").textContent = `Trainer: ${TRAINERS[w.trainer].label}. Based on ${w.sources.join(", ")}.`;

  const list = $("plan-exercises");
  list.replaceChildren();
  if (w.rest) {
    for (const step of w.steps) list.append(Object.assign(document.createElement("li"), { textContent: step, className: "step" }));
    return;
  }
  $("plan-warmup").textContent = w.warmup;
  $("plan-run").textContent = w.run ?? "";
  $("run-title").textContent = lifts ? "Run first" : "Run";
  $("plan-cardio").textContent = w.cardio ?? "";

  const done = new Set(lock.done ?? []);
  w.exercises.forEach((e, i) => {
    const li = document.createElement("li");
    li.classList.toggle("main", e.main);
    li.classList.toggle("done", done.has(i));
    const num = document.createElement("span");
    num.className = "num";
    // Supersets number each pair: 1, 2A, 2B, 3A, 3B...
    const n = w.superset && !e.main ? Math.floor((i - 1) / 2) + 2 : i + 1;
    num.textContent = done.has(i) ? "✓" : `${n}${e.superset ?? ""}`;
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = e.name;
    const scheme = document.createElement("span");
    scheme.className = "scheme";
    scheme.textContent = `${e.sets} × ${e.reps}`;
    const detail = document.createElement("span");
    detail.className = "detail";
    const rest = e.superset === "A" ? "no rest, go straight to B" : `rest ${e.rest}`;
    detail.textContent = [e.main ? "Main lift" : null, rest, e.alternative ? `Taken? ${e.alternative}` : null].filter(Boolean).join(" · ");
    li.append(num, name, scheme, detail);
    li.addEventListener("click", () => {
      if (done.has(i)) done.delete(i); else done.add(i);
      lock.done = [...done];
      save();
      renderPlan();
    });
    list.append(li);
  });
}

function render() {
  renderNow();
  renderPlan();
}

$("lock-in").addEventListener("click", () => {
  // Locking in again updates the time of day, keeping today's exercises
  // unless the focus changed.
  const today = dayKey();
  const previous = state.locked[today];
  const focus = todaysTarget();
  const same = previous && (previous.focus ?? null) === focus;
  state.locked[today] = { at: Date.now(), shuffle: same ? previous.shuffle ?? 0 : 0, done: same ? previous.done ?? [] : [], focus };
  save();
  render();
  $("plan").scrollIntoView({ behavior: "smooth", block: "start" });
});

$("shuffle").addEventListener("click", () => {
  const lock = state.locked[dayKey()];
  if (!lock) return;
  lock.shuffle = (lock.shuffle ?? 0) + 1;
  lock.done = [];
  save();
  renderPlan();
});

// ---- Settings ----

$("version").textContent = `Version ${VERSION}`;
for (const [value, { label }] of Object.entries(AIMS)) $("aim-input").add(new Option(label, value));
for (const [value, { label }] of Object.entries(GYMS)) $("gym-input").add(new Option(label, value));
for (const [value, { label }] of Object.entries(TRAINERS)) $("trainer-input").add(new Option(label, value));

function showBlurb() {
  $("aim-blurb").textContent = AIMS[$("aim-input").value]?.blurb ?? "";
  $("trainer-blurb").textContent = TRAINERS[$("trainer-input").value]?.blurb ?? "";
  $("shot-field").hidden = $("trainer-input").value !== "glp1";
}
$("settings-form").addEventListener("input", showBlurb);

function openSettings() {
  $("aim-input").value = AIMS[state.aim] ? state.aim : "maintain";
  $("gym-input").value = GYMS[state.gym] ? state.gym : "pf";
  $("trainer-input").value = TRAINERS[state.trainer] ? state.trainer : "none";
  $("shot-input").value = state.shotDay;
  showBlurb();
  $("settings").showModal();
}

$("open-settings").addEventListener("click", openSettings);

$("settings").addEventListener("close", () => {
  if ($("settings").returnValue !== "save") return;
  state.aim = $("aim-input").value;
  state.gym = $("gym-input").value;
  state.trainer = $("trainer-input").value;
  state.shotDay = $("shot-input").value;
  save();
  render();
});

// ---- Start ----

render();
// Keep the clock and time of day current while the app is open.
setInterval(renderNow, 30 * 1000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
if (isFirstRun) openSettings();

if ("serviceWorker" in navigator) {
  // updateViaCache: check sw.js itself for changes on every open, too.
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).catch(() => {});
}
