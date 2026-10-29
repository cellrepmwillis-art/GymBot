# GymBot

A workout picker that runs on your phone. It opens on an options screen: today's day and time, a focus, your aim, the AI Trainer, your gym and this week's progress. Tap **Lock in** and it switches to a screen with only today's workout and **Ask the trainer**. Tap **Lock out** at the bottom to go back to the options. Locking back in later the same day keeps your progress.

On the workout screen every part of the session (warm-up, run, each exercise, cardio) has an open padlock. Tap it when you finish that part and it locks. Locked parts add up to **calories burned**, shown at the top along with how many parts you've locked. Equipment is what a typical American gym has (Planet Fitness, Anytime Fitness and the like).

- **The week:** with the **Standard** setting (what you get without choosing anything), full body on Monday, Wednesday and Friday, mostly on machines with 2 sets of 10–12, and a 40-minute walk or easy cardio on Tuesday, Thursday and Saturday. That's how ACSM and the HHS guidelines start people out, it meets the weekly guidelines on its own (150+ cardio minutes, strength 3 days), and it's fine to stay on for good: Standard carries the most tips and safeguards, like finding machine settings, starting light, when to add weight, and soreness versus pain. For people used to training, **Push, pull, legs** (under AI Trainer) runs push, pull, legs twice, Monday to Saturday. Sunday is a rest day: about 11 minutes of gentle stretching and nothing else, so the day stays a recovery day. To train anyway, you have to pick a body part under Focus. You can pick a different rest day in Settings; the six workouts then run in order on the days after it (with Wednesday off, Thursday is Push A and Tuesday Legs B), and the marathon week moves the same way. Changing it can't be used to soft-reset the week. Picked ahead of time (any day but the new rest day itself), this week stays exactly as it is and the new rest day starts after this week's rest day; the days in between run as a short week up to it (Sunday off, switched to Wednesday on Thursday: this week ends Sunday as planned, Monday and Tuesday run, Wednesday is the first new rest day and weeks run Thursday to Wednesday after that). Settings says when it starts. Picked on the day itself, to take today off, it says **"Atlas can't drop the world without notice."** and offers a choice: an **unexpected rest day** today (with the usual streak rules, and the rest day stays as it was), or the **new rest day from today**, which re-plans the rest of this week (days already done keep their workouts, and the week carries on from them). That second choice works once a week; after that it's greyed out and only the unexpected rest day is left, so missed workouts stay owned.
- **Healing:** in Settings, pick a part of the body (chest, back, shoulders, arms, legs, stomach and sides) and whether it's a **new tattoo** or a **minor injury**. For 14 days from when you set it, the plan works around it, then goes back to normal by itself: a day that would work that area trains something else (a chest tattoo on push day becomes leg day; User selected moves its turn the same way), and full-body days drop the moves that work it. A body part you pick yourself under Focus or the Body part drop-down stays, with a caution to go light. The options screen says "· around your chest" while it's changing the day. Tips are kept apart because the two heal differently: a tattoo gets loose clean clothing, wiping down pads, a bench-pad warning for back tattoos, staying out of the sun outdoors, washing it after and no pools, hot tubs or saunas; an injury gets "pain is the stop sign", a bike-or-elliptical note for legs, and when to see a doctor or physical therapist. Ask the trainer is told about it too. Past days aren't changed.
- **No back-to-back body parts:** if two days in a row would train the same body part (two leg days, say, after a healing swap, or a body part you picked next to the same one in the plan), one of them becomes an unexpected rest day automatically: whichever is farther from the week's other rest days (the scheduled one and any unexpected ones), so rest is spread out, the later one on a tie. Days already done and days you set by hand (a picked body part, an override, a workout already locked in) stay as they are, so the other day rests. It's marked 💤 in the week strip ahead of time, the options screen says "Today: unexpected rest day · two leg days in a row", and **Work out anyway** still works. These rest days don't count toward the unexpected rest day limit, don't break a streak and don't count against a full Locksmith week. A normal week never has any.
- **Rest-day reminder:** opening the app on your rest day shows a quote about rest with **Exit** and **Lock in anyway**. Exit leaves you be (it closes the app where the phone allows it). Lock in anyway goes to the options screen so you can pick a body part and train; the reminder doesn't come back that day.

  | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
  |-----|-----|-----|-----|-----|-----|-----|
  | Push A (chest) | Pull A (back width) | Legs A (squat) | Push B (shoulders) | Pull B (back thickness) | Legs B (hinge) | Rest |

