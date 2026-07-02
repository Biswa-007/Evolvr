# Evolvr

Level up your real life like an RPG character.

Evolvr is a full-stack gamified self-improvement platform that transforms fitness, study, and habits into progression systems inspired by RPGs and competitive ladder games.

Users can:
- 🏋️ Log workouts and track strength progression
- 📚 Track study sessions and focus consistency
- ✅ Build habits with streak systems
- 🏆 Earn XP, level up, unlock achievements, and climb rank ladders

Built with:
- **Next.js 15**
- **TypeScript**
- **Supabase**
- **PostgreSQL**
- **TailwindCSS**
- **Zustand**

This project is designed as a multi-user production-ready app with:
- Authentication
- Row Level Security
- Server-authoritative progression logic
- Real analytics
- RPG progression mechanics

**Analytics** — all four analytics modules now use real database-backed data:
  - XP growth
  - Stat balance
  - Habit consistency
  - Workout frequency

 These are powered by Postgres aggregation queries and RPC functions introduced in `0009_analytics.sql`, with zero-value gap filling for inactive periods.

## Project structure

```bash
supabase/migrations/        10 SQL migration files (0001 → 0010)

src/
 ┣ app/
 ┃ ┣ (app)/                 Authenticated pages: /, /gym, /study, /habits, /analytics, /profile
 ┃ ┣ login/                 Magic-link sign-in
 ┃ ┗ auth/callback/         Exchanges magic-link code for session
 ┣ components/
 ┃ ┣ layout/                Sidebar, mobile nav, StoreHydrator
 ┃ ┣ dashboard/             HeroCard, StatBar, QuestCard, SlackWarningBanner
 ┃ ┣ gym/                   WorkoutCard, WorkoutEditor, MuscleHeatmap
 ┃ ┣ study/                 StudySessionCard, StudySessionEditor, FocusHeatmap
 ┃ ┣ habits/                HabitCard
 ┃ ┣ ui/                    Shared Modal
 ┃ ┗ progression/           RankBadge, LadderRankCard, XP popups, Rank ceremonies
 ┣ lib/
 ┃ ┣ supabase/              client.ts, server.ts, middleware.ts, queries.ts
 ┃ ┣ types.ts               Shared TypeScript types
 ┃ ┣ xp-engine.ts           XP curves, rank thresholds, ladder math
 ┃ ┣ store.ts               Zustand store
 ┃ ┣ heatmap-color.ts       Shared color interpolation helper
 ┃ ┗ mock-data.ts           Static placeholder data for muscle heatmap only

middleware.ts               Session refresh + auth route protection

```
## Features

- Passwordless authentication via magic links
- Fully server-authoritative XP system
- Multi-layer progression (global rank + exercise rank + subject rank)
- Achievement unlock system
- Streak tracking and anti-slacking alerts
- Workout PR detection using Epley 1RM estimation
- Real analytics dashboards
- Custom task and habit creation
- Secure multi-user architecture with RLS

