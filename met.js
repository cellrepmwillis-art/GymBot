// Calories burned, from METs: how many times resting energy an activity
// uses. Calories = MET × body weight in kg × hours. Values are from the
// Compendium of Physical Activities (2024 adult compendium), rounded to the
// closest listed activity. They're estimates; real burn varies a lot from
// person to person.
export const MET = {
  warmup: 3.5, // easy bike or treadmill
  lifting: 3.5, // resistance training, multiple exercises, 8–15 reps
  circuit: 4.3, // circuit training, moderate, minimal rest
  easyWalk: 3.0, // walking about 2.5 mph
  briskWalk: 4.3, // walking about 3.5 mph
  inclineWalk: 5.3, // walking about 3 mph uphill, 6–15% grade
  easyMachine: 4.0, // easy elliptical or stationary bike
  moderateMachine: 5.0, // elliptical or bike, moderate effort
  easyRun: 8.3, // running about 5 mph
  tempo: 10.0, // tempo run: easy start and finish, about 6.5 mph in the middle
  intervals: 9.0, // intervals: hard repeats with easy recoveries
  stretching: 2.3, // stretching, mild
};

const LB_TO_KG = 0.4536;

// Calories for the items whose ids are in `done`, for someone weighing
// `weightLb`. Items carry { id, minutes, met }.
export function caloriesBurned(items, done, weightLb) {
  const kg = weightLb * LB_TO_KG;
  const set = new Set(done);
  const total = items.filter((item) => set.has(item.id)).reduce((sum, item) => sum + (item.met * kg * item.minutes) / 60, 0);
  return Math.round(total);
}
