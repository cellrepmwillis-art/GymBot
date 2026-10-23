import { dayKey, previousDay } from "./day.js";
import { AIMS, GYMS, DAY_NAMES, TARGETS, TARGET_LABELS, TRAINERS, suggest, gymDay, timeWindow, caloriesBurned } from "./workouts.js";

// Shown at the bottom of Settings, to check which version a phone is running.
const VERSION = "2026-10-24 · 2:00 AM";
const STORAGE_KEY = "gymbot";
const KEEP_DAYS = 60;
// Weight used for calories burned until one is entered.
const DEFAULT_WEIGHT_LB = 170;

const $ = (id) => document.getElementById(id);

// ---- Storage (everything lives in this browser's localStorage) ----

function load() {
  // locked: { "2026-10-23": { at, shuffle, focus, done, active, burned } } for
  // every day the Lock in button was pressed. `at` keeps the workout picked
  // for the time it was locked in, even if the app is opened again later.
  // `focus` is a body part picked instead of the split, `done` the ids of
  // the items locked so far, `active` whether the workout screen is open
  // (until Lock out) and `burned` the calories from the locked items.
  // focus: { day, target }, the body part picked on the options screen. It
  // only applies to that day; the next day starts back on the split.
  // trainer: a key of TRAINERS (the "AI Trainer" setting); shotDay: the
  // weekday of a weekly GLP-1 shot, or "".
  // weightLb: for calories burned; null uses CookBot's weight, if any.
  // apiKey: the person's Anthropic API key, for Ask the trainer. chat: today's
  // questions, { day, history, shown: [{ q, a }], context }, where history is
  // the conversation as sent to the API and context the last workout
  // description sent with a question.
  const defaults = {
    aim: "maintain", gym: "pf", trainer: "none", shotDay: "", weightLb: null,
    locked: {}, focus: null, apiKey: "", chat: null,
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
const workout = (date, target, shuffle = 0) =>
  suggest({ date, aim: state.aim, gym: state.gym, trainer: state.trainer, shotDay: state.shotDay, target, shuffle });

// Today's locked-in workout, or null.
function lockedWorkout() {
  const lock = state.locked[dayKey()];
  return lock ? { lock, w: workout(new Date(lock.at), lock.focus, lock.shuffle) } : null;
}

// Short trainer names for the chip on the options screen.
const TRAINER_CHIPS = { bodybuilder: "Bodybuilder", powerlifter: "Powerlifter", marathon: "Marathon", weightLoss: "Weight loss", glp1: "GLP-1" };

// A padlock, open or shut.
function lockIcon(locked) {
  const shackle = locked ? "M8 11V7a4 4 0 0 1 8 0v4" : "M8 11V7a4 4 0 0 1 7.6-1.8";
  return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="${shackle}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><rect x="5" y="11" width="14" height="10" rx="2.5" fill="currentColor"/></svg>`;
}

function showScreen(workoutOpen) {
  $("options-screen").hidden = workoutOpen;
  $("workout-screen").hidden = !workoutOpen;
  $("open-ask").hidden = !workoutOpen;
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
  // The split's "Pull A" names stay out of sight: "Today: Back and biceps",
  // or "Today: Back (selected)" for a body part picked under Focus.
  const split = /^(Push|Pull|Legs) [AB]$/.test(today.title) ? today.focus.replace(/ \(.*\)$/, "") : today.title;
  $("now-split").textContent = target ? `Today: ${TARGET_LABELS[target]} (selected)`
    : today.rest ? "Today: rest day. Lock in for a recovery plan, or pick a body part to train."
    : `Today: ${split}`;

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
    if (lock?.burned) mark.textContent = lock.burned;
    else mark.textContent = lock ? "✓" : i === 6 ? "–" : "";
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

  const lock = state.locked[todayKey];
  $("lock-in-label").textContent = lock?.done?.length ? "Lock back in" : "Lock in";
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
    done: same ? previous.done ?? [] : [],
    active: true,
    burned: 0,
  };
  save();
  render();
  window.scrollTo({ top: 0 });
});

// ---- Workout screen ----

function renderWorkout() {
  const today = lockedWorkout();
  if (!today) return;
  const { lock, w } = today;

  $("plan-title").textContent = w.rest ? w.title : `${w.title} · ${w.day} ${w.window.label.toLowerCase()}`;
  $("plan-focus").textContent = w.focus;
  $("plan-minutes").textContent = w.rest ? "Rest" : `~${w.minutes} min`;

  const notes = w.rest ? [] : w.notes;
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
  save();

  $("locked-count").textContent = `${done.size} of ${w.items.length} locked`;
  $("burned").textContent = `🔥 ${lock.burned.toLocaleString()} cal burned`;
  $("bar-fill").style.width = `${(done.size / w.items.length) * 100}%`;
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
      detail.textContent = [item.main ? "Main lift" : pair, rest, item.alternative ? `Taken? ${item.alternative}` : null].filter(Boolean).join(" · ");
      const ask = document.createElement("button");
      ask.type = "button";
      ask.className = "link-btn ask-about";
      ask.textContent = "Ask about form";
      ask.addEventListener("click", (event) => {
        event.stopPropagation();
        $("ask-input").value = `Quick form check on ${item.name.toLowerCase()}: what should I focus on?`;
        $("ask-card").scrollIntoView({ behavior: "smooth", block: "start" });
        $("ask-input").focus({ preventScroll: true });
      });
      detail.append(" ", ask);
    } else {
      detail.textContent = item.text ?? "";
    }
    if (detail.textContent) body.append(detail);

    li.append(toggle, body);
    li.addEventListener("click", () => {
      if (done.has(item.id)) done.delete(item.id); else done.add(item.id);
      lock.done = [...done];
      renderWorkout();
    });
    list.append(li);
  }
  $("shuffle-row").hidden = lifts === 0;
}

$("shuffle").addEventListener("click", () => {
  const today = lockedWorkout();
  if (!today) return;
  today.lock.shuffle = (today.lock.shuffle ?? 0) + 1;
  // New exercises start unlocked; the warm-up, run and cardio stay as they were.
  today.lock.done = today.lock.done.filter((id) => !id.startsWith("ex"));
  renderWorkout();
});

$("lock-out").addEventListener("click", () => {
  const lock = state.locked[dayKey()];
  if (lock) lock.active = false;
  save();
  render();
  window.scrollTo({ top: 0 });
});

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
  $("weight-input").value = state.weightLb ?? "";
  $("key-input").value = state.apiKey;
  showSettingsHints();
  $("settings").showModal();
}

$("open-settings").addEventListener("click", openSettings);

$("settings").addEventListener("close", () => {
  if ($("settings").returnValue !== "save") return;
  const lb = Number($("weight-input").value);
  state.weightLb = lb > 0 ? lb : null;
  state.apiKey = $("key-input").value.trim();
  save();
  render();
});

// ---- Start ----

function render() {
  const open = Boolean(state.locked[dayKey()]?.active);
  showScreen(open);
  if (open) {
    renderWorkout();
    renderChat();
  } else {
    renderOptions();
  }
}

render();
// Keep the clock and time of day current while the options screen is open.
setInterval(() => { if (!$("options-screen").hidden) renderOptions(); }, 30 * 1000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });

if ("serviceWorker" in navigator) {
  // updateViaCache: check sw.js itself for changes on every open, too.
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).catch(() => {});
}
