// Everyday Food & health notes from body weight, height and aim: protein,
// water and sleep. Protein matches CookBot's daily goal so the two apps
// agree.

const PROTEIN_PER_LB = { gain: 1.0, maintain: 0.8, cut: 1.0 };

// Protein in grams a day: about 1 g per pound of body weight on a cut or a
// gain (0.8 to maintain). Past a BMI of 30 it uses the weight at a BMI of 30
// for the height, since the rule is meant for lean lifters. Returns
// { grams, capped } or null without a weight.
export function proteinTarget({ weightLb, heightIn, aim }) {
  if (!(weightLb > 0)) return null;
  const healthyLb = heightIn > 0 ? (30 * heightIn * heightIn) / 703 : Infinity;
  const baseLb = Math.min(weightLb, healthyLb);
  return { grams: Math.round((baseLb * (PROTEIN_PER_LB[aim] ?? 0.8)) / 5) * 5, capped: baseLb < weightLb };
}

// Water in ounces a day: a common rule of thumb of about half your body
// weight in ounces, rounded to the cup.
export function waterOunces(weightLb) {
  return weightLb > 0 ? Math.round(weightLb / 2 / 8) * 8 : null;
}

// The notes, in order: protein, water, sleep. `weightLb` is null when it
// isn't known yet.
export function healthNotes({ weightLb, heightIn, aim }) {
  const protein = proteinTarget({ weightLb, heightIn, aim });
  const water = waterOunces(weightLb);
  const why = { cut: "high on a cut, to keep muscle while you lose fat", gain: "to build new muscle", maintain: "to build muscle while your weight holds" }[aim] ?? "to build muscle";
  return [
    protein
      ? `Protein: about ${protein.grams} g today, ${why}${protein.capped ? " (based on a healthy weight for your height)" : ""}. CookBot tracks it.`
      : "Protein: add your weight in Settings for a daily protein target.",
    water
      ? `Water: about ${water} oz (${water / 8} cups) through the day, a common rule of thumb of half your body weight in ounces, plus 16–24 oz around your workout. More in the heat.`
      : "Water: sip through the day and drink 16–24 oz around your workout. More in the heat.",
    "Sleep: 7–9 hours tonight. The CDC recommends at least 7 for adults, and muscle repairs while you sleep.",
  ];
}

// A trainer's own notes first, then the everyday ones it doesn't already
// cover, up to `max`.
export function mergeHealth(own, everyday, max) {
  const covers = (word) => own.some((note) => new RegExp(word, "i").test(note));
  const extra = everyday.filter((note) => {
    const topic = note.split(":")[0];
    // A trainer's protein note only covers it with a number of grams.
    return !(topic === "Protein" && covers("protein.*\\d+ g")) && !(topic === "Water" && covers("water")) && !(topic === "Sleep" && covers("sleep"));
  });
  return [...own, ...extra].slice(0, max);
}
