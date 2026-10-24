# GymBot

A workout picker that runs on your phone. It opens on an options screen: today's day and time, a focus, your aim, the AI Trainer, your gym and this week's progress. Tap **Lock in** and it switches to a screen with only today's workout and **Ask the trainer**. Tap **Lock out** at the bottom to go back to the options. Locking back in later the same day keeps your progress.

On the workout screen every part of the session (warm-up, run, each exercise, cardio) has an open padlock. Tap it when you finish that part and it locks. Locked parts add up to **calories burned**, shown at the top along with how many parts you've locked. Equipment is what a typical American gym has (Planet Fitness, Anytime Fitness and the like).

- **The week:** push, pull, legs, twice, Monday to Saturday. Sunday is a rest day: about 11 minutes of gentle stretching and nothing else, so the day stays a recovery day. To train anyway, you have to pick a body part under Focus. You can pick a different rest day in Settings; the six workouts then run in order on the days after it (with Wednesday off, Thursday is Push A and Tuesday Legs B), and the marathon week moves the same way.
- **Rest-day reminder:** opening the app on your rest day shows a quote about rest with **Exit** and **Lock in anyway**. Exit leaves you be (it closes the app where the phone allows it). Lock in anyway goes to the options screen so you can pick a body part and train; the reminder doesn't come back that day.

  | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
  |-----|-----|-----|-----|-----|-----|-----|
  | Push A (chest) | Pull A (back width) | Legs A (squat) | Push B (shoulders) | Pull B (back thickness) | Legs B (hinge) | Rest |

- **One body part instead:** the Focus buttons on the options screen (Default is the normal plan) switch the workout to Chest, Back, Shoulders, Biceps, Triceps, Legs or Abs. It works on any day, Sunday included, and still follows the time of day, your aim and your gym. Biceps, triceps and abs use the lighter rep range for every exercise (abs use 12–20 reps), and holds like planks are timed. The choice lasts for the day; tomorrow starts back on the split.
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

- **Aims:** Gain, Maintain or Cut, the same three as CookBot.

  | Aim | Main lift | Other lifts | Cardio |
  |-----|-----------|-------------|--------|
  | Gain | 4 × 6–8, rest 2–3 min | 3 × 8–12, rest 90 sec | Optional 5–10 min cool-down |
  | Maintain | 3 × 8–10, rest 2 min | 3 × 10–12, rest 75 sec | 10–20 min steady |
  | Cut | 3 × 6–8, rest 2 min (heavy, to keep muscle) | 3 × 12–15, rest 45–60 sec, as supersets when the gym isn't packed | 15–30 min incline treadmill walk |

- **AI Trainer:** "Train like a" changes the plan to match published guidance for that kind of athlete or situation. For now it uses built-in rules, not a live AI, and each workout lists the sources it follows.

  | Trainer | What changes | Based on |
  |---------|--------------|----------|
  | Off | The standard plan above | |
  | Bodybuilder | 6–10 reps on the main lift, 8–12 (10–15 on a cut) on the rest, 60–90 sec rests, sets to 1–2 reps short of failure | ACSM progression models, Bodybuilding.com, Schoenfeld's hypertrophy research |
  | Powerlifter | Main lift 4–5 × 3–5 with 3–5 min rests, deadlift added on Pull A, 5 exercises, no supersets, light cardio. Suggests an Anytime Fitness style gym, since Planet Fitness has no barbells for squats or deadlifts | ACSM, NSCA |
  | Marathon runner | A running week: easy run + upper body, speed intervals, easy run + single-leg strength, tempo run + upper body, cross-training + core, long run, Sunday off. Lifting is 4 exercises, done after the run | ACSM, Runner's World, the 80/20 guideline |
  | Weight loss | Circuit-style supersets with 30–45 sec rests and 35–45 min of moderate cardio a day, about 200–300 min a week | HHS Physical Activity Guidelines, American Heart Association, ACSM position stand on weight loss, LiveStrong |
  | GLP-1 medication (Mounjaro, Zepbound, Ozempic, Wegovy) | Lifting comes first to keep muscle, 5 exercises with full rests and no supersets, easy cardio, tips on eating before training, water and dizziness. With a weekly shot day set, that day and the next are lighter (4 exercises and a walk) | 2025 joint advisory on GLP-1 nutrition (ACLM, ASN, OMA, The Obesity Society), HHS, AHA, the drugs' prescribing information |

  None of this is medical advice. On a GLP-1 medication, check with your prescriber before starting a new program.
