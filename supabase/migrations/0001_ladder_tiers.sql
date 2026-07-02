-- 0001_ladder_tiers.sql
-- Exercise/Subject rank ladder tiers (Section 6B of the plan). Created first
-- because exercise_ranks and subject_ranks have a foreign key to it.

create extension if not exists pgcrypto;

create table if not exists ladder_tiers (
  tier text primary key,
  sort_order smallint not null unique,
  has_divisions boolean not null default true
);

insert into ladder_tiers (tier, sort_order, has_divisions) values
  ('Wood', 1, true),
  ('Bronze', 2, true),
  ('Silver', 3, true),
  ('Gold', 4, true),
  ('Platinum', 5, true),
  ('Diamond', 6, true),
  ('Champion', 7, true),
  ('Titan', 8, true),
  ('Olympian', 9, false)
on conflict (tier) do nothing;
