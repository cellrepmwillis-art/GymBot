# GymBot

A workout picker that runs on your phone. Tap **Lock in** and it suggests today's workout from the day of the week, the time of day and your aim, using equipment a typical American gym has (Planet Fitness, Anytime Fitness and the like).

- **The week:** push, pull, legs, twice, Monday to Saturday. Sunday is a rest day with a short recovery plan.

  | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
  |-----|-----|-----|-----|-----|-----|-----|
  | Push A (chest) | Pull A (back width) | Legs A (squat) | Push B (shoulders) | Pull B (back thickness) | Legs B (hinge) | Rest |

- **Time of day:** decides how long the session is and how busy the gym likely is.

  | Time | Session |
  |------|---------|
  | 3am–6am | Full session, longer warm-up |
  | 6am–9am (before work) | Trimmed to 5 exercises |
  | 9am–11am, 2pm–4pm | Full session, quiet gym |
  | 11am–2pm (lunch) | Express: 4 exercises as supersets |
  | 4pm–8pm (peak) | Full session; each exercise lists a swap for when it's taken |
  | 8pm–11pm | Full session, easy cardio |
  | 11pm–3am | 5 exercises, easy cardio; a reminder that many Planet Fitness clubs aren't 24 hours |

  A workout after midnight counts toward the day before, until 3am, the same as CookBot.

- **Aims (Settings ⚙︎):** Gain, Maintain or Cut, the same three as CookBot.

  | Aim | Main lift | Other lifts | Cardio |
  |-----|-----------|-------------|--------|
  | Gain | 4 × 6–8, rest 2–3 min | 3 × 8–12, rest 90 sec | Optional 5–10 min cool-down |
  | Maintain | 3 × 8–10, rest 2 min | 3 × 10–12, rest 75 sec | 10–20 min steady |
  | Cut | 3 × 6–8, rest 2 min (heavy, to keep muscle) | 3 × 12–15, rest 45–60 sec, as supersets when the gym isn't packed | 15–30 min incline treadmill walk |

- **Gym (Settings ⚙︎):** "Planet Fitness style" uses Smith machines, dumbbells, cables and machines only. "Anytime Fitness style" also uses barbells and squat racks for the main lifts.
- **Different exercises:** swaps every exercise for its next option. The same exercises come back each week by default, so you can add weight or reps week to week.
- **Check off exercises:** tap one when you finish it. The week strip marks every day you locked in.
- **No accounts.** Your settings and locked-in days are stored only in your browser's local storage, kept for 60 days.

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
| `index.html`, `styles.css` | The single screen and settings dialog |
| `app.js` | Lock in, the week strip, checking off exercises, local storage |
| `workouts.js` | The split, exercise choices, time-of-day windows and aims |
| `day.js` | The 3am day boundary |
| `sw.js`, `manifest.webmanifest` | Offline caching and home-screen install |

Tests for the schedule, time of day, aims and gym equipment: `node --test`
