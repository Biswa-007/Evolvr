# Evolvr

Transform your life like an RPG character. Full stack now: real multi-user
auth, a Postgres backend on Supabase, and server-authoritative XP — built so
friends and family can each sign up and use it without seeing each other's
data or being able to fake progress.

## Setup (do this first)

The frontend won't do anything useful until it's pointed at a real Supabase
project. **Follow [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) first** — it
walks through creating the free project, running the migrations, and getting
your two API credentials. Takes about 10 minutes.

Once that's done:

```bash
npm install
npm run dev
```

Open **http://localhost:3000** — you'll land on `/login`, since every route
is protected. Sign in with a magic link (no password to manage), and you're
in with a freshly seeded character.

## What's real vs. what's still a simplification

**Real, server-side, tested:**
- Auth (passwordless magic link via Supabase Auth)
- Every user's data is isolated by Row Level Security — verified directly
  against a local test database with two simulated users before shipping
  (cross-user reads, writes, and ID-spoofing attempts all correctly rejected)
- All XP/level/rank/ladder-promotion math runs in Postgres functions, not in
  the browser — the client says "I completed task X" or "here's my workout",
  never an XP amount
- Daily quests, the Gym workout editor + Exercise Rank Ladder + PR detection
  (real Epley-formula 1RM estimates), the Study section + Subject Rank
  Ladder, achievements, and the streak/slacking-warning system are all
  backed by real Postgres tables and queries
- **Exercise ranking is strength-progression based, not volume based**
  (fixed in `0008_ranking_overhaul.sql` — see "Recent fixes" below). All four
  **Analytics** charts pull from real data (fixed in `0009_analytics.sql`).