- **User selected:** a Focus choice you set up once and that repeats every training day until you pick Default: your cardio (12-3-30, which is a treadmill at 12% incline and 3 mph, or an incline walk, StairMaster, elliptical, bike, rower, run or brisk walk; walks, hikes and runs for Outdoors & home), 20 to 60 minutes of it, and your lifting, all as one session, so it never runs into the session limit. Lifting is one body part a day (chest, back, legs, shoulders, biceps, triceps across the six training days), full body every other day (3 days a week with a day between, the most ACSM recommends for the same muscles), or none. 12-3-30 is about 8.3 METs by the ACSM walking equation, vigorous, so it counts double toward the weekly 150 cardio minutes. "Edit user selected" changes it, and a "Body part" drop-down under the workout title swaps the day's body part (or drops the lifting) for that day only; the rest day stays a rest day, and picking a body part for a day still works.
- **One body part instead:** the Focus buttons on the options screen (Default is the normal plan) switch the workout to Chest, Back, Shoulders, Biceps, Triceps, Legs, Abs or Full body. It works on any day, Sunday included, and still follows the time of day, your aim and your gym. Biceps, triceps and abs use the lighter rep range for every exercise (abs use 12–20 reps), and holds like planks are timed. The choice lasts for the day; tomorrow starts back on the split.
- **Time of day:** decides how long the session is and how busy the gym likely is.

  | Time | Session |
  |------|---------|
  | 3am–6am | Full session, longer warm-up |
  | 6am–9am (before work) | Trimmed to 5 exercises |
  | 9am–11am, 2pm–4pm | Full session, quiet gym |
  | 11am–2pm (lunch) | Express: 4 exercises as supersets |
  | 4pm–8pm (peak) | Full session; each exercise lists a swap for when it's taken |
  | 8pm–11pm | Full session, easy cardio |
  | 11pm–3am (after midnight it's the new day's workout) | 5 exercises, easy cardio; a reminder that many Planet Fitness clubs aren't 24 hours |

  A new day starts at midnight: the options, the workout and today's padlocks switch over then, even if the app is open.

- **Aims:** Gain, Maintain or Cut, the same three as CookBot. All three build muscle; they differ in what your weight does. **Cut** loses fat while keeping and building muscle, **Maintain** keeps your weight steady while building muscle (your weight holds, but your lifts keep climbing), and **Gain** adds healthy mass and muscle.

  | Aim | Main lift | Other lifts | Cardio |
  |-----|-----------|-------------|--------|
  | Gain | 4 × 6–8, rest 2–3 min | 3 × 8–12, rest 90 sec | Optional 5–10 min cool-down |
  | Maintain | 3 × 8–10, rest 2 min | 3 × 10–12, rest 75 sec | 10–20 min steady |
  | Cut | 3 × 6–8, rest 2 min (heavy, to keep muscle) | 3 × 12–15, rest 45–60 sec, as supersets when the gym isn't packed | 15–30 min incline treadmill walk |

- **AI Trainer:** "Train like a" changes the plan to match published guidance for that kind of athlete or situation. For now it uses built-in rules, not a live AI, and each workout lists the sources it follows.

  | Trainer | What changes | Based on |
  |---------|--------------|----------|
  | Standard | The plan above: full body 3 days, cardio days between, machines first, 2 sets | ACSM, HHS |
  | Push, pull, legs | Push, pull, legs twice a week, six days on (the tables below describe this week) | |
  | Bodybuilder | 6–10 reps on the main lift, 8–12 (10–15 on a cut) on the rest, 60–90 sec rests, sets to 1–2 reps short of failure | ACSM progression models, Bodybuilding.com, Schoenfeld's hypertrophy research |
  | Powerlifter | Main lift 4–5 × 3–5 with 3–5 min rests, deadlift added on Pull A, 5 exercises, no supersets, light cardio. Suggests an Anytime Fitness style gym, since Planet Fitness has no barbells for squats or deadlifts | ACSM, NSCA |
  | Marathon runner | A running week: easy run + upper body, speed intervals, easy run + single-leg strength, tempo run + upper body, cross-training + core, long run, Sunday off. Lifting is 4 exercises, done after the run | ACSM, Runner's World, the 80/20 guideline |
  | Weight loss | Circuit-style supersets with 30–45 sec rests and 35–45 min of moderate cardio a day, about 200–300 min a week | HHS Physical Activity Guidelines, American Heart Association, ACSM position stand on weight loss, LiveStrong |
  | GLP-1 medication (Mounjaro, Zepbound, Ozempic, Wegovy) | Lifting comes first to keep muscle, 5 exercises with full rests and no supersets, easy cardio, tips on eating before training, water and dizziness. With a weekly shot day set, that day and the next are lighter (4 exercises and a walk) | 2025 joint advisory on GLP-1 nutrition (ACLM, ASN, OMA, The Obesity Society), HHS, AHA, the drugs' prescribing information |

  None of this is medical advice. On a GLP-1 medication, check with your prescriber before starting a new program.
