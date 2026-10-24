// Lock-In Weight: how body weight is moving against the aim. The pace is
// judged as a share of body weight per week, the way most guidance puts it:
// losing about 0.5–1% a week is a safe cut (faster risks losing muscle), a
// lean gain is about 0.25–0.5% a week, and within about 0.25% a week either
// way is holding steady. Day-to-day weight swings a few pounds with water and
// food, so nothing is judged until a week has passed.

// Days between two day keys like "2026-10-23".
export function daysBetween(from, to) {
  const date = (key) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((date(to) - date(from)) / (24 * 60 * 60 * 1000));
}

const STEADY = 0.25; // % of body weight a week
const SAFE_LOSS = 1.0;
const LEAN_GAIN = 0.5;

const lbs = (n) => `${Math.abs(n).toFixed(1)} lb`;

// start and latest: { day, lb }. aim: "cut", "maintain" or "gain". Returns
// null before there are two weigh-ins, else { change, weeks, perWeek, tone,
// label, headline, detail }, where tone is "good", "warn" or "bad".
export function analyzeWeight({ start, latest, aim = "maintain", trainer = "none" }) {
  if (!start || !latest || start === latest) return null;
  const change = latest.lb - start.lb;
  const days = daysBetween(start.day, latest.day);
  const base = { change, weeks: days / 7, perWeek: null };
  if (days < 7) {
    return {
      ...base,
      tone: "neutral",
      label: "Too soon to tell",
      headline: `${change === 0 ? "No change" : `${change < 0 ? "Down" : "Up"} ${lbs(change)}`} so far.`,
      detail: "Weight swings a few pounds day to day with water and food. Check back after a week for a real trend.",
    };
  }
  const perWeek = (change / days) * 7;
  const pct = (perWeek / start.lb) * 100;
  const pace = `${perWeek < 0 ? "−" : "+"}${lbs(perWeek)} a week`;
  const glp1 = trainer === "glp1";
  const result = (tone, label, headline, detail) => ({ ...base, perWeek, tone, label, headline: `${headline} (${pace})`, detail });

  if (aim === "cut") {
    if (pct <= -SAFE_LOSS) {
      return result("warn", "Heads up", "Losing fast.", glp1
        ? "Fast loss is common in the first months on a GLP-1, but more of it can come from muscle. Hit your protein goal every day, keep lifting, and mention it to your prescriber if it keeps up."
        : "More than 1% of your body weight a week risks losing muscle along with fat. Eat a little more, keep protein high and keep lifting.");
    }
    if (pct <= -STEADY) return result("good", "On track", "Losing at a safe pace.", "Right where a cut should be: about 0.5–1% of your body weight a week. Keep locking in.");
    if (pct < STEADY) {
      return result("warn", "Stalling", "Weight is holding steady on a cut.", "Plateaus happen. Tighten up your food tracking in CookBot, add 10 minutes to your cardio, and give it another week.");
    }
    return result("bad", "Off track", "Weight is going up on a cut.", "Not the direction we want. Check portions and snacks in CookBot; water and salt can hide progress for a few days too. Lock back in, champ.");
  }

  if (aim === "gain") {
    if (pct >= LEAN_GAIN) return result("warn", "Heads up", "Gaining fast.", "More than 0.5% of your body weight a week is likely more fat than muscle. Trim your calorie surplus a little.");
    if (pct >= STEADY / 2) return result("good", "On track", "Gaining at a lean pace.", "About 0.25–0.5% a week is a lean bulk. Keep adding weight to the bar.");
    if (pct > -STEADY) return result("warn", "Stalling", "Weight is holding steady on a gain.", "Muscle needs a calorie surplus. Add a snack or a bigger meal a day and keep pushing your lifts.");
    return result("bad", "Off track", "Losing weight on a gain.", "You're not eating enough to build muscle. Eat more, especially protein. Lock back in, champ.");
  }

  // Maintain
  if (Math.abs(pct) < STEADY) return result("good", "On track", "Holding steady, as planned.", "Maintaining is the goal. If you want to see change, push your lifts harder or switch Aim to Cut or Gain.");
  if (pct < 0) return result("warn", "Unexpected", "Losing weight while maintaining.", "If you didn't mean to, eat a little more. If you're happy losing, switch Aim to Cut.");
  return result("warn", "Unexpected", "Gaining weight while maintaining.", "If you didn't mean to, trim portions a little or add some cardio. If you're building muscle on purpose, switch Aim to Gain.");
}
