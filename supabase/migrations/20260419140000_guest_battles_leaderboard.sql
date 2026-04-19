-- Guest / matchup battles: nullable deck owner + nullable attacker user id,
-- leaderboard aggregates by GitHub username (signed-in + guest fights merge).

alter table gxd_decks alter column owner_id drop not null;

alter table gxd_battle_sessions alter column attacker_user_id drop not null;

-- Leaderboard: one row per GitHub login (case-insensitive), from battle usernames
create or replace view gxd_leaderboard as
with role_rows as (
  select
    lower(trim(attacker_username)) as github_login,
    result = 'win' as won,
    result = 'lose' as lost,
    result = 'draw' as drew,
    created_at as battle_at
  from gxd_battle_sessions
  where attacker_username is not null and btrim(attacker_username) <> ''
  union all
  select
    lower(trim(defender_username)),
    result = 'lose',
    result = 'win',
    result = 'draw',
    created_at
  from gxd_battle_sessions
  where defender_username is not null and btrim(defender_username) <> ''
),
agg as (
  select
    github_login,
    count(*)::bigint as total_battles,
    count(*) filter (where won)::bigint as wins,
    count(*) filter (where lost)::bigint as losses,
    count(*) filter (where drew)::bigint as draws,
    max(battle_at) as last_played
  from role_rows
  group by github_login
)
select
  md5(agg.github_login)::text as user_id,
  agg.github_login as github_username,
  agg.wins::int as wins,
  agg.losses::int as losses,
  agg.draws::int as draws,
  agg.total_battles::int as total_battles,
  case when agg.total_battles > 0
    then round((agg.wins::numeric / agg.total_battles::numeric), 4)
    else 0
  end as win_rate,
  agg.last_played
from agg
order by win_rate desc, total_battles desc, last_played desc nulls last;