- **Gym:** "Planet Fitness style" uses Smith machines, dumbbells, cables and machines only. "Anytime Fitness style" also uses barbells and squat racks for the main lifts. **Outdoors & home** is for people who don't go to a gym: parks, tracks and the living room. The same plans use bodyweight moves, a park bench, a resistance band, a backpack with a few books in it or water jugs, with higher rep ranges (10–15 for the first exercise, 12–20 after). Cardio is walking at the park or around a track, brisk with hills on a cut, and "Cardio only" is a 45-minute walk. Gym-crowd notes go away, "Taken?" becomes "Swap:", and weekly badges say "worked out" instead of "hit the gym".
- **Same exercises each week:** the plan repeats week to week, so you can add weight or reps.
- **Swap an exercise:** under each exercise, "Taken?" names an alternative. Tap it to swap that exercise in; tap again to move to the third choice, and again to come back around. Each exercise cycles through three choices. With the AI Trainer off, the planned one comes first, then one each of machines (Smith machines included), dumbbells or barbells, and anything else (cables, bodyweight). With a trainer on, each exercise starts with that trainer's favorite equipment and swaps follow its order: powerlifter barbell then Smith machine, bodybuilder cables then machines, weight loss machines then cables (quick to set up for circuits), GLP-1 machines then Smith machine (guided movement on a lightheaded day), marathon dumbbells and bodyweight (balance and single-leg strength). A swapped exercise starts unlocked. Every exercise has at least three choices at either kind of gym.
- **More than one session a day:** "＋ Add a session" above the checklist adds a **Cardio session** or a **Strength session** for a body part you pick, each with its own locks and calories, shown as tabs ("1 · Plan", "2 · Back", "3 · Cardio"). Calories, the week strip and weekly goals add up every session; the day's streak and celebration still come from the plan. How many sessions a day depends on the trainer, following common recommendations (the plan counts as one strength session, or cardio under the cardio-only override):

  | Trainer | Strength | Cardio | Most in a day |
  |---|---|---|---|
  | Standard, Push pull legs, GLP-1, powerlifter | 1 | 1 | 2 |
  | Bodybuilder | 2 | 1 | 3 |
  | Weight loss | 1 | 2 | 3 |
  | Marathon, or the Outdoors & home gym | 2 | 3 | 4 |

  The split between strength and cardio is a recommendation: once one kind is used up, the dialog offers the other first and shows "Strength session anyway" (or cardio), which asks before adding it. The total is firm. Past it: "Don't break the lock: even Hercules needed a rest." Rest days don't add sessions. An extra session can be removed with "Remove this session".
- **Cardio only / strength training only:** two overrides under the workout. **Cardio only override** swaps the lifting for a warm-up and one longer cardio session (45 min, or 30 when time is short), matched to your aim and trainer: incline walking on a cut or weight loss, steady machines otherwise, brisk walking for GLP-1, an easy run for marathon. On a marathon run day, it's just the run. **Strength training only override** drops the cardio and the run and keeps the lifting. Tap the override that's on to go back to the full plan. Anything already locked stays locked. The rest day has no overrides; training on it takes picking a body part.
- **Unexpected rest day:** for sick days and emergencies, from the third override on the workout screen or "Need an unexpected rest day?" under Focus on the options screen. The day has nothing to lock, not even stretches, so nothing nudges you to do more; it's just "Rest up." It's marked 💤 in the week strip. (The scheduled rest day keeps its optional stretches.) Rest days are counted per training week, the scheduled one first:

  | Unexpected rest day this week | Rest day | GymBot says | Streak |
  |---|---|---|---|
  | 1st | 2nd | "No problem taking an extra day, you deserve it, boss." | Safe |
  | 2nd | 3rd | "Got it, hope you feel better. Back to locking in tomorrow, champ." | Safe |
  | 3rd or more | 4th+ | "Your streak will be lost. Proceed to cut the lock?" (Cut the lock / Keep my streak) | Lost |

  **Feeling better? Work out anyway** stays available all day. Picking a different Focus on the options screen during an unexpected rest day doesn't end it: **Back to my rest day** still goes back, and the new focus waits for Work out anyway. It asks first, keeps the day excused (the streak is covered if the workout isn't finished) and counts it as a workout if it is; **Back to my rest day** switches back. Switching keeps everything already locked on both sides. Excused rest days don't break a streak, but a full-week Locksmith still takes all six training days.