- **Gym:** "Planet Fitness style" uses Smith machines, dumbbells, cables and machines only. "Anytime Fitness style" also uses barbells and squat racks for the main lifts.
- **Same exercises each week:** the plan repeats week to week, so you can add weight or reps.
- **Swap an exercise:** under each exercise, "Taken?" names an alternative. Tap it to swap that exercise in; tap again to move to the third choice, and again to come back around. Each exercise cycles through three choices. With the AI Trainer off, the planned one comes first, then one each of machines (Smith machines included), dumbbells or barbells, and anything else (cables, bodyweight). With a trainer on, each exercise starts with that trainer's favorite equipment and swaps follow its order: powerlifter barbell then Smith machine, bodybuilder cables then machines, weight loss machines then cables (quick to set up for circuits), GLP-1 machines then Smith machine (guided movement on a lightheaded day), marathon dumbbells and bodyweight (balance and single-leg strength). A swapped exercise starts unlocked. Every exercise has at least three choices at either kind of gym.
- **Cardio only / strength training only:** two overrides under the workout. **Cardio only override** swaps the lifting for a warm-up and one longer cardio session (45 min, or 30 when time is short), matched to your aim and trainer: incline walking on a cut or weight loss, steady machines otherwise, brisk walking for GLP-1, an easy run for marathon. On a marathon run day, it's just the run. **Strength training only override** drops the cardio and the run and keeps the lifting. Tap the override that's on to go back to the full plan. Anything already locked stays locked. The rest day has no overrides; training on it takes picking a body part.
- **See example:** every exercise and stretch has a ▶ See example link that opens a YouTube search for it done with good form (in the YouTube app, on phones that have it). Tapping the link doesn't lock the exercise.
- **Celebrations:** locking the last lock of the day brings up a "Locked in!" screen with confetti, a buzz on phones that support it, the day's calories and any milestones, then **Lock out** or **Stay here**. It shows once a day; unlocking and relocking doesn't repeat it. Milestones:
  - 🏆 every training day of the week finished: "You locked in this week: all six days' goals met. Official Locksmith level achieved." Four full weeks make you a Master Locksmith and twelve a Vault Keeper.
  - 💪 5 or 6 of the past 7 days: "Arnold would be proud."
  - 🔥 streaks of 3, 7, 14, 21, 30 days and on. Rest days are skipped, so they never break one.
  - 🔑 your first fully locked day, and ⭐ 10, 25, 50, 100 and more.
  The rest day gets a quieter "Recovery locked in" and doesn't count toward any of them. The options screen shows your current streak and Locksmith level under This week. Locked-in days are now kept for about a year so long streaks count.
- **Lock-In Weight:** on the options screen, under This week. Log your weight (once or twice a week, at the same time of day, works best) and GymBot compares it with your starting weight: the weight in Settings, from the day you set it, or your first weigh-in. It judges the pace as a share of body weight a week, against your aim:

  | Aim | On track | Heads up / stalling | Off track |
  |-----|----------|---------------------|-----------|
  | Cut | Losing 0.25–1% a week | Losing faster than 1% a week (muscle loss risk), or flat | Going up: "Lock back in, champ." |
  | Maintain | Within 0.25% a week either way | Drifting up or down (unexpected) | |
  | Gain | Gaining 0.125–0.5% a week | Gaining faster than 0.5% (more fat than muscle), or flat | Losing |

  Nothing is judged until a week has passed, since weight swings a few pounds day to day. With the GLP-1 trainer, the expected range widens to about 0.25–1.5% a week, since GymBot doesn't know how far into treatment you are: loss is fastest in the first months and levels off after about a year (in the trials, semaglutide 2.4 mg averaged about 15% over 68 weeks and tirzepatide about 15–21% over 72 weeks). The verdict then shows both, for example "A regular cut would usually be down about 3.0–6.0 lb by now. On a GLP-1, about 1.5–9.0 lb is in the expected range." Faster than a regular cut counts as on track, flat reads as "leveling off", over 1.5% a week is still flagged, and losing on Maintain is expected. Each weigh-in also becomes the weight used for calories burned. "Start over from today's weight" resets the starting point.
- **Calories burned:** each part of the workout has an effort level (MET) from the Compendium of Physical Activities, for example 3.5 for lifting, 4.3 for circuits, 5.3 for an incline treadmill walk and 8.3 for an easy run. Calories = MET × your weight in kg × hours, counted only for the parts you've locked. Your weight comes from Settings, or from CookBot's profile if CookBot runs on the same site; until then it uses 170 lb. These are estimates, and real burn varies from person to person. The week strip on the options screen shows each day's calories and the week's total.
- **Ask the trainer:** type a quick question, like "should I lean forward or back on incline curls?", and get a short gut-check answer without leaving the app. It's on the workout screen; tap 💬 at the top to jump there. Today's workout, aim, trainer and gym go with the question so the answer fits your plan, and you can ask follow-ups. For anything bigger, it suggests a YouTube search for a form video. The chat starts over each day, or after 10 questions.
- **No accounts.** Your settings, locked-in days and today's questions are stored only in your browser's local storage. Locked-in days are kept for about a year.
- **Back up and restore:** clearing Chrome's "Cookies and site data" erases everything above (clearing history or cached files doesn't). Settings → **Back up** saves a `gymbot-backup-<date>.json` file to your downloads, and **Restore** loads one back, after a wipe or on a new phone. The file includes your API key if you added one, so keep it private.

## Ask the trainer (optional)

Answers come from Claude Sonnet 5.5, a balance of speed, quality and cost. The app sends your question and today's workout straight from your phone to the Anthropic API using your own API key. There's no GymBot server.

To use it, get an API key from [console.anthropic.com](https://console.anthropic.com), add some credit, and enter the key in Settings (⚙︎), which also holds your weight. If CookBot runs on the same site and already has a key, Settings offers to reuse it. A question costs roughly a penny, so 100 questions a month is under a dollar. Without a key, the rest of the app works as normal and offline; asking needs a connection.

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
| `day.js` | The midnight day boundary |
| `sw.js`, `manifest.webmanifest`, `icon*.png`, `icon.svg` | Offline caching, home-screen install and the app icon |
| `vendor/anthropic-sdk-0.131.0.js` | The Anthropic TypeScript SDK (MIT License), bundled into one file, the same as CookBot's |

Tests for the schedule, body-part workouts, trainers, calories burned, celebrations, weight trends, time of day, aims and gym equipment: `node --test`
