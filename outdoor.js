// The "Outdoors & home" gym: the same plans with no gym. Bodyweight moves, a
// park bench, and things most homes have: a resistance band, a backpack with
// a few books in it, water jugs or bottles. Every exercise has three
// choices, keyed by the split or body part it replaces.

const E = (name, reps) => (reps ? { name, reps } : { name });

const PUSH_UP = [E("Push-up"), E("Incline push-up (hands on a park bench)"), E("Knee push-up")];
const DECLINE = [E("Decline push-up (feet on a bench)"), E("Wide push-up"), E("Band chest press")];
const PIKE = [E("Pike push-up"), E("Band overhead press"), E("Backpack overhead press")];
const FLY = [E("Band chest fly"), E("Slow push-up (3 seconds down)"), E("Push-up hold (halfway down)", "20–30 sec")];
const LATERAL = [E("Band lateral raise"), E("Water-bottle lateral raise"), E("Plank shoulder tap")];
const TRICEPS = [E("Bench dip (park bench or chair)"), E("Diamond push-up"), E("Band triceps pushdown")];
const ROW = [E("Backpack bent-over row"), E("Inverted row (low park bar or sturdy table)"), E("Band row")];
const BAND_ROW = [E("Band seated row"), E("Single-arm backpack row"), E("Superman")];
const PULLDOWN = [E("Band lat pulldown (anchored high)"), E("Superman"), E("Reverse snow angel")];
const STRAIGHT_ARM = [E("Band straight-arm pulldown"), E("Prone Y-T-W raise"), E("Reverse snow angel")];
const REAR_DELT = [E("Band face pull"), E("Prone reverse fly with water bottles"), E("Wall angel")];
const CURL = [E("Backpack curl"), E("Band curl"), E("Water-jug curl")];
const HAMMER = [E("Water-jug hammer curl"), E("Band hammer curl"), E("Towel curl hold", "20–30 sec")];
const LOWER_BACK = [E("Superman"), E("Bird dog"), E("Bodyweight good morning")];
const SQUAT = [E("Bodyweight squat"), E("Backpack goblet squat"), E("Sit-to-stand from a bench")];
const LUNGE = [E("Walking lunge"), E("Reverse lunge"), E("Split squat")];
const STEP_UP = [E("Step-up onto a park bench"), E("Wall sit", "30–60 sec"), E("Bulgarian split squat (back foot on a bench)")];
const BRIDGE = [E("Glute bridge"), E("Single-leg glute bridge"), E("Hip thrust (shoulders on a bench)")];
const HAMSTRING = [E("Hamstring walkout"), E("Sliding leg curl (towel on a smooth floor)"), E("Band leg curl")];
const HINGE = [E("Single-leg Romanian deadlift"), E("Backpack Romanian deadlift"), E("Bodyweight good morning")];
const SPLIT_SQUAT = [E("Bulgarian split squat (back foot on a bench)"), E("Reverse lunge"), E("Step-up onto a park bench")];
const HIPS = [E("Side-lying leg raise"), E("Band lateral walk"), E("Fire hydrant")];
const CALF = [E("Calf raise on a step"), E("Single-leg calf raise"), E("Calf raise hold", "30–45 sec")];
const CORE = [E("Plank", "30–60 sec"), E("Dead bug"), E("Bird dog")];

export const OUTDOOR = {
  pushA: [PUSH_UP, DECLINE, PIKE, FLY, LATERAL, TRICEPS],
  pullA: [ROW, BAND_ROW, [E("Backpack row (both arms)"), E("Band straight-arm pulldown"), E("Prone Y-T-W raise")], REAR_DELT, CURL, HAMMER],
  legsA: [SQUAT, LUNGE, STEP_UP, BRIDGE, CALF, CORE],
  pushB: [PIKE, PUSH_UP, DECLINE, LATERAL, FLY, [E("Diamond push-up"), E("Bench dip (park bench or chair)"), E("Band overhead triceps extension")]],
  pullB: [ROW, PULLDOWN, STRAIGHT_ARM, REAR_DELT, CURL, LOWER_BACK],
  legsB: [HINGE, SPLIT_SQUAT, BRIDGE, HAMSTRING, HIPS, CALF],
  runnerLegs: [SPLIT_SQUAT, HINGE, [E("Step-up onto a park bench"), E("Lateral step-up onto a bench"), E("Walking lunge")], CALF, HIPS, [E("Side plank", "30 sec each side"), E("Dead bug"), E("Bird dog")]],
  chest: [PUSH_UP, DECLINE, [E("Band chest press"), E("Backpack floor press"), E("Close-hands push-up")], FLY, [E("Incline push-up (hands on a park bench)"), E("Wide push-up"), E("Knee push-up")], TRICEPS],
  back: [ROW, PULLDOWN, BAND_ROW, STRAIGHT_ARM, REAR_DELT, LOWER_BACK],
  shoulders: [PIKE, [E("Band overhead press"), E("Backpack overhead press"), E("Water-bottle Arnold press")], LATERAL, REAR_DELT, [E("Prone Y-T-W raise"), E("Wall angel"), E("Reverse snow angel")], [E("Backpack shrug"), E("Band shrug"), E("Water-jug farmer's carry", "40–60 sec")]],
  biceps: [CURL, HAMMER, [E("Band curl (slow lowering)"), E("Water-bottle concentration curl"), E("Backpack drag curl")], [E("Underhand inverted row (low park bar)"), E("Chin-up (park bar)"), E("Band curl hold", "20–30 sec")], [E("Band reverse curl"), E("Backpack reverse curl"), E("Water-jug reverse curl")], [E("Water-jug farmer's carry", "40–60 sec"), E("Band wrist curl"), E("Towel wring", "20–30 sec")]],
  triceps: [[E("Diamond push-up"), E("Close-hands push-up"), E("Knee diamond push-up")], [E("Bench dip (park bench or chair)"), E("Chair dip"), E("Bench dip, knees bent")], [E("Band triceps pushdown"), E("Band overhead triceps extension"), E("Backpack overhead extension")], [E("Band kickback"), E("Water-bottle kickback"), E("Backpack kickback")], [E("Bench skull crusher (hands on a bench)"), E("Incline close-hands push-up"), E("Band skull crusher")], [E("Plank to push-up"), E("Push-up hold (halfway down)", "20–30 sec"), E("Pike push-up")]],
  legs: [SQUAT, LUNGE, BRIDGE, HAMSTRING, STEP_UP, CALF],
  fullBody: [SQUAT, PUSH_UP, ROW, HINGE, PIKE, CORE],
  abs: [[E("Crunch"), E("Bicycle crunch"), E("Reverse crunch")], [E("Lying leg raise"), E("Hanging knee raise (park bar)"), E("Flutter kicks", "30–45 sec")], CORE, [E("Water-bottle Russian twist"), E("Band woodchop"), E("Side plank", "30 sec each side")], [E("Mountain climber", "30–45 sec"), E("Plank shoulder tap"), E("Bear crawl hold", "30 sec")], [E("Side plank", "30 sec each side"), E("Water-jug side bend"), E("Hollow hold", "20–30 sec")]],
};
