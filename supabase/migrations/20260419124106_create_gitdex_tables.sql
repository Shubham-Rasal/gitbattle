-- GitDex: Deck + Battle schema
-- Run this in the Supabase SQL editor to bootstrap the tables.

-- ── Decks ───────────────────────────────────────────────────────────
create table if not exists gxd_decks (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  github_username text not null,
  name        text not null default 'My Deck',
  cards       jsonb not null,                -- array of 3 PokemonCard objects
  is_public   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for matchmaking: random opponent from public decks excluding self
create index if not exists idx_gxd_decks_public on gxd_decks (is_public) where is_public = true;
create index if not exists idx_gxd_decks_owner on gxd_decks (owner_id);

-- RLS
alter table gxd_decks enable row level security;

-- Owners can do everything with their own decks
create policy "Users manage own decks"
  on gxd_decks for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Authenticated users can read public decks (for matchmaking & browsing)
create policy "Authenticated read public decks"
  on gxd_decks for select
  using (is_public = true);


-- ── Battle Sessions ──────────────────────────────────────────────────
create table if not exists gxd_battle_sessions (
  id                uuid primary key default gen_random_uuid(),
  attacker_user_id  uuid not null references auth.users(id) on delete cascade,
  defender_user_id  uuid references auth.users(id) on delete set null,
  attacker_deck_id  uuid not null references gxd_decks(id) on delete cascade,
  defender_deck_id  uuid not null references gxd_decks(id) on delete cascade,
  attacker_username text,
  defender_username text,
  winner_user_id    uuid,
  winner_deck_id    uuid,
  result            text not null check (result in ('win', 'lose', 'draw')),
  round_count       int not null default 0,
  round_logs        jsonb not null default '[]'::jsonb,
  seed              bigint not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists idx_gxd_battles_attacker on gxd_battle_sessions (attacker_user_id);
create index if not exists idx_gxd_battles_defender on gxd_battle_sessions (defender_user_id);
create index if not exists idx_gxd_battles_created on gxd_battle_sessions (created_at desc);

-- RLS
alter table gxd_battle_sessions enable row level security;

-- Participants can insert their own battles
create policy "Users insert own battles"
  on gxd_battle_sessions for insert
  with check (auth.uid() = attacker_user_id);

-- Public read for leaderboard / replay
create policy "Public read battles"
  on gxd_battle_sessions for select
  using (true);


-- ── Leaderboard view (materialised for perf at scale; start as plain view) ──
create or replace view gxd_leaderboard as
with battle_stats as (
  select
    player_id,
    count(*) as total_battles,
    count(*) filter (where won) as wins,
    count(*) filter (where lost) as losses,
    count(*) filter (where drew) as draws,
    max(battle_at) as last_played
  from (
    -- attacker perspective
    select
      attacker_user_id as player_id,
      result = 'win' as won,
      result = 'lose' as lost,
      result = 'draw' as drew,
      created_at as battle_at
    from gxd_battle_sessions
    union all
    -- defender perspective (invert result)
    select
      defender_user_id as player_id,
      result = 'lose' as won,
      result = 'win' as lost,
      result = 'draw' as drew,
      created_at as battle_at
    from gxd_battle_sessions
    where defender_user_id is not null
  ) sub
  group by player_id
)
select
  bs.player_id as user_id,
  coalesce(d.github_username, 'unknown') as github_username,
  bs.wins,
  bs.losses,
  bs.draws,
  bs.total_battles,
  case when bs.total_battles > 0
    then round(bs.wins::numeric / bs.total_battles, 4)
    else 0
  end as win_rate,
  bs.last_played
from battle_stats bs
left join lateral (
  select github_username
  from gxd_decks
  where owner_id = bs.player_id
  limit 1
) d on true
order by win_rate desc, total_battles desc, last_played desc nulls last;
