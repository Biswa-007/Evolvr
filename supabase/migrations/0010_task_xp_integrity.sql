-- 0010_task_xp_integrity.sql
-- Up to now, nothing stopped a client from inserting a task with, say,
-- difficulty='small' but xp_reward=999999 — the tasks_insert_own RLS policy
-- only checks auth.uid() = user_id, not that the reward is sane. Since
-- complete_task() trusts tasks.xp_reward completely (by design — it's meant
-- to be the single source of truth for "what is this task worth"), an
-- inserted row with an inflated reward would let someone farm infinite XP
-- once a day, every day, forever. This becomes a real risk the moment users
-- can create their own tasks (rather than only the seeded starter ones).
--
-- Fixed with a CHECK constraint so the database itself refuses any row where
-- xp_reward doesn't match the canonical difficulty -> XP mapping, regardless
-- of how the row gets inserted (UI, raw API call, anything).

alter table tasks add constraint tasks_xp_reward_matches_difficulty check (
  xp_reward = case difficulty
    when 'small' then 10
    when 'medium' then 30
    when 'hard' then 75
    when 'major' then 150
  end
);
