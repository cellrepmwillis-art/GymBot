import { dayKey, previousDay } from "./day.js";
import { AIMS, GYMS, DAY_NAMES, suggest, gymDay, timeWindow, splitFor } from "./workouts.js";

// Shown at the bottom of Settings, to check which version a phone is running.
const VERSION = "2026-10-23 · 9:00 PM";
const STORAGE_KEY = "gymbot";
const KEEP_DAYS = 60;

const $ = (id) => document.getElementById(id);

// ---- Storage (everything lives in this browser's localStorage) ----

function load() {
  // locked: { "2026-10-23": { at, shuffle, done: [exercise numbers] } } for
  // every day the Lock in button was pressed. `at` keeps the workout picked
  // for the time it was locked in, even if the app is opened again later.
  const defaults = { aim: "maintain", gym: "pf", locked: {} };
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
  const split = splitFor(day);
  $("now-day").textContent = DAY_NAMES[day];
  const clock = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  $("now-time").textContent = `${window.label} · ${clock} · gym is usually ${window.crowd}`;
  $("aim-chip").textContent = AIMS[state.aim]?.label ?? "Maintain";
  $("now-split").textContent = split ? `Today: ${split.title} · ${split.focus}` : "Today: rest day. Lock in for a recovery plan.";

  const today = dayKey(now);
  const week = $("week");
  week.replaceChildren();
  weekKeys(now).forEach((key, i) => {
    const li = document.createElement("li");
    const name = DAY_NAMES[(i + 1) % 7].slice(0, 3);
    const mark = state.locked[key] ? "✓" : i === 6 ? "–" : "";
    li.innerHTML = `${name}<span class="mark">${mark}</span>`;
    li.classList.toggle("today", key === today);
    li.classList.toggle("done", Boolean(state.locked[key]));
    week.append(li);
  });
  const lock = state.locked[today];
  $("lock-in").textContent = lock ? "Locked in ✓ (lock in again)" : "Lock in";
}

// ---- The workout ----

function renderPlan() {
  const lock = state.locked[dayKey()];
  $("plan").hidden = !lock;
  if (!lock) return;
  const w = suggest({ date: new Date(lock.at), aim: state.aim, gym: state.gym, shuffle: lock.shuffle });

  $("plan-title").textContent = w.rest ? w.title : `${w.title} · ${w.day} ${w.window.label.toLowerCase()}`;
  $("plan-focus").textContent = w.focus;
  $("plan-minutes").textContent = w.rest ? "Rest" : `~${w.minutes} min`;

  const notes = $("plan-notes");
  notes.replaceChildren(...(w.rest ? [] : w.notes).map((text) => Object.assign(document.createElement("li"), { textContent: text })));

  for (const id of ["plan-warmup", "cardio-title", "plan-cardio", "shuffle", "plan-tip"]) $(id).hidden = w.rest;
  $("plan-warmup").previousElementSibling.hidden = w.rest;
  $("lifts-title").textContent = w.rest ? "Today" : w.superset ? "Lifts (A and B are supersets)" : "Lifts";

  const list = $("plan-exercises");
  list.replaceChildren();
  if (w.rest) {
    for (const step of w.steps) list.append(Object.assign(document.createElement("li"), { textContent: step, className: "step" }));
    return;
  }
  $("plan-warmup").textContent = w.warmup;
  $("plan-cardio").textContent = w.cardio;

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
  // Locking in again updates the time of day, keeping today's exercises.
  const today = dayKey();
  const previous = state.locked[today];
  state.locked[today] = { at: Date.now(), shuffle: previous?.shuffle ?? 0, done: previous?.done ?? [] };
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

function showBlurb() {
  $("aim-blurb").textContent = AIMS[$("aim-input").value]?.blurb ?? "";
}
$("aim-input").addEventListener("input", showBlurb);

function openSettings() {
  $("aim-input").value = AIMS[state.aim] ? state.aim : "maintain";
  $("gym-input").value = GYMS[state.gym] ? state.gym : "pf";
  showBlurb();
  $("settings").showModal();
}

$("open-settings").addEventListener("click", openSettings);

$("settings").addEventListener("close", () => {
  if ($("settings").returnValue !== "save") return;
  state.aim = $("aim-input").value;
  state.gym = $("gym-input").value;
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