- The workout logger has exercise-name autocomplete (suggests exercises
  you've logged before) and shows your last performance on that exercise
  inline while logging.

**Known simplifications (clearly marked in code, not hidden):**
- The **muscle heatmap** (Gym > Body tab) is still static placeholder data
  (`src/lib/mock-data.ts`) — deriving it from real logged sets needs an
  exercise-to-muscle-group mapping table that hasn't been built yet
- **Avatar customization** and **nutrition tracking** were already deferred
  in the original implementation plan and remain so

## Recent fixes (this round)

- **Ranking exploit fixed**: exercise ladder LP used to be `set_count * 9` —
  completely ignoring weight, so 10 garbage sets of 1kg earned the same LP as
  10 heavy working sets. Replaced with `compute_workout_lp_gain()` in
  `0008_ranking_overhaul.sql`, which scores LP off your estimated 1RM
  (Epley's formula) *relative to your own previous best on that exercise* —
  genuine progressive overload is rewarded, repeating the same weight earns
  only a small maintenance credit, and spam-logging trivial weight earns
  almost nothing. Verified against a local Postgres instance with a
  dedicated exploit-reproduction test (repeating identical light sets, then
  a real weight increase, then a 10-set spam workout of 1kg×1).
- **Analytics overhaul**: all four charts (XP growth, stat balance, habit
  consistency, workout frequency) now come from real Postgres aggregations
  (`0009_analytics.sql`) instead of mock arrays. Each fills in zero-value
  gaps for periods with no activity rather than silently omitting them.
- **Workout logging UX**: exercise names now autocomplete from your own
  history, and typing/blurring a known exercise name shows what you logged
  for it last time, right in the editor.
- **Achievement duplicate-toast bug fixed**: the unlock-detection function
  used to infer "newly unlocked" via a 5-second timestamp window, which
  re-fired the same achievement toast on rapid successive actions. Now
  tracks actual inserted rows via `INSERT ... RETURNING` instead — fires
  exactly once, confirmed with a rapid-fire stress test (3 workouts logged
  back to back; the achievement only appeared after the first).
- **Custom tasks/habits**: you can now add your own (e.g. "Drink 5L water")
  via "Add task" on the Dashboard — previously the only tasks were the 3
  seeded at signup. A new `tasks_xp_reward_matches_difficulty` CHECK
  constraint (`0010_task_xp_integrity.sql`) was added at the same time: it
  guarantees the database itself rejects any task row whose `xp_reward`
  doesn't match its difficulty tier, regardless of how the row was inserted.
  Without this, letting users create their own tasks would have opened a way
  to insert a task with an inflated reward and farm XP from it daily —
  caught and closed before the feature shipped, verified with a direct
  exploit-attempt test against local Postgres.
- **Workout editor layout fixed**: the per-set row (weight type, weight,
  reps, remove) used to overflow the modal's width with no visible
  scrollbar, making it look like the weight/reps inputs didn't exist. Now a
  fixed-width grid that always fits, with a compact Kg/Bodyweight toggle
  instead of a wide dropdown.

## What's working end to end

- **Dashboard** — slacking warning banner, Hero Card (rank, level, XP bar,
  streak), 5 animated stat bars, daily quest list. Completing a quest calls
  the database, gets back real XP/level/rank results, and animates from that
  — XP popup → stat bar fill → Level-Up modal if a level was crossed → the
  full-screen Rank-Up Ceremony if your character's overall rank changed.
- **Gym** — fully editable workout logging: name + exercises, each with
  add/remove sets, each set choosing **kg** or **Bodyweight** + reps. Saving
  calls `add_workout()` server-side, which awards Strength XP, computes a
  real estimated 1RM per exercise (Epley's formula), records a PR if it's a
  new best, and auto-creates/advances that exercise's own rank ladder (Wood
  → Olympian, Liftoff-style). Also has Exercise Ranks and a Body tab.
- **Study** (mirrors Gym) — "Log a session" records subject/duration/topics,
  awards Discipline XP, and advances that subject's own independent ladder.
  Sessions, Subject Ranks, and a Focus heatmap (real study-minutes data).
- **Slacking warning** — 2+ consecutive days under the daily XP minimum (50
  XP/day, see `DAILY_XP_MINIMUM` in `src/lib/xp-engine.ts`) shows a caution
  banner; 3+ escalates to danger styling. Computed from the real `xp_events`
  ledger, bucketed by day.
- **Habits** — streak-focused cards with real, on-read-computed streaks and
  success rates (no cron job needed — a missed day just stops showing up).
- **Analytics** — stat-balance radar is real; the other three charts are
  mock (see above).
- **Profile** — rank badge, real stat levels, real achievements (unlocked
  automatically server-side after relevant actions).

## Architecture

```
Browser (Next.js, Zustand store)
   │
   │  supabase-js: .from() reads, .rpc() for every mutation
   ▼
Supabase Auth  +  Postgres (Row Level Security on every table)
   │
   ▼
Postgres functions: complete_task(), add_workout(), add_study_session()
   — all XP math, level-ups, rank-ups, ladder promotions, achievement
     unlocks happen here, server-side, as the authenticated user
```

The browser never computes or trusts its own XP numbers. Every mutation goes
through a Postgres RPC function that re-derives the truth from the database
and returns the result; the client just animates whatever comes back.

## Project structure

```
supabase/migrations/        7 SQL files, run in order — see SUPABASE_SETUP.md
src/
 ┣ app/
 ┃ ┣ (app)/                 Authenticated pages: /, /gym, /study, /habits, /analytics, /profile
 ┃ ┣ login/                 Magic-link sign-in
 ┃ ┗ auth/callback/         Exchanges the magic-link code for a session
 ┣ components/
 ┃ ┣ layout/                Sidebar, mobile nav, StoreHydrator (loads real data on mount)
 ┃ ┣ dashboard/             HeroCard, StatBar, QuestCard, SlackWarningBanner
 ┃ ┣ gym/                   WorkoutCard, WorkoutEditor, MuscleHeatmap
 ┃ ┣ study/                 StudySessionCard, StudySessionEditor, FocusHeatmap
 ┃ ┣ habits/                HabitCard
 ┃ ┣ ui/                    Modal (shared by both editors)
 ┃ ┗ progression/           RankBadge, LadderRankCard, XPPopupLayer, LevelUpModal, RankUpCeremony, LadderPromotionToast
 ┣ lib/
 ┃ ┣ supabase/              client.ts, server.ts, middleware.ts, queries.ts (all reads)
 ┃ ┣ types.ts               Shared TypeScript types
 ┃ ┣ xp-engine.ts           XP curve, rank thresholds, ladder math, slacking math — mirrors the SQL exactly
 ┃ ┣ store.ts               Zustand store — calls RPCs, reflects what the server returns
 ┃ ┣ heatmap-color.ts       Shared color-interpolation helper
 ┃ ┣ mock-data.ts           Just the muscle-volume placeholder now (see "known simplifications")
 ┃ ┗ analytics-data.ts      Mock series for 3 of the 4 Analytics charts
middleware.ts                Refreshes sessions, redirects signed-out users to /login
```

## Theme

All colors/fonts live as CSS variables in `src/app/globals.css` (dark navy
`#07111F` background, cyan/gold/red accent system, Space Grotesk + Inter,
self-hosted via `@fontsource` so there's no external font-CDN dependency).

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run lint` — ESLint
