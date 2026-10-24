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

// Days between weigh-ins before a trend means anything.
export const WEEK_DAYS = 7;

const STEADY = 0.25; // % of body weight a week
const SAFE_LOSS = 1.0;
const LEAN_GAIN = 0.5;

// GLP-1 medications (semaglutide, tirzepatide) move the expected pace. We
// don't know how far into treatment someone is, so the range covers the
// whole course: loss is fastest in the first months, often around 1% a week
// or a little more, then levels off. In the big trials, semaglutide 2.4 mg
// averaged about 15% over 68 weeks (STEP 1) and tirzepatide about 15–21%
// over 72 weeks (SURMOUNT-1), most of it in the first nine months or so.
const GLP1_SLOW = 0.25; // slower than this is leveling off
const GLP1_FAST = 1.5; // faster than this is fast even on a GLP-1

// Expected loss by now, as "a–b lb", for `weeks` weeks at `low`–`high`% a week.
const expected = (startLb, weeks, low, high) => `${((startLb * low * weeks) / 100).toFixed(1)}–${((startLb * high * weeks) / 100).toFixed(1)} lb`;

const lbs = (n) => `${Math.abs(n).toFixed(1)} lb`;

// start and latest: { day, lb }. aim: "cut", "maintain" or "gain". Returns
// null before there are two weigh-ins, else { change, weeks, perWeek, tone,
// label, headline, detail }, where tone is "good", "warn" or "bad".
export function analyzeWeight({ start, latest, aim = "maintain", trainer = "none" }) {
  if (!start || !latest || start === latest) return null;
  const change = latest.lb - start.lb;
  const days = daysBetween(start.day, latest.day);
  const base = { change, weeks: days / 7, perWeek: null };
  // Less than a week apart (the app suggests waiting, but you can lock a
  // weight anyway): report the change without judging it.
  if (days < 7) {
    const wait = WEEK_DAYS - days;
    const again = `Weigh in again in ${wait} ${wait === 1 ? "day" : "days"} for the real trend.`;
    const span = days === 0 ? "today" : `in ${days} ${days === 1 ? "day" : "days"}`;
    const big = Math.abs(change) > Math.max(3, start.lb * 0.015);
    return {
      ...base,
      tone: "neutral",
      label: "Too soon to tell",
      headline: Math.abs(change) < 0.1 ? "No change since your last weigh-in." : `${change < 0 ? "Down" : "Up"} ${lbs(change)} ${span}.`,
      detail: Math.abs(change) < 0.1 ? `Steady. ${again}`
        : big ? `That's a big swing for a few days, and most of it is likely water, salt or food. ${again}`
        : `Don't sweat that difference: weight swings a few pounds day to day with water, salt and food. ${again}`,
    };
  }
  const perWeek = (change / days) * 7;
  const pct = (perWeek / start.lb) * 100;
  const pace = `${perWeek < 0 ? "−" : "+"}${lbs(perWeek)} a week`;
  const glp1 = trainer === "glp1";
  const result = (tone, label, headline, detail) => ({ ...base, perWeek, tone, label, headline: `${headline} (${pace})`, detail });

  // On a GLP-1, losing is expected on a cut and on maintain alike.
  if (glp1 && aim !== "gain") {
    const weeks = days / 7;
    const compare = `A regular cut would usually be down about ${expected(start.lb, weeks, 0.5, 1)} by now (0.5–1% of your weight a week). On a GLP-1, about ${expected(start.lb, weeks, GLP1_SLOW, GLP1_FAST)} is in the expected range: faster in the first months, leveling off after about a year.`;
    if (pct <= -GLP1_FAST) return result("warn", "Heads up", "Losing fast, even for a GLP-1.", `${compare} More than 1.5% a week means more of the loss can come from muscle. Hit your protein goal every day, keep lifting, and mention it to your prescriber.`);
    if (pct <= -SAFE_LOSS) return result("good", "On track", "Losing faster than a regular cut, as expected on a GLP-1.", `${compare} Keep protein high and keep lifting so the loss is fat, not muscle.`);
    if (pct <= -GLP1_SLOW) return result("good", "On track", "Losing at a steady pace.", `${compare} Keep locking in.`);
    if (pct < STEADY) {
      return result("warn", "Leveling off", "Weight is holding steady.", `${compare} Loss slowing down is normal later in treatment. If you're in your first few months, or it lasts more than a few weeks, tighten up your food tracking in CookBot and check in with your prescriber.`);
    }
    return result("bad", "Off track", "Weight is going up.", `${compare} Weight going up on a GLP-1 is worth a closer look: check portions in CookBot, and talk to your prescriber if it continues. Lock back in, champ.`);
  }

  if (aim === "cut") {
    if (pct <= -SAFE_LOSS) {
      return result("warn", "Heads up", "Losing fast.", "More than 1% of your body weight a week risks losing muscle along with fat. Eat a little more, keep protein high and keep lifting.");
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