- **See example:** every exercise and stretch has a ▶ See example link that opens a YouTube search for it done with good form (in the YouTube app, on phones that have it). Tapping the link doesn't lock the exercise.
- **Celebrations:** locking the last lock of the day brings up a "Locked in!" screen with confetti, a buzz on phones that support it, the day's calories and any milestones, and a **Dismiss** button that leaves you on your workout. It shows once a day; unlocking and relocking doesn't repeat it. Milestones:
  - 🏆 every training day of the week finished: "You locked in this week: all six days' goals met. Official Locksmith level achieved." Four full weeks make you a Master Locksmith and twelve a Vault Keeper.
  - 💪 5 or 6 of the past 7 days: "Arnold would be proud."
  - 🔥 streaks of 3, 7, 14, 21, 30 days and on. Rest days are skipped, so they never break one.
  - 🔑 your first fully locked day, and ⭐ 10, 25, 50, 100 and more.
- **Weekly goals:** celebrated the moment they're reached, even mid-week and even without a full Locksmith week. They follow the US physical activity guidelines (HHS, backed by the American Heart Association): at least 150 minutes of moderate cardio a week (vigorous minutes, like running, count double) and strength training on 2 or more days.

  | Badge | When |
  |---|---|
  | 🏅 Certified Maintainer | Gym on 2 days this week ("Looks like you managed to hit the gym twice this week.") |
  | 🏅 Certified Regular | 3 days |
  | 🐀 Certified Gym Rat | 4 days ("You hit the gym four days this week.") |
  | 🦾 Certified Iron Addict | 5 days (6 is Locksmith) |
  | 🏋️ Certified Strong | Strength training on 2 days, the HHS minimum |
  | ❤️ Certified Heart Healthy | 150 cardio minutes |
  | 🫀 Certified Cardio Machine | 300 cardio minutes, the top of the guideline range |

  A gym day is any day with something locked past the warm-up. Cardio minutes come from locked warm-ups, cardio and runs. Each badge shows once per training week, and the options screen tracks progress, like "3 gym days · 95 of 150 cardio min · strength 2 of 2 days ✓".
  The rest day gets a quieter "Recovery locked in" and doesn't count toward any of them. The options screen shows your current streak and Locksmith level under This week. Locked-in days are now kept for about a year so long streaks count.
- **Lock-In Weight:** on the options screen, under This week. Log your weight (about once a week, at the same time of day, works best) and GymBot compares it with your last weigh-in, so each one becomes the starting point for the next. The first is compared with the weight in Settings. Logging again the same day replaces that day's number and still compares with the weigh-in before it. Logging less than a week after the last weigh-in asks first: "No need to call the locksmith yet ... weigh in again in 4 days (Wednesday, Oct 28)", with **I'll wait** or **Lock weight anyway**. A weight locked early isn't judged; it says "No change since your last weigh-in", "Don't sweat that difference" for a normal swing, or that a big swing over a few days is likely water. The box shows when the next weigh-in is due. It judges the pace as a share of body weight a week, against your aim:

  | Aim | On track | Heads up / stalling | Off track |
  |-----|----------|---------------------|-----------|
  | Cut | Losing 0.25–1% a week | Losing faster than 1% a week (muscle loss risk), or flat | Going up: "Lock back in, champ." |
  | Maintain | Within 0.25% a week either way | Drifting up or down (unexpected) | |
  | Gain | Gaining 0.125–0.5% a week | Gaining faster than 0.5% (more fat than muscle), or flat | Losing |

  Nothing is judged until a week has passed, since weight swings a few pounds day to day. With the GLP-1 trainer, the expected range widens to about 0.25–1.5% a week, since GymBot doesn't know how far into treatment you are: loss is fastest in the first months and levels off after about a year (in the trials, semaglutide 2.4 mg averaged about 15% over 68 weeks and tirzepatide about 15–21% over 72 weeks). The verdict then shows both, for example "A regular cut would usually be down about 3.0–6.0 lb by now. On a GLP-1, about 1.5–9.0 lb is in the expected range." Faster than a regular cut counts as on track, flat reads as "leveling off", over 1.5% a week is still flagged, and losing on Maintain is expected. Each weigh-in also becomes the weight used for calories burned.
