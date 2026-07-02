# Setting up the backend (Supabase)

This walks through getting Evolvr running with a real, multi-user backend — the
part that lets your friends and family actually sign up and use it, with each
person's data kept private from everyone else's.

Total time: ~10 minutes. Free tier is enough for friends-and-family scale.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free).
2. Click **New Project**. Pick any name/region, set a database password (you
   won't need to remember this — Supabase manages it), and wait ~2 minutes
   for provisioning.

## 2. Run the migrations

In your project dashboard, open the **SQL Editor** (left sidebar).

Run each file in `supabase/migrations/` **in order**, one at a time, pasting
its contents into a new query and clicking Run:

1. `0001_ladder_tiers.sql`
2. `0002_tables.sql`
3. `0003_math_functions.sql`
4. `0004_streaks.sql`
5. `0005_rls.sql`
6. `0006_triggers_and_seed.sql`
7. `0007_rpc_functions.sql`
8. `0008_ranking_overhaul.sql`
9. `0009_analytics.sql`
10. `0010_task_xp_integrity.sql`

Each one should report success with no red errors. If something fails, stop
and re-check you ran the previous files first — they build on each other in
this exact order (e.g. tables must exist before the functions that query them).

**If you've already pushed earlier migrations via the Supabase CLI** (`npx
supabase db push`), you don't need to redo anything from scratch — just run
`npx supabase db push` again. The CLI tracks which migrations are already
applied by filename and only runs the new ones (`0008_ranking_overhaul.sql`
and `0009_analytics.sql` the first time you see this note).

You can sanity-check it worked by running this in the SQL Editor:

```sql
select count(*) from achievements; -- should return 6
select count(*) from ladder_tiers; -- should return 9
```

## 3. Get your project credentials

In the dashboard, go to **Settings -> API**. You need two values:

- **Project URL**
- **anon public** key

## 4. Configure the app

Copy `.env.local.example` to `.env.local` in the project root and fill in
those two values:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

The anon key is safe to expose in client-side code — that's what it's for.
Row Level Security (migration `0005_rls.sql`) is what actually protects
everyone's data, not the secrecy of this key.

## 5. Run it locally to test

```bash
npm install
npm run dev
```

Open `http://localhost:3000` — you should be redirected to `/login`. Enter
your email, you'll get a magic-link email from Supabase, click it, and you're
in with a freshly seeded character (3 starter tasks, all stats at 0).

## 6. Before sharing the link with friends/family: whitelist your domain

This step is easy to miss and will make sign-in silently fail if skipped.

In the Supabase dashboard, go to **Authentication -> URL Configuration** and
add your real deployed URL (see Section 7) to **Redirect URLs**, e.g.:

```
https://your-app-name.vercel.app/auth/callback
```

While testing locally, `http://localhost:3000/auth/callback` should already
be allowed by default — but the production URL needs to be added explicitly
once you deploy.

## 7. Deploy it so others can actually reach it

The free way: [Vercel](https://vercel.com).

1. Push this project to a GitHub repo.
2. In Vercel, **Import Project** from that repo.
3. Add the same two environment variables from `.env.local` in Vercel's
   project settings (Settings -> Environment Variables).
4. Deploy. Vercel gives you a URL like `your-app-name.vercel.app`.
5. Go back and do Step 6 above with that real URL.

Now anyone you send the link to can sign up with their own email and get
their own private character — nobody can see anyone else's stats, workouts,
or notes (enforced server-side, not just hidden in the UI).

## A note on email sending limits

Supabase's free tier sends auth emails (the magic links) through their own
shared mail service, which has a fairly low rate limit — fine for a handful
of friends and family signing up over time, but if you expect a lot of
people to sign up in a short burst, you may see emails delayed or rate
limited. If that happens, Supabase's docs explain how to plug in your own
SMTP provider (e.g. a free Resend or SendGrid tier) under
**Authentication -> Email Templates -> SMTP Settings** — not necessary to
start, just something to know about if it comes up.

## What you get out of the box

- Every signed-up user gets their own profile, 5 stats starting at 0 XP, and
  3 starter tasks — seeded automatically by a database trigger the moment
  they sign up (see `0006_triggers_and_seed.sql`).
- All XP math (level-ups, rank-ups, ladder promotions, PR detection) happens
  in Postgres functions that run as the authenticated user — the browser
  never computes or sends an XP amount, it just says "I did X" and the
  database decides what that's worth. This is what stops anyone from
  editing local state to hand themselves XP.
- Row Level Security on every table means even a technically savvy friend
  poking at the network tab can't read or modify anyone else's data —
  verified directly against a local test database before this was shipped
  (two simulated users, cross-user reads/writes/spoofing attempts all
  correctly rejected).