- **Edit earlier days:** tap an earlier day of this plan week in the week strip (on the options screen, or on the rest-day screen without locking in) to open its workout and lock what you forgot, unlock a mis-tap, swap exercises or use an override. A banner shows which day you're editing, and **Done editing** goes back. Overrides on an earlier day ask first ("You're editing Wednesday, not today. Change that day to cardio only?"), so a real workout isn't changed by accident; locks are kept either way. Streaks, weekly goals, calories and celebrations follow the edits. Days before this plan week can't be opened, and upcoming days stay closed: tapping one shows "One key at a time. Turn today's key in the lock before you open tomorrow's door." GymBot is meant to be opened in the gym and closed when you leave, so it only ever shows today. The week strip now runs in plan-week order, from the day after your rest day to the rest day.
- **Tips and Food & health:** each session has two folded sections, **Tips for this session** (training: the time of day, how to lift, pacing) and **Food & health** (eating, water, sleep, medication and safety), with at most five in each. Every plan's Food & health includes everyday notes after the trainer's own (without repeating a topic the trainer covers): **protein**, about 1 g per pound of body weight on Cut or Gain and 0.8 g on Maintain, matching CookBot, and above a BMI of 30 based on a healthy weight for your height (add your height in Settings); **water**, about half your body weight in ounces as a common rule of thumb, plus 16–24 oz around the workout; and **sleep**, 7–9 hours, as the CDC recommends at least 7 for adults. If training tips run over five, the general time-of-day and gym-hours notes go first.
- **Calories burned:** each part of the workout has an effort level (MET) from the Compendium of Physical Activities, for example 3.5 for lifting, 4.3 for circuits, 5.3 for an incline treadmill walk and 8.3 for an easy run. Calories = MET × your weight in kg × hours, counted only for the parts you've locked. Your weight comes from Settings (or your latest Lock-In Weight); until then it uses 170 lb. These are estimates, and real burn varies from person to person. The week strip on the options screen shows each day's calories and the week's total.
- **Ask the trainer:** type a quick question, like "should I lean forward or back on incline curls?", and get a short gut-check answer without leaving the app. It's on the workout screen; tap 💬 at the top to jump there. Today's workout, aim, trainer and gym go with the question so the answer fits your plan, and you can ask follow-ups. For anything bigger, it suggests a YouTube search for a form video. The chat starts over each day, or after 10 questions.
- **No accounts.** Your settings, locked-in days and today's questions are stored only in your browser's local storage. Locked-in days are kept for about a year.
- **Back up and restore:** clearing Chrome's "Cookies and site data" erases everything above (clearing history or cached files doesn't). Settings → **Back up** saves a `gymbot-backup-<date>.json` file to your downloads, and **Restore** loads one back, after a wipe or on a new phone. The file includes your API key if you added one, so keep it private.

## Ask the trainer (optional)

Answers come from Claude Sonnet 5.5, a balance of speed, quality and cost. The app sends your question and today's workout straight from your phone to the Anthropic API using your own API key. There's no GymBot server.

To use it, get an API key from [console.anthropic.com](https://console.anthropic.com), add some credit, and enter the key in Settings (⚙︎), which also holds your weight. A question costs roughly a penny, so 100 questions a month is under a dollar. Without a key, the rest of the app works as normal and offline; asking needs a connection.

## Running it

It's a static site with no build step, so any static host works: GitHub Pages, Netlify, Cloudflare Pages, or your own server. For example, to turn on GitHub Pages, go to the repo's **Settings → Pages** and deploy from this branch.

Open the URL on your phone and choose **Add to Home Screen** to install it like an app.

To run it locally:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Files

| File | Purpose |
|------|---------|
| `index.html`, `styles.css` | The options and workout screens, and the settings dialog |
| `app.js` | The two screens, Lock in and Lock out, the padlocks, local storage |
| `workouts.js` | The split, body-part workouts, exercise choices, time-of-day windows and aims |
| `trainers.js` | The AI Trainer profiles: bodybuilder, powerlifter, marathon, weight loss and GLP-1 |
| `ask.js` | Ask the trainer (Claude API call) |
| `met.js` | Calories burned: effort levels and the formula |
| `celebrate.js` | The end-of-day celebration, streaks and Locksmith levels |
| `weight.js` | Lock-In Weight: whether weight is moving the right way for the aim |
| `health.js` | Everyday Food & health notes: protein, water and sleep |
| `outdoor.js` | The Outdoors & home exercises |
| `day.js` | The midnight day boundary |
| `sw.js`, `manifest.webmanifest`, `icon*.png`, `icon.svg` | Offline caching, home-screen install and the app icon |
| `vendor/anthropic-sdk-0.131.0.js` | The Anthropic TypeScript SDK (MIT License), bundled into one file, the same as CookBot's |

Tests for the schedule, body-part workouts, trainers, calories burned, celebrations, weight trends, time of day, aims and gym equipment: `node --test`

GymBot and CookBot are separate apps: GymBot doesn't read anything CookBot stores. Its food tips may suggest tracking in CookBot.
