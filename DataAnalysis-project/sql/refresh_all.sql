\set ON_ERROR_STOP on
-- ============================================================
-- psql file path variables (relative to project root)
-- Run refresh from repo root like: psql -d nba_data -f sql/refresh_all.sql
-- ===========================================================


-- ============================================================
-- refresh_all_corrected.sql
-- Loads Kaggle CSVs from /Users/dre/kaggle_nba_sync into staging,
-- then upserts into public tables.
-- NOTE: Each section is its own transaction so one failure
-- won't roll back everything.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS staging;

-- ============================================================
-- 0) TEAM STATS (BASE)  TeamStatistics.csv -> public.team_game_stats
-- ============================================================
BEGIN;

DROP TABLE IF EXISTS staging.team_stats_raw;

CREATE TABLE staging.team_stats_raw (
  gameid text,
  gamedatetimeest text,
  teamcity text,
  teamname text,
  teamid text,
  opponentteamcity text,
  opponentteamname text,
  opponentteamid text,
  home text,
  win text,
  teamscore text,
  opponentscore text,
  assists text,
  blocks text,
  steals text,
  fieldgoalsattempted text,
  fieldgoalsmade text,
  fieldgoalspercentage text,
  threepointersattempted text,
  threepointersmade text,
  threepointerspercentage text,
  freethrowsattempted text,
  freethrowsmade text,
  freethrowspercentage text,
  reboundsdefensive text,
  reboundsoffensive text,
  reboundstotal text,
  foulspersonal text,
  turnovers text,
  plusminuspoints text,
  numminutes text,
  q1points text,
  q2points text,
  q3points text,
  q4points text,
  benchpoints text,
  biggestlead text,
  biggestscoringrun text,
  leadchanges text,
  pointsfastbreak text,
  pointsfromturnovers text,
  pointsinthepaint text,
  pointssecondchance text,
  timestied text,
  timeoutsremaining text,
  seasonwins text,
  seasonlosses text,
  coachid text,
  gametype text,
  gamelabel text,
  gamesublabel text,
  seriesgamenumber text,
  seed text,
  reboundsteam text,
  turnoversTeam text,
  ot1points text,
  ot2points text,
  otallpoints text,
  gamedate text
);

\copy staging.team_stats_raw FROM 'data/kaggle_nba_sync/TeamStatistics.csv' WITH (FORMAT csv, HEADER true);

INSERT INTO public.team_game_stats (
  game_id, team_id, opponent_team_id, game_datetime_est,
  home, win,
  team_score, opponent_score,
  assists, blocks, steals,
  fga, fgm, fg_pct,
  tpa, tpm, tp_pct,
  fta, ftm, ft_pct,
  reb_def, reb_off, reb_total,
  fouls, turnovers, plus_minus,
  minutes,
  q1, q2, q3, q4,
  bench_points, biggest_lead, biggest_scoring_run, lead_changes,
  pts_fast_break, pts_from_turnovers, pts_in_paint, pts_second_chance,
  times_tied, timeouts_remaining,
  season_wins, season_losses,
  coach_id
)
SELECT
  r.gameid::bigint,
  r.teamid::bigint,
  r.opponentteamid::bigint,
  NULLIF(r.gamedatetimeest,'')::timestamp,

  ((NULLIF(r.home,'')::numeric)::int = 1),
  ((NULLIF(r.win,'')::numeric)::int = 1),

  (NULLIF(r.teamscore,'')::numeric)::int,
  (NULLIF(r.opponentscore,'')::numeric)::int,

  (NULLIF(r.assists,'')::numeric)::int,
  (NULLIF(r.blocks,'')::numeric)::int,
  (NULLIF(r.steals,'')::numeric)::int,

  (NULLIF(r.fieldgoalsattempted,'')::numeric)::int,
  (NULLIF(r.fieldgoalsmade,'')::numeric)::int,
  NULLIF(r.fieldgoalspercentage,'')::numeric,

  (NULLIF(r.threepointersattempted,'')::numeric)::int,
  (NULLIF(r.threepointersmade,'')::numeric)::int,
  NULLIF(r.threepointerspercentage,'')::numeric,

  (NULLIF(r.freethrowsattempted,'')::numeric)::int,
  (NULLIF(r.freethrowsmade,'')::numeric)::int,
  NULLIF(r.freethrowspercentage,'')::numeric,

  (NULLIF(r.reboundsdefensive,'')::numeric)::int,
  (NULLIF(r.reboundsoffensive,'')::numeric)::int,
  (NULLIF(r.reboundstotal,'')::numeric)::int,

  (NULLIF(r.foulspersonal,'')::numeric)::int,
  (NULLIF(r.turnovers,'')::numeric)::int,
  (NULLIF(r.plusminuspoints,'')::numeric)::int,

  NULLIF(r.numminutes,'')::numeric,

  (NULLIF(r.q1points,'')::numeric)::int,
  (NULLIF(r.q2points,'')::numeric)::int,
  (NULLIF(r.q3points,'')::numeric)::int,
  (NULLIF(r.q4points,'')::numeric)::int,

  (NULLIF(r.benchpoints,'')::numeric)::int,
  (NULLIF(r.biggestlead,'')::numeric)::int,
  (NULLIF(r.biggestscoringrun,'')::numeric)::int,
  (NULLIF(r.leadchanges,'')::numeric)::int,

  (NULLIF(r.pointsfastbreak,'')::numeric)::int,
  (NULLIF(r.pointsfromturnovers,'')::numeric)::int,
  (NULLIF(r.pointsinthepaint,'')::numeric)::int,
  (NULLIF(r.pointssecondchance,'')::numeric)::int,

  (NULLIF(r.timestied,'')::numeric)::int,
  (NULLIF(r.timeoutsremaining,'')::numeric)::int,

  (NULLIF(r.seasonwins,'')::numeric)::int,
  (NULLIF(r.seasonlosses,'')::numeric)::int,

  NULLIF(r.coachid,'')::bigint
FROM staging.team_stats_raw r
JOIN public.teams t  ON t.team_id::text = r.teamid
JOIN public.teams ot ON ot.team_id::text = r.opponentteamid
WHERE NULLIF(r.gamedatetimeest,'') IS NOT NULL
ON CONFLICT (game_id, team_id) DO UPDATE SET
  opponent_team_id     = EXCLUDED.opponent_team_id,
  game_datetime_est    = EXCLUDED.game_datetime_est,
  home                = EXCLUDED.home,
  win                 = EXCLUDED.win,
  team_score          = EXCLUDED.team_score,
  opponent_score      = EXCLUDED.opponent_score,
  assists             = EXCLUDED.assists,
  blocks              = EXCLUDED.blocks,
  steals              = EXCLUDED.steals,
  fga                 = EXCLUDED.fga,
  fgm                 = EXCLUDED.fgm,
  fg_pct              = EXCLUDED.fg_pct,
  tpa                 = EXCLUDED.tpa,
  tpm                 = EXCLUDED.tpm,
  tp_pct              = EXCLUDED.tp_pct,
  fta                 = EXCLUDED.fta,
  ftm                 = EXCLUDED.ftm,
  ft_pct              = EXCLUDED.ft_pct,
  reb_def             = EXCLUDED.reb_def,
  reb_off             = EXCLUDED.reb_off,
  reb_total           = EXCLUDED.reb_total,
  fouls               = EXCLUDED.fouls,
  turnovers           = EXCLUDED.turnovers,
  plus_minus          = EXCLUDED.plus_minus,
  minutes             = EXCLUDED.minutes,
  q1                  = EXCLUDED.q1,
  q2                  = EXCLUDED.q2,
  q3                  = EXCLUDED.q3,
  q4                  = EXCLUDED.q4,
  bench_points        = EXCLUDED.bench_points,
  biggest_lead        = EXCLUDED.biggest_lead,
  biggest_scoring_run = EXCLUDED.biggest_scoring_run,
  lead_changes        = EXCLUDED.lead_changes,
  pts_fast_break      = EXCLUDED.pts_fast_break,
  pts_from_turnovers  = EXCLUDED.pts_from_turnovers,
  pts_in_paint        = EXCLUDED.pts_in_paint,
  pts_second_chance   = EXCLUDED.pts_second_chance,
  times_tied          = EXCLUDED.times_tied,
  timeouts_remaining  = EXCLUDED.timeouts_remaining,
  season_wins         = EXCLUDED.season_wins,
  season_losses       = EXCLUDED.season_losses,
  coach_id            = EXCLUDED.coach_id;

COMMIT;

-- ============================================================
-- TEAM ADVANCED (safe: do NOT drop view-backed staging table)
-- Load CSV into disposable staging.team_stats_advanced_csv_raw
-- ============================================================

BEGIN;

DROP TABLE IF EXISTS staging.team_stats_advanced_csv_raw;

CREATE TABLE staging.team_stats_advanced_csv_raw (
  gameid text,
  teamid text,
  teamcity text,
  teamname text,
  gametype text,
  astpct text,
  astratio text,
  astto text,
  availableflag text,
  defrating text,
  drebpct text,
  edefrating text,
  enetrating text,
  eoffrating text,
  epace text,
  efgpct text,
  gamedate text,
  gamedatetimeest text,
  home text,
  matchup text,
  min text,
  netrating text,
  offrating text,
  opponentteamcity text,
  opponentteamid text,
  opponentteamname text,
  orebpct text,
  pace text,
  paceper40 text,
  pie text,
  poss text,
  rebpct text,
  teamabbreviation text,
  teamname_right text,
  tmtovpct text,
  tspct text,
  win text,
  wl text
);

\copy staging.team_stats_advanced_csv_raw FROM 'data/kaggle_nba_sync/TeamStatisticsAdvanced.csv' WITH (FORMAT csv, HEADER true);

INSERT INTO public.team_game_stats_advanced
SELECT
  r.gameid::bigint,
  r.teamid::bigint,
  r.opponentteamid::bigint,
  NULLIF(r.gamedatetimeest,'')::timestamp,
  ((NULLIF(r.home,'')::numeric)::int = 1),
  ((NULLIF(r.win,'')::numeric)::int = 1),

  NULLIF(r.min,'')::numeric,
  NULLIF(r.astpct,'')::numeric,
  NULLIF(r.astratio,'')::numeric,
  NULLIF(r.astto,'')::numeric,
  NULLIF(r.defrating,'')::numeric,
  NULLIF(r.drebpct,'')::numeric,
  NULLIF(r.edefrating,'')::numeric,
  NULLIF(r.enetrating,'')::numeric,
  NULLIF(r.eoffrating,'')::numeric,
  NULLIF(r.epace,'')::numeric,
  NULLIF(r.efgpct,'')::numeric,
  NULLIF(r.netrating,'')::numeric,
  NULLIF(r.offrating,'')::numeric,
  NULLIF(r.orebpct,'')::numeric,
  NULLIF(r.pace,'')::numeric,
  NULLIF(r.paceper40,'')::numeric,
  NULLIF(r.pie,'')::numeric,
  NULLIF(r.poss,'')::numeric,
  NULLIF(r.rebpct,'')::numeric,
  NULLIF(r.tmtovpct,'')::numeric,
  NULLIF(r.tspct,'')::numeric,

  NULLIF(r.gametype,''),
  NULLIF(r.matchup,''),
  NULLIF(r.wl,'')
FROM staging.team_stats_advanced_csv_raw r
JOIN public.teams t  ON t.team_id::text = r.teamid
JOIN public.teams ot ON ot.team_id::text = r.opponentteamid
WHERE NULLIF(r.gamedatetimeest,'') IS NOT NULL
ON CONFLICT (game_id, team_id) DO UPDATE SET
  opponent_team_id  = EXCLUDED.opponent_team_id,
  game_datetime_est = EXCLUDED.game_datetime_est,
  home              = EXCLUDED.home,
  win               = EXCLUDED.win;

COMMIT;


-- ============================================================
-- 2) PLAYERS  Players.csv -> public.players
-- ============================================================
BEGIN;

DROP TABLE IF EXISTS staging.players_raw;

CREATE TABLE staging.players_raw (
  personid text,
  firstname text,
  lastname text,
  birthdate text,
  school text,
  country text,
  heightinches text,
  bodyweightlbs text,
  jersey text,
  guard text,
  forward text,
  center text,
  dleagueflag text,
  nbaflag text,
  gamesplayedflag text,
  draftyear text,
  draftround text,
  draftnumber text,
  fromyear text,
  toyear text
);

\copy staging.players_raw FROM 'data/kaggle_nba_sync/Players.csv' WITH (FORMAT csv, HEADER true);

INSERT INTO public.players (
  person_id,
  first_name,
  last_name,
  birthdate,
  last_attended,
  country,
  height_in,
  body_weight_lb,
  is_guard,
  is_forward,
  is_center,
  draft_year,
  draft_round,
  draft_number,
  height_ft,
  height_in_remainder
)
SELECT
  r.personid::bigint,
  NULLIF(r.firstname,''),
  NULLIF(r.lastname,''),
  NULLIF(r.birthdate,'')::date,
  NULLIF(r.school,''),
  NULLIF(r.country,''),

  CASE WHEN NULLIF(r.heightinches,'') ~ '^\d+(\.\d+)?$' THEN (r.heightinches::numeric)::int ELSE NULL END,
  CASE WHEN NULLIF(r.bodyweightlbs,'') ~ '^\d+(\.\d+)?$' THEN (r.bodyweightlbs::numeric)::int ELSE NULL END,

  (LOWER(COALESCE(NULLIF(r.guard,''),'0')) IN ('1','t','true','y','yes')),
  (LOWER(COALESCE(NULLIF(r.forward,''),'0')) IN ('1','t','true','y','yes')),
  (LOWER(COALESCE(NULLIF(r.center,''),'0')) IN ('1','t','true','y','yes')),

  CASE WHEN NULLIF(r.draftyear,'') ~ '^\d+$' THEN r.draftyear::int ELSE NULL END,
  CASE WHEN NULLIF(r.draftround,'') ~ '^\d+$' THEN r.draftround::int ELSE NULL END,
  CASE WHEN NULLIF(r.draftnumber,'') ~ '^\d+$' THEN r.draftnumber::int ELSE NULL END,

  CASE
    WHEN NULLIF(r.heightinches,'') ~ '^\d+(\.\d+)?$' THEN ((r.heightinches::numeric)::int / 12)
    ELSE NULL
  END,

  CASE
    WHEN NULLIF(r.heightinches,'') ~ '^\d+(\.\d+)?$' THEN ((r.heightinches::numeric)::int % 12)
    ELSE NULL
  END::numeric
FROM staging.players_raw r
ON CONFLICT (person_id) DO UPDATE SET
  first_name          = EXCLUDED.first_name,
  last_name           = EXCLUDED.last_name,
  birthdate           = EXCLUDED.birthdate,
  last_attended       = EXCLUDED.last_attended,
  country             = EXCLUDED.country,
  height_in           = EXCLUDED.height_in,
  body_weight_lb      = EXCLUDED.body_weight_lb,
  is_guard            = EXCLUDED.is_guard,
  is_forward          = EXCLUDED.is_forward,
  is_center           = EXCLUDED.is_center,
  draft_year          = EXCLUDED.draft_year,
  draft_round         = EXCLUDED.draft_round,
  draft_number        = EXCLUDED.draft_number,
  height_ft           = EXCLUDED.height_ft,
  height_in_remainder = EXCLUDED.height_in_remainder;

COMMIT;

-- ============================================================
-- 3) LEAGUE SCHEDULE 2024_25  LeagueSchedule24_25.csv
-- ============================================================
BEGIN;

DROP TABLE IF EXISTS staging.league_schedule_2024_25_raw;

CREATE TABLE staging.league_schedule_2024_25_raw (
  gameid text,
  gamedatetimeest text,
  gameday text,
  arenacity text,
  arenastate text,
  arenaname text,
  gamelabel text,
  gamesublabel text,
  gamesubtype text,
  gamesequence text,
  seriesgamenumber text,
  seriestext text,
  weeknumber text,
  hometeamid text,
  awayteamid text
);

\copy staging.league_schedule_2024_25_raw FROM 'data/kaggle_nba_sync/LeagueSchedule24_25.csv' WITH (FORMAT csv, HEADER true);

INSERT INTO public.league_schedule_2024_25 (
  game_id,
  game_datetime_est,
  week_number,
  home_team_id,
  away_team_id,
  arena_name,
  arena_city,
  arena_state,
  game_label,
  game_sublabel,
  series_game_number
)
SELECT
  r.gameid::bigint,
  NULLIF(r.gamedatetimeest,'')::timestamp,
  (NULLIF(r.weeknumber,'')::numeric)::int,
  r.hometeamid::bigint,
  r.awayteamid::bigint,
  NULLIF(r.arenaname,''),
  NULLIF(r.arenacity,''),
  NULLIF(r.arenastate,''),
  NULLIF(r.gamelabel,''),
  NULLIF(r.gamesublabel,''),
  CASE
  WHEN NULLIF(r.seriesgamenumber,'') ~ '^\d+$' THEN r.seriesgamenumber::int
  WHEN NULLIF(r.seriesgamenumber,'') ~* '^game[ ]*\d+$' THEN regexp_replace(r.seriesgamenumber, '\D', '', 'g')::int
  ELSE NULL
END
FROM staging.league_schedule_2024_25_raw r
JOIN public.teams ht ON ht.team_id::text = r.hometeamid
JOIN public.teams at ON at.team_id::text = r.awayteamid
WHERE NULLIF(r.gamedatetimeest,'') IS NOT NULL
ON CONFLICT (game_id) DO UPDATE SET
  game_datetime_est  = EXCLUDED.game_datetime_est,
  week_number        = EXCLUDED.week_number,
  home_team_id       = EXCLUDED.home_team_id,
  away_team_id       = EXCLUDED.away_team_id,
  arena_name         = EXCLUDED.arena_name,
  arena_city         = EXCLUDED.arena_city,
  arena_state        = EXCLUDED.arena_state,
  game_label         = EXCLUDED.game_label,
  game_sublabel      = EXCLUDED.game_sublabel,
  series_game_number = EXCLUDED.series_game_number;

COMMIT;

-- ============================================================
-- 4) LEAGUE SCHEDULE 2025_26  LeagueSchedule25_26.csv
-- ============================================================
BEGIN;

DROP TABLE IF EXISTS staging.league_schedule_2025_26_raw;

CREATE TABLE staging.league_schedule_2025_26_raw (
  gameid text,
  gamedatetimeest text,
  hometeamid text,
  awayteamid text,
  hometeamcity text,
  hometeamname text,
  awayteamcity text,
  awayteamname text,
  gameday text,
  arenaname text,
  arenacity text,
  arenastate text,
  gamelabel text,
  gamesublabel text,
  gamesubtype text,
  seriesgamenumber text,
  weeknumber text
);

\copy staging.league_schedule_2025_26_raw FROM 'data/kaggle_nba_sync/LeagueSchedule25_26.csv' WITH (FORMAT csv, HEADER true);

INSERT INTO public.league_schedule_2025_26 (
  game_id,
  game_datetime_est,
  week_number,
  home_team_id,
  away_team_id,
  arena_name,
  arena_city,
  arena_state,
  game_label,
  game_sublabel,
  series_game_number
)
SELECT
  r.gameid::bigint,
  NULLIF(r.gamedatetimeest,'')::timestamp,

  CASE WHEN NULLIF(r.weeknumber,'') ~ '^\d+$' THEN r.weeknumber::int ELSE NULL END,

  r.hometeamid::bigint,
  r.awayteamid::bigint,
  NULLIF(r.arenaname,''),
  NULLIF(r.arenacity,''),
  NULLIF(r.arenastate,''),
  NULLIF(r.gamelabel,''),
  NULLIF(r.gamesublabel,''),

  CASE
    WHEN NULLIF(r.seriesgamenumber,'') ~ '^\d+$' THEN r.seriesgamenumber::int
    WHEN NULLIF(r.seriesgamenumber,'') ~* '^game[ ]*\d+$' THEN regexp_replace(r.seriesgamenumber, '\D', '', 'g')::int
    ELSE NULL
  END
FROM staging.league_schedule_2025_26_raw r
JOIN public.teams ht ON ht.team_id::text = r.hometeamid
JOIN public.teams at ON at.team_id::text = r.awayteamid
WHERE NULLIF(r.gamedatetimeest,'') IS NOT NULL
ON CONFLICT (game_id) DO UPDATE SET
  game_datetime_est  = EXCLUDED.game_datetime_est,
  week_number        = EXCLUDED.week_number,
  home_team_id       = EXCLUDED.home_team_id,
  away_team_id       = EXCLUDED.away_team_id,
  arena_name         = EXCLUDED.arena_name,
  arena_city         = EXCLUDED.arena_city,
  arena_state        = EXCLUDED.arena_state,
  game_label         = EXCLUDED.game_label,
  game_sublabel      = EXCLUDED.game_sublabel,
  series_game_number = EXCLUDED.series_game_number;

COMMIT;

-- ============================================================
-- 5) GAMES  Games.csv -> public.games  (separate staging)
-- ============================================================
BEGIN;

DROP TABLE IF EXISTS staging.games_csv_raw;

CREATE TABLE staging.games_csv_raw (
  gameid text,
  gamedatetimeest text,
  hometeamcity text,
  hometeamname text,
  hometeamid text,
  awayteamcity text,
  awayteamname text,
  awayteamid text,
  homescore text,
  awayscore text,
  winner text,
  gametype text,
  gamesubtype text,
  gamelabel text,
  gamesublabel text,
  seriesgamenumber text,
  attendance text,
  arenaid text,
  arenaname text,
  arenacity text,
  arenastate text,
  officials text,
  gamedate text
);

\copy staging.games_csv_raw FROM 'data/kaggle_nba_sync/Games.csv' WITH (FORMAT csv, HEADER true);

CREATE TABLE IF NOT EXISTS public.games (
  game_id            bigint PRIMARY KEY,
  game_datetime_est  timestamp without time zone,
  home_team_id       bigint REFERENCES public.teams(team_id),
  away_team_id       bigint REFERENCES public.teams(team_id),
  home_score         integer,
  away_score         integer,
  winner             text,
  game_type          text,
  game_subtype       text,
  game_label         text,
  game_sublabel      text,
  series_game_number integer,
  attendance         integer,
  arena_id           text,
  arena_name         text,
  arena_city         text,
  arena_state        text,
  officials          text
);

CREATE INDEX IF NOT EXISTS idx_games_dt      ON public.games(game_datetime_est);
CREATE INDEX IF NOT EXISTS idx_games_home_dt ON public.games(home_team_id, game_datetime_est);
CREATE INDEX IF NOT EXISTS idx_games_away_dt ON public.games(away_team_id, game_datetime_est);

INSERT INTO public.games (
  game_id, game_datetime_est, home_team_id, away_team_id,
  home_score, away_score, winner,
  game_type, game_subtype, game_label, game_sublabel,
  series_game_number, attendance,
  arena_id, arena_name, arena_city, arena_state, officials
)
SELECT
  r.gameid::bigint,
  NULLIF(r.gamedatetimeest,'')::timestamp,
  r.hometeamid::bigint,
  r.awayteamid::bigint,

  CASE WHEN NULLIF(r.homescore,'') ~ '^-?\d+(\.\d+)?$' THEN (r.homescore::numeric)::int ELSE NULL END,
  CASE WHEN NULLIF(r.awayscore,'') ~ '^-?\d+(\.\d+)?$' THEN (r.awayscore::numeric)::int ELSE NULL END,

  NULLIF(r.winner,''),
  NULLIF(r.gametype,''),
  NULLIF(r.gamesubtype,''),
  NULLIF(r.gamelabel,''),
  NULLIF(r.gamesublabel,''),
  CASE WHEN NULLIF(r.seriesgamenumber,'') ~ '^\d+$' THEN r.seriesgamenumber::int ELSE NULL END,
  CASE WHEN NULLIF(r.attendance,'') ~ '^\d+$' THEN r.attendance::int ELSE NULL END,
  NULLIF(r.arenaid,''),
  NULLIF(r.arenaname,''),
  NULLIF(r.arenacity,''),
  NULLIF(r.arenastate,''),
  NULLIF(r.officials,'')
FROM staging.games_csv_raw r
JOIN public.teams ht ON ht.team_id::text = r.hometeamid
JOIN public.teams at ON at.team_id::text = r.awayteamid
WHERE NULLIF(r.gamedatetimeest,'') IS NOT NULL
ON CONFLICT (game_id) DO UPDATE SET
  game_datetime_est  = EXCLUDED.game_datetime_est,
  home_team_id       = EXCLUDED.home_team_id,
  away_team_id       = EXCLUDED.away_team_id,
  home_score         = EXCLUDED.home_score,
  away_score         = EXCLUDED.away_score,
  winner             = EXCLUDED.winner,
  game_type          = EXCLUDED.game_type,
  game_subtype       = EXCLUDED.game_subtype,
  game_label         = EXCLUDED.game_label,
  game_sublabel      = EXCLUDED.game_sublabel,
  series_game_number = EXCLUDED.series_game_number,
  attendance         = EXCLUDED.attendance,
  arena_id           = EXCLUDED.arena_id,
  arena_name         = EXCLUDED.arena_name,
  arena_city         = EXCLUDED.arena_city,
  arena_state        = EXCLUDED.arena_state,
  officials          = EXCLUDED.officials;

COMMIT;

-- ============================================================
-- 6) PLAYER ADVANCED  PlayerStatisticsAdvanced.csv -> public.player_game_stats_advanced
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.player_game_stats_advanced (
  game_id           bigint NOT NULL,
  person_id         bigint NOT NULL REFERENCES public.players(person_id),
  team_id           bigint REFERENCES public.teams(team_id),
  game_datetime_est timestamp without time zone,
  home              boolean,
  win               boolean,
  minutes           numeric,
  astpct            numeric,
  astratio          numeric,
  astto             numeric,
  defrating         numeric,
  drebpct           numeric,
  enetrating        numeric,
  offrating         numeric,
  netrating         numeric,
  pace              numeric,
  pie               numeric,
  poss              numeric,
  rebpct            numeric,
  tspct             numeric,
  usgpct            numeric,
  PRIMARY KEY (game_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_pgsa_person_dt ON public.player_game_stats_advanced(person_id, game_datetime_est DESC);

DROP TABLE IF EXISTS staging.player_stats_advanced_raw;

CREATE TABLE staging.player_stats_advanced_raw (
  gameid text,
  personid text,
  firstname text,
  lastname text,
  playerteamcity text,
  playerteamname text,
  gametype text,
  astpct text,
  astratio text,
  astto text,
  availableflag text,
  defrating text,
  drebpct text,
  edefrating text,
  enetrating text,
  eoffrating text,
  epace text,
  etovpct text,
  eusgpct text,
  efgpct text,
  fgpct text,
  fga text,
  fgapg text,
  fgm text,
  fgm_pg text,
  gamedate text,
  gamedatetimeest text,
  home text,
  matchup text,
  min text,
  minsec text,
  netrating text,
  nickname text,
  offrating text,
  opponentteamcity text,
  opponentteamname text,
  orebpct text,
  pace text,
  paceper40 text,
  pie text,
  playername text,
  poss text,
  rebpct text,
  sp_work_def_rating text,
  sp_work_def_rating_rank text,
  sp_work_net_rating text,
  sp_work_net_rating_rank text,
  sp_work_off_rating text,
  sp_work_off_rating_rank text,
  sp_work_pace text,
  sp_work_pace_rank text,
  teamabbreviation text,
  teamcount text,
  teamid text,
  teamname text,
  tmtovpct text,
  tspct text,
  usgpct text,
  win text,
  wl text
);

\copy staging.player_stats_advanced_raw FROM 'data/kaggle_nba_sync/PlayerStatisticsAdvanced.csv' WITH (FORMAT csv, HEADER true);

INSERT INTO public.player_game_stats_advanced (
  game_id, person_id, team_id, game_datetime_est, home, win, minutes,
  astpct, astratio, astto, defrating, drebpct, enetrating, offrating, netrating,
  pace, pie, poss, rebpct, tspct, usgpct
)
SELECT
  r.gameid::bigint,
  r.personid::bigint,
  r.teamid::bigint,
  NULLIF(r.gamedatetimeest,'')::timestamp,
  ((NULLIF(r.home,'')::numeric)::int = 1),
  ((NULLIF(r.win,'')::numeric)::int = 1),
  NULLIF(r.min,'')::numeric,
  NULLIF(r.astpct,'')::numeric,
  NULLIF(r.astratio,'')::numeric,
  NULLIF(r.astto,'')::numeric,
  NULLIF(r.defrating,'')::numeric,
  NULLIF(r.drebpct,'')::numeric,
  NULLIF(r.enetrating,'')::numeric,
  NULLIF(r.offrating,'')::numeric,
  NULLIF(r.netrating,'')::numeric,
  NULLIF(r.pace,'')::numeric,
  NULLIF(r.pie,'')::numeric,
  NULLIF(r.poss,'')::numeric,
  NULLIF(r.rebpct,'')::numeric,
  NULLIF(r.tspct,'')::numeric,
  NULLIF(r.usgpct,'')::numeric
FROM staging.player_stats_advanced_raw r
JOIN public.players p ON p.person_id::text = r.personid
JOIN public.teams t ON t.team_id::text = r.teamid
WHERE NULLIF(r.gamedatetimeest,'') IS NOT NULL
ON CONFLICT (game_id, person_id) DO UPDATE SET
  team_id           = EXCLUDED.team_id,
  game_datetime_est = EXCLUDED.game_datetime_est,
  home              = EXCLUDED.home,
  win               = EXCLUDED.win,
  minutes           = EXCLUDED.minutes,
  astpct            = EXCLUDED.astpct,
  astratio          = EXCLUDED.astratio,
  astto             = EXCLUDED.astto,
  defrating         = EXCLUDED.defrating,
  drebpct           = EXCLUDED.drebpct,
  enetrating        = EXCLUDED.enetrating,
  offrating         = EXCLUDED.offrating,
  netrating         = EXCLUDED.netrating,
  pace              = EXCLUDED.pace,
  pie               = EXCLUDED.pie,
  poss              = EXCLUDED.poss,
  rebpct            = EXCLUDED.rebpct,
  tspct             = EXCLUDED.tspct,
  usgpct            = EXCLUDED.usgpct;

COMMIT;

-- ============================================================
-- 7) PLAYER GAME STATS (BASE) PlayerStatistics.csv -> public.player_game_stats
--     Base table must come from PlayerStatistics.csv, not advanced/scoring.
-- ============================================================
BEGIN;

DROP TABLE IF EXISTS staging.player_stats_raw;

CREATE TABLE staging.player_stats_raw (
  firstname text,
  lastname text,
  personid text,
  gameid text,
  gamedatetimeest text,
  playerteamcity text,
  playerteamname text,
  opponentteamcity text,
  opponentteamname text,
  gametype text,
  gamelabel text,
  gamesublabel text,
  seriesgamenumber text,
  win text,
  home text,
  numminutes text,
  points text,
  assists text,
  blocks text,
  steals text,
  fieldgoalsattempted text,
  fieldgoalsmade text,
  fieldgoalspercentage text,
  threepointersattempted text,
  threepointersmade text,
  threepointerspercentage text,
  freethrowsattempted text,
  freethrowsmade text,
  freethrowspercentage text,
  reboundsdefensive text,
  reboundsoffensive text,
  reboundstotal text,
  foulspersonal text,
  turnovers text,
  plusminuspoints text,
  playerteamid text,
  opponentteamid text,
  comment text,
  startingposition text,
  gamedate text
);

\copy staging.player_stats_raw FROM 'data/kaggle_nba_sync/PlayerStatistics.csv' WITH (FORMAT csv, HEADER true);

TRUNCATE TABLE public.player_game_stats;

INSERT INTO public.player_game_stats (
  game_id, person_id,
  team_id, opponent_team_id,
  game_datetime_est,
  game_type, game_label, game_sublabel, series_game_number,
  win, home, minutes,
  points, assists, blocks, steals,
  fga, fgm, fg_pct,
  tpa, tpm, tp_pct,
  fta, ftm, ft_pct,
  reb_def, reb_off, reb_total,
  fouls, turnovers, plus_minus,
  season
)
SELECT
  r.gameid::bigint,
  r.personid::bigint,
  t.team_id,
  NULLIF(r.opponentteamid,'')::bigint,
  COALESCE(tgs.game_datetime_est, NULLIF(r.gamedatetimeest,'')::timestamp),
  NULLIF(r.gametype,''),
  NULLIF(r.gamelabel,''),
  NULLIF(r.gamesublabel,''),
  CASE
    WHEN NULLIF(r.seriesgamenumber,'') ~ '^\d+$' THEN r.seriesgamenumber::int
    WHEN NULLIF(r.seriesgamenumber,'') ~* '^game[ ]*\d+$' THEN regexp_replace(r.seriesgamenumber, '\D', '', 'g')::int
    ELSE NULL
  END,
  CASE
    WHEN LOWER(NULLIF(r.win,'')) IN ('true','t','1','yes','y','w') THEN TRUE
    WHEN LOWER(NULLIF(r.win,'')) IN ('false','f','0','no','n','l') THEN FALSE
    ELSE tgs.win
  END,
  CASE
    WHEN LOWER(NULLIF(r.home,'')) IN ('true','t','1','yes','y') THEN TRUE
    WHEN LOWER(NULLIF(r.home,'')) IN ('false','f','0','no','n') THEN FALSE
    ELSE tgs.home
  END,
  NULLIF(r.numminutes,'')::numeric,
  (NULLIF(r.points,'')::numeric)::int,
  (NULLIF(r.assists,'')::numeric)::int,
  (NULLIF(r.blocks,'')::numeric)::int,
  (NULLIF(r.steals,'')::numeric)::int,
  (NULLIF(r.fieldgoalsattempted,'')::numeric)::int,
  (NULLIF(r.fieldgoalsmade,'')::numeric)::int,
  NULLIF(r.fieldgoalspercentage,'')::numeric,
  (NULLIF(r.threepointersattempted,'')::numeric)::int,
  (NULLIF(r.threepointersmade,'')::numeric)::int,
  NULLIF(r.threepointerspercentage,'')::numeric,
  (NULLIF(r.freethrowsattempted,'')::numeric)::int,
  (NULLIF(r.freethrowsmade,'')::numeric)::int,
  NULLIF(r.freethrowspercentage,'')::numeric,
  (NULLIF(r.reboundsdefensive,'')::numeric)::int,
  (NULLIF(r.reboundsoffensive,'')::numeric)::int,
  (NULLIF(r.reboundstotal,'')::numeric)::int,
  (NULLIF(r.foulspersonal,'')::numeric)::int,
  (NULLIF(r.turnovers,'')::numeric)::int,
  (NULLIF(r.plusminuspoints,'')::numeric)::int,
  CASE
    WHEN EXTRACT(MONTH FROM COALESCE(tgs.game_datetime_est, NULLIF(r.gamedatetimeest,'')::timestamp)) >= 10
      THEN TO_CHAR(COALESCE(tgs.game_datetime_est, NULLIF(r.gamedatetimeest,'')::timestamp), 'YYYY')
           || '-'
           || RIGHT((EXTRACT(YEAR FROM COALESCE(tgs.game_datetime_est, NULLIF(r.gamedatetimeest,'')::timestamp))::int + 1)::text, 2)
    ELSE (EXTRACT(YEAR FROM COALESCE(tgs.game_datetime_est, NULLIF(r.gamedatetimeest,'')::timestamp))::int - 1)::text
         || '-'
         || RIGHT(EXTRACT(YEAR FROM COALESCE(tgs.game_datetime_est, NULLIF(r.gamedatetimeest,'')::timestamp))::int::text, 2)
  END
  FROM staging.player_stats_raw r
  JOIN public.players p
    ON p.person_id::text = r.personid
  JOIN public.teams t
    ON t.team_id::text = r.playerteamid
  LEFT JOIN public.team_game_stats tgs
    ON tgs.game_id = r.gameid::bigint
  AND tgs.team_id = t.team_id
  WHERE r.gameid IS NOT NULL
    AND NULLIF(r.playerteamid, '') IS NOT NULL;

COMMIT;

-- ============================================================
-- 8) PLAYER MISC  PlayerStatisticsMisc.csv -> public.player_game_stats_misc
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.player_game_stats_misc (
  game_id           bigint NOT NULL,
  person_id         bigint NOT NULL REFERENCES public.players(person_id),
  team_id           bigint REFERENCES public.teams(team_id),
  game_datetime_est timestamp without time zone,
  home              boolean,
  win               boolean,
  minutes           numeric,
  nba_fantasy_pts   numeric,
  pts_fb            numeric,
  pts_paint         numeric,
  pts_2nd_chance    numeric,
  pts_off_tov       numeric,
  opp_pts_fb        numeric,
  opp_pts_paint     numeric,
  opp_pts_2nd_chance numeric,
  opp_pts_off_tov   numeric,
  blk               integer,
  blka              integer,
  pf                integer,
  pfd               integer,
  PRIMARY KEY (game_id, person_id)
);

DROP TABLE IF EXISTS staging.player_stats_misc_raw;

CREATE TABLE staging.player_stats_misc_raw (
  gameid text, personid text, firstname text, lastname text,
  playerteamcity text, playerteamname text, gametype text, availableflag text,
  blk text, blka text, gamedate text, gamedatetimeest text, home text,
  matchup text, min text, minsec text, nbafantasypts text, nickname text,
  opppts2ndchance text, oppptsfb text, oppptsofftov text, oppptspaint text,
  opponentteamcity text, opponentteamname text, pf text, pfd text, playername text,
  pts2ndchance text, ptsfb text, ptsofftov text, ptspaint text,
  teamabbreviation text, teamcount text, teamid text, teamname text, win text, wl text
);

\copy staging.player_stats_misc_raw FROM 'data/kaggle_nba_sync/PlayerStatisticsMisc.csv' WITH (FORMAT csv, HEADER true);

INSERT INTO public.player_game_stats_misc (
  game_id, person_id, team_id, game_datetime_est, home, win, minutes,
  nba_fantasy_pts, pts_fb, pts_paint, pts_2nd_chance, pts_off_tov,
  opp_pts_fb, opp_pts_paint, opp_pts_2nd_chance, opp_pts_off_tov,
  blk, blka, pf, pfd
)
SELECT
  r.gameid::bigint,
  r.personid::bigint,
  r.teamid::bigint,
  NULLIF(r.gamedatetimeest,'')::timestamp,
  ((NULLIF(r.home,'')::numeric)::int = 1),
  ((NULLIF(r.win,'')::numeric)::int = 1),
  NULLIF(r.min,'')::numeric,

  NULLIF(r.nbafantasypts,'')::numeric,
  NULLIF(r.ptsfb,'')::numeric,
  NULLIF(r.ptspaint,'')::numeric,
  NULLIF(r.pts2ndchance,'')::numeric,
  NULLIF(r.ptsofftov,'')::numeric,

  NULLIF(r.oppptsfb,'')::numeric,
  NULLIF(r.oppptspaint,'')::numeric,
  NULLIF(r.opppts2ndchance,'')::numeric,
  NULLIF(r.oppptsofftov,'')::numeric,

  (NULLIF(r.blk,'')::numeric)::int,
  (NULLIF(r.blka,'')::numeric)::int,
  (NULLIF(r.pf,'')::numeric)::int,
  (NULLIF(r.pfd,'')::numeric)::int
FROM staging.player_stats_misc_raw r
JOIN public.players p ON p.person_id::text = r.personid
JOIN public.teams t ON t.team_id::text = r.teamid
WHERE NULLIF(r.gamedatetimeest,'') IS NOT NULL
ON CONFLICT (game_id, person_id) DO UPDATE SET
  team_id            = EXCLUDED.team_id,
  game_datetime_est  = EXCLUDED.game_datetime_est,
  home               = EXCLUDED.home,
  win                = EXCLUDED.win,
  minutes            = EXCLUDED.minutes,
  nba_fantasy_pts    = EXCLUDED.nba_fantasy_pts,
  pts_fb             = EXCLUDED.pts_fb,
  pts_paint          = EXCLUDED.pts_paint,
  pts_2nd_chance     = EXCLUDED.pts_2nd_chance,
  pts_off_tov        = EXCLUDED.pts_off_tov,
  opp_pts_fb         = EXCLUDED.opp_pts_fb,
  opp_pts_paint      = EXCLUDED.opp_pts_paint,
  opp_pts_2nd_chance = EXCLUDED.opp_pts_2nd_chance,
  opp_pts_off_tov    = EXCLUDED.opp_pts_off_tov,
  blk                = EXCLUDED.blk,
  blka               = EXCLUDED.blka,
  pf                 = EXCLUDED.pf,
  pfd                = EXCLUDED.pfd;

COMMIT;


-- ============================================================
-- 9.) PLAYER SCORING  PlayerStatisticsScoring.csv -> public.player_game_stats_scoring
-- Fixes misaligned CSV parsing by recreating staging in exact header order
-- ============================================================

BEGIN;

-- Ensure public table exists (no-op if already created)
CREATE TABLE IF NOT EXISTS public.player_game_stats_scoring (
  game_id bigint NOT NULL,
  person_id bigint NOT NULL REFERENCES public.players(person_id),
  team_id bigint REFERENCES public.teams(team_id),
  game_datetime_est timestamp without time zone,
  home boolean,
  win boolean,
  minutes numeric,

  fg_pct numeric,
  fga integer,
  fgm integer,

  pct_pts_3pt numeric,
  pct_pts_ft numeric,
  pct_pts_paint numeric,
  pct_pts_fb numeric,
  pct_pts_off_tov numeric,

  PRIMARY KEY (game_id, person_id)
);

-- Recreate staging table with columns in EXACT CSV header order
DROP TABLE IF EXISTS staging.player_stats_scoring_raw;

CREATE TABLE staging.player_stats_scoring_raw (
  gameid text,
  personid text,
  firstname text,
  lastname text,
  playerteamcity text,
  playerteamname text,
  gametype text,
  availableflag text,
  fgpct text,
  fga text,
  fgm text,
  gamedate text,
  gamedatetimeest text,
  home text,
  matchup text,
  min text,
  minsec text,
  nickname text,
  opponentteamcity text,
  opponentteamname text,
  pctast2pm text,
  pctast3pm text,
  pctastfgm text,
  pctfga2pt text,
  pctfga3pt text,
  pctpts2pt text,
  pctpts2ptmr text,
  pctpts3pt text,
  pctptsfb text,
  pctptsft text,
  pctptsofftov text,
  pctptspaint text,
  pctuast2pm text,
  pctuast3pm text,
  pctuastfgm text,
  playername text,
  teamabbreviation text,
  teamcount text,
  teamid text,
  teamname text,
  win text,
  wl text
);

-- Client-side copy with explicit column list (prevents shifting/misalignment)
\copy staging.player_stats_scoring_raw FROM 'data/kaggle_nba_sync/PlayerStatisticsScoring.csv' WITH (FORMAT csv, HEADER true);

-- Upsert into public table (filtered to current players + current teams)
INSERT INTO public.player_game_stats_scoring (
  game_id, person_id, team_id, game_datetime_est, home, win, minutes,
  fg_pct, fga, fgm,
  pct_pts_3pt, pct_pts_ft, pct_pts_paint, pct_pts_fb, pct_pts_off_tov
)
SELECT
  NULLIF(r.gameid,'')::bigint,
  NULLIF(r.personid,'')::bigint,
  NULLIF(r.teamid,'')::bigint,
  NULLIF(r.gamedatetimeest,'')::timestamp,
  (COALESCE(NULLIF(r.home,''),'0')::int = 1),
  (COALESCE(NULLIF(r.win,''),'0')::int = 1),
  NULLIF(r.min,'')::numeric,

  NULLIF(r.fgpct,'')::numeric,
  NULLIF(r.fga,'')::numeric::int,
  NULLIF(r.fgm,'')::numeric::int,

  NULLIF(r.pctpts3pt,'')::numeric,
  NULLIF(r.pctptsft,'')::numeric,
  NULLIF(r.pctptspaint,'')::numeric,
  NULLIF(r.pctptsfb,'')::numeric,
  NULLIF(r.pctptsofftov,'')::numeric
FROM staging.player_stats_scoring_raw r
JOIN public.players p ON p.person_id = NULLIF(r.personid,'')::bigint
JOIN public.teams   t ON t.team_id   = NULLIF(r.teamid,'')::bigint
WHERE NULLIF(r.gamedatetimeest,'') IS NOT NULL
ON CONFLICT (game_id, person_id) DO UPDATE SET
  team_id           = EXCLUDED.team_id,
  game_datetime_est = EXCLUDED.game_datetime_est,
  home              = EXCLUDED.home,
  win               = EXCLUDED.win,
  minutes           = EXCLUDED.minutes,
  fg_pct            = EXCLUDED.fg_pct,
  fga               = EXCLUDED.fga,
  fgm               = EXCLUDED.fgm,
  pct_pts_3pt       = EXCLUDED.pct_pts_3pt,
  pct_pts_ft        = EXCLUDED.pct_pts_ft,
  pct_pts_paint     = EXCLUDED.pct_pts_paint,
  pct_pts_fb        = EXCLUDED.pct_pts_fb,
  pct_pts_off_tov   = EXCLUDED.pct_pts_off_tov;

COMMIT;

-- ============================================================
-- 10) PLAYER USAGE  PlayerStatisticsUsage.csv -> public.player_game_stats_usage
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.player_game_stats_usage (
  game_id bigint NOT NULL,
  person_id bigint NOT NULL REFERENCES public.players(person_id),
  team_id bigint REFERENCES public.teams(team_id),
  game_datetime_est timestamp without time zone,
  home boolean,
  win boolean,
  minutes numeric,
  usg_pct numeric,
  pct_reb numeric,
  pct_ast numeric,
  pct_tov numeric,
  pct_stl numeric,
  pct_blk numeric,
  PRIMARY KEY (game_id, person_id)
);

DROP TABLE IF EXISTS staging.player_stats_usage_raw;

CREATE TABLE staging.player_stats_usage_raw (
  gameid text, personid text, firstname text, lastname text,
  playerteamcity text, playerteamname text, gametype text, availableflag text,
  gamedate text, gamedatetimeest text, home text, matchup text, min text, minsec text,
  nickname text, opponentteamcity text, opponentteamname text,
  pctast text, pctblk text, pctblka text, pctdreb text, pctfg3a text, pctfg3m text,
  pctfga text, pctfgm text, pctfta text, pctftm text, pctoreb text, pctpf text,
  pctpfd text, pctpts text, pctreb text, pctstl text, pcttov text,
  playername text, teamabbreviation text, teamcount text, teamid text, teamname text,
  usgpct text, win text, wl text
);

\copy staging.player_stats_usage_raw FROM 'data/kaggle_nba_sync/PlayerStatisticsUsage.csv' WITH (FORMAT csv, HEADER true);

INSERT INTO public.player_game_stats_usage (
  game_id, person_id, team_id, game_datetime_est, home, win, minutes,
  usg_pct, pct_reb, pct_ast, pct_tov, pct_stl, pct_blk
)
SELECT
  r.gameid::bigint,
  r.personid::bigint,
  r.teamid::bigint,
  NULLIF(r.gamedatetimeest,'')::timestamp,
  ((NULLIF(r.home,'')::numeric)::int = 1),
  ((NULLIF(r.win,'')::numeric)::int = 1),
  NULLIF(r.min,'')::numeric,
  NULLIF(r.usgpct,'')::numeric,
  NULLIF(r.pctreb,'')::numeric,
  NULLIF(r.pctast,'')::numeric,
  NULLIF(r.pcttov,'')::numeric,
  NULLIF(r.pctstl,'')::numeric,
  NULLIF(r.pctblk,'')::numeric
FROM staging.player_stats_usage_raw r
JOIN public.players p ON p.person_id::text = r.personid
JOIN public.teams t ON t.team_id::text = r.teamid
WHERE NULLIF(r.gamedatetimeest,'') IS NOT NULL
ON CONFLICT (game_id, person_id) DO UPDATE SET
  team_id           = EXCLUDED.team_id,
  game_datetime_est = EXCLUDED.game_datetime_est,
  home              = EXCLUDED.home,
  win               = EXCLUDED.win,
  minutes           = EXCLUDED.minutes,
  usg_pct           = EXCLUDED.usg_pct,
  pct_reb           = EXCLUDED.pct_reb,
  pct_ast           = EXCLUDED.pct_ast,
  pct_tov           = EXCLUDED.pct_tov,
  pct_stl           = EXCLUDED.pct_stl,
  pct_blk           = EXCLUDED.pct_blk;

COMMIT;

-- ============================================================
-- 11.) Team Statistics Four Factors TeamStatisticsFourFactors.csv -> public.team_game_stats_four_factors
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.team_game_stats_four_factors (
  game_id           bigint NOT NULL,
  team_id           bigint NOT NULL REFERENCES public.teams(team_id),
  opponent_team_id  bigint REFERENCES public.teams(team_id),
  game_datetime_est timestamp without time zone,
  home              boolean,
  win               boolean,
  minutes           numeric,
  game_type         text,
  matchup           text,
  wl                text,

  efg_pct           numeric,
  fta_rate          numeric,
  oreb_pct          numeric,
  tm_tov_pct        numeric,

  opp_efg_pct       numeric,
  opp_fta_rate      numeric,
  opp_oreb_pct      numeric,
  opp_tov_pct       numeric,

  PRIMARY KEY (game_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_tgsff_team_dt
  ON public.team_game_stats_four_factors(team_id, game_datetime_est DESC);

DROP TABLE IF EXISTS staging.team_stats_four_factors_raw;

CREATE TABLE staging.team_stats_four_factors_raw (
  gameid text,
  teamid text,
  teamcity text,
  teamname text,
  gametype text,
  availableflag text,
  efgpct text,
  ftarate text,
  gamedate text,
  gamedatetimeest text,
  home text,
  matchup text,
  min text,
  oppefgpct text,
  oppftarate text,
  opporebpct text,
  opptovpct text,
  opponentteamcity text,
  opponentteamid text,
  opponentteamname text,
  orebpct text,
  teamabbreviation text,
  teamname_right text,
  tmtovpct text,
  win text,
  wl text
);

TRUNCATE staging.team_stats_four_factors_raw;

\copy staging.team_stats_four_factors_raw FROM 'data/kaggle_nba_sync/TeamStatisticsFourFactors.csv' WITH (FORMAT csv, HEADER true);

INSERT INTO public.team_game_stats_four_factors (
  game_id, team_id, opponent_team_id,
  game_datetime_est, home, win, minutes,
  game_type, matchup, wl,
  efg_pct, fta_rate, oreb_pct, tm_tov_pct,
  opp_efg_pct, opp_fta_rate, opp_oreb_pct, opp_tov_pct
)
SELECT
  r.gameid::bigint,
  r.teamid::bigint,
  r.opponentteamid::bigint,

  NULLIF(r.gamedatetimeest,'')::timestamp,
  (NULLIF(r.home,'') ~ '^\d+$' AND r.home::int = 1),
  (NULLIF(r.win,'')  ~ '^\d+$' AND r.win::int  = 1),
  NULLIF(r.min,'')::numeric,

  NULLIF(r.gametype,''),
  NULLIF(r.matchup,''),
  NULLIF(r.wl,''),

  NULLIF(r.efgpct,'')::numeric,
  NULLIF(r.ftarate,'')::numeric,
  NULLIF(r.orebpct,'')::numeric,
  NULLIF(r.tmtovpct,'')::numeric,

  NULLIF(r.oppefgpct,'')::numeric,
  NULLIF(r.oppftarate,'')::numeric,
  NULLIF(r.opporebpct,'')::numeric,
  NULLIF(r.opptovpct,'')::numeric
FROM staging.team_stats_four_factors_raw r
JOIN public.teams t  ON t.team_id::text  = r.teamid
JOIN public.teams ot ON ot.team_id::text = r.opponentteamid
WHERE NULLIF(r.gamedatetimeest,'') IS NOT NULL
ON CONFLICT (game_id, team_id) DO UPDATE SET
  opponent_team_id  = EXCLUDED.opponent_team_id,
  game_datetime_est = EXCLUDED.game_datetime_est,
  home              = EXCLUDED.home,
  win               = EXCLUDED.win,
  minutes           = EXCLUDED.minutes,
  game_type         = EXCLUDED.game_type,
  matchup           = EXCLUDED.matchup,
  wl                = EXCLUDED.wl,
  efg_pct           = EXCLUDED.efg_pct,
  fta_rate          = EXCLUDED.fta_rate,
  oreb_pct          = EXCLUDED.oreb_pct,
  tm_tov_pct        = EXCLUDED.tm_tov_pct,
  opp_efg_pct       = EXCLUDED.opp_efg_pct,
  opp_fta_rate      = EXCLUDED.opp_fta_rate,
  opp_oreb_pct      = EXCLUDED.opp_oreb_pct,
  opp_tov_pct       = EXCLUDED.opp_tov_pct;

COMMIT;

-- ============================================================
-- 12.) Team Statistics Misc TeamStatisticsMisc.csv -> public.team_game_stats_misc
-- ============================================================

BEGIN;


CREATE TABLE IF NOT EXISTS public.team_game_stats_misc (
  game_id           bigint NOT NULL,
  team_id           bigint NOT NULL REFERENCES public.teams(team_id),
  opponent_team_id  bigint REFERENCES public.teams(team_id),
  game_datetime_est timestamp without time zone,
  home              boolean,
  win               boolean,
  minutes           numeric,
  game_type         text,
  matchup           text,
  wl                text,

  pts_2nd_chance    integer,
  pts_fb            integer,
  pts_off_tov       integer,
  pts_paint         integer,

  opp_pts_2nd_chance integer,
  opp_pts_fb         integer,
  opp_pts_off_tov    integer,
  opp_pts_paint      integer,

  PRIMARY KEY (game_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_tgsm_team_dt
  ON public.team_game_stats_misc(team_id, game_datetime_est DESC);

DROP TABLE IF EXISTS staging.team_stats_misc_raw;

CREATE TABLE staging.team_stats_misc_raw (
  gameid text,
  teamid text,
  teamcity text,
  teamname text,
  gametype text,
  availableflag text,
  gamedate text,
  gamedatetimeest text,
  home text,
  matchup text,
  min text,
  opppts2ndchance text,
  oppptsfb text,
  oppptsofftov text,
  oppptspaint text,
  opponentteamcity text,
  opponentteamid text,
  opponentteamname text,
  pts2ndchance text,
  ptsfb text,
  ptsofftov text,
  ptspaint text,
  teamabbreviation text,
  teamname_right text,
  win text,
  wl text
);

TRUNCATE staging.team_stats_misc_raw;

\copy staging.team_stats_misc_raw FROM 'data/kaggle_nba_sync/TeamStatisticsMisc.csv' WITH (FORMAT csv, HEADER true);

INSERT INTO public.team_game_stats_misc (
  game_id, team_id, opponent_team_id,
  game_datetime_est, home, win, minutes,
  game_type, matchup, wl,
  pts_2nd_chance, pts_fb, pts_off_tov, pts_paint,
  opp_pts_2nd_chance, opp_pts_fb, opp_pts_off_tov, opp_pts_paint
)
SELECT
  r.gameid::bigint,
  r.teamid::bigint,
  r.opponentteamid::bigint,

  NULLIF(r.gamedatetimeest,'')::timestamp,
  (NULLIF(r.home,'') ~ '^\d+$' AND r.home::int = 1),
  (NULLIF(r.win,'')  ~ '^\d+$' AND r.win::int  = 1),
  NULLIF(r.min,'')::numeric,

  NULLIF(r.gametype,''),
  NULLIF(r.matchup,''),
  NULLIF(r.wl,''),

  NULLIF(r.pts2ndchance,'')::numeric::int,
  NULLIF(r.ptsfb,'')::numeric::int,
  NULLIF(r.ptsofftov,'')::numeric::int,
  NULLIF(r.ptspaint,'')::numeric::int,

  NULLIF(r.opppts2ndchance,'')::numeric::int,
  NULLIF(r.oppptsfb,'')::numeric::int,
  NULLIF(r.oppptsofftov,'')::numeric::int,
  NULLIF(r.oppptspaint,'')::numeric::int
FROM staging.team_stats_misc_raw r
JOIN public.teams t  ON t.team_id::text  = r.teamid
JOIN public.teams ot ON ot.team_id::text = r.opponentteamid
WHERE NULLIF(r.gamedatetimeest,'') IS NOT NULL
ON CONFLICT (game_id, team_id) DO UPDATE SET
  opponent_team_id     = EXCLUDED.opponent_team_id,
  game_datetime_est    = EXCLUDED.game_datetime_est,
  home                = EXCLUDED.home,
  win                 = EXCLUDED.win,
  minutes             = EXCLUDED.minutes,
  game_type           = EXCLUDED.game_type,
  matchup             = EXCLUDED.matchup,
  wl                  = EXCLUDED.wl,
  pts_2nd_chance      = EXCLUDED.pts_2nd_chance,
  pts_fb              = EXCLUDED.pts_fb,
  pts_off_tov         = EXCLUDED.pts_off_tov,
  pts_paint           = EXCLUDED.pts_paint,
  opp_pts_2nd_chance  = EXCLUDED.opp_pts_2nd_chance,
  opp_pts_fb          = EXCLUDED.opp_pts_fb,
  opp_pts_off_tov     = EXCLUDED.opp_pts_off_tov,
  opp_pts_paint       = EXCLUDED.opp_pts_paint;

COMMIT;

-- ============================================================
-- 13.) Team Statistics Scoring TeamStatisticsScoring.csv -> public.team_game_stats_scoring

BEGIN;

\echo '=== TEAM SCORING (TeamStatisticsScoring.csv) ==='

CREATE TABLE IF NOT EXISTS public.team_game_stats_scoring (
  game_id           bigint NOT NULL,
  team_id           bigint NOT NULL REFERENCES public.teams(team_id),
  opponent_team_id  bigint REFERENCES public.teams(team_id),
  game_datetime_est timestamp without time zone,
  home              boolean,
  win               boolean,
  minutes           numeric,
  game_type         text,
  matchup           text,
  wl                text,

  pct_ast_2pm       numeric,
  pct_ast_3pm       numeric,
  pct_ast_fgm       numeric,
  pct_fga_2pt       numeric,
  pct_fga_3pt       numeric,
  pct_pts_2pt       numeric,
  pct_pts_2pt_mr    numeric,
  pct_pts_3pt       numeric,
  pct_pts_fb        numeric,
  pct_pts_ft        numeric,
  pct_pts_off_tov   numeric,
  pct_pts_paint     numeric,
  pct_uast_2pm      numeric,
  pct_uast_3pm      numeric,
  pct_uast_fgm      numeric,

  PRIMARY KEY (game_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_tgss_team_dt
  ON public.team_game_stats_scoring(team_id, game_datetime_est DESC);

DROP TABLE IF EXISTS staging.team_stats_scoring_raw;

CREATE TABLE staging.team_stats_scoring_raw (
  gameid text,
  teamid text,
  teamcity text,
  teamname text,
  gametype text,
  availableflag text,
  gamedate text,
  gamedatetimeest text,
  home text,
  matchup text,
  min text,
  opponentteamcity text,
  opponentteamid text,
  opponentteamname text,
  pctast2pm text,
  pctast3pm text,
  pctastfgm text,
  pctfga2pt text,
  pctfga3pt text,
  pctpts2pt text,
  pctpts2ptmr text,
  pctpts3pt text,
  pctptsfb text,
  pctptsft text,
  pctptsofftov text,
  pctptspaint text,
  pctuast2pm text,
  pctuast3pm text,
  pctuastfgm text,
  teamabbreviation text,
  teamname_right text,
  win text,
  wl text
);

TRUNCATE staging.team_stats_scoring_raw;

\copy staging.team_stats_scoring_raw FROM 'data/kaggle_nba_sync/TeamStatisticsScoring.csv' WITH (FORMAT csv, HEADER true);

INSERT INTO public.team_game_stats_scoring (
  game_id, team_id, opponent_team_id,
  game_datetime_est, home, win, minutes,
  game_type, matchup, wl,
  pct_ast_2pm, pct_ast_3pm, pct_ast_fgm,
  pct_fga_2pt, pct_fga_3pt,
  pct_pts_2pt, pct_pts_2pt_mr, pct_pts_3pt,
  pct_pts_fb, pct_pts_ft, pct_pts_off_tov, pct_pts_paint,
  pct_uast_2pm, pct_uast_3pm, pct_uast_fgm
)
SELECT
  r.gameid::bigint,
  r.teamid::bigint,
  r.opponentteamid::bigint,

  NULLIF(r.gamedatetimeest,'')::timestamp,
  (NULLIF(r.home,'') ~ '^\d+$' AND r.home::int = 1),
  (NULLIF(r.win,'')  ~ '^\d+$' AND r.win::int  = 1),
  NULLIF(r.min,'')::numeric,

  NULLIF(r.gametype,''),
  NULLIF(r.matchup,''),
  NULLIF(r.wl,''),

  NULLIF(r.pctast2pm,'')::numeric,
  NULLIF(r.pctast3pm,'')::numeric,
  NULLIF(r.pctastfgm,'')::numeric,
  NULLIF(r.pctfga2pt,'')::numeric,
  NULLIF(r.pctfga3pt,'')::numeric,
  NULLIF(r.pctpts2pt,'')::numeric,
  NULLIF(r.pctpts2ptmr,'')::numeric,
  NULLIF(r.pctpts3pt,'')::numeric,
  NULLIF(r.pctptsfb,'')::numeric,
  NULLIF(r.pctptsft,'')::numeric,
  NULLIF(r.pctptsofftov,'')::numeric,
  NULLIF(r.pctptspaint,'')::numeric,
  NULLIF(r.pctuast2pm,'')::numeric,
  NULLIF(r.pctuast3pm,'')::numeric,
  NULLIF(r.pctuastfgm,'')::numeric
FROM staging.team_stats_scoring_raw r
JOIN public.teams t  ON t.team_id::text  = r.teamid
JOIN public.teams ot ON ot.team_id::text = r.opponentteamid
WHERE NULLIF(r.gamedatetimeest,'') IS NOT NULL
ON CONFLICT (game_id, team_id) DO UPDATE SET
  opponent_team_id   = EXCLUDED.opponent_team_id,
  game_datetime_est  = EXCLUDED.game_datetime_est,
  home              = EXCLUDED.home,
  win               = EXCLUDED.win,
  minutes           = EXCLUDED.minutes,
  game_type         = EXCLUDED.game_type,
  matchup           = EXCLUDED.matchup,
  wl                = EXCLUDED.wl,

  pct_ast_2pm       = EXCLUDED.pct_ast_2pm,
  pct_ast_3pm       = EXCLUDED.pct_ast_3pm,
  pct_ast_fgm       = EXCLUDED.pct_ast_fgm,
  pct_fga_2pt       = EXCLUDED.pct_fga_2pt,
  pct_fga_3pt       = EXCLUDED.pct_fga_3pt,
  pct_pts_2pt       = EXCLUDED.pct_pts_2pt,
  pct_pts_2pt_mr    = EXCLUDED.pct_pts_2pt_mr,
  pct_pts_3pt       = EXCLUDED.pct_pts_3pt,
  pct_pts_fb        = EXCLUDED.pct_pts_fb,
  pct_pts_ft        = EXCLUDED.pct_pts_ft,
  pct_pts_off_tov   = EXCLUDED.pct_pts_off_tov,
  pct_pts_paint     = EXCLUDED.pct_pts_paint,
  pct_uast_2pm      = EXCLUDED.pct_uast_2pm,
  pct_uast_3pm      = EXCLUDED.pct_uast_3pm,
  pct_uast_fgm      = EXCLUDED.pct_uast_fgm;

COMMIT;

REFRESH MATERIALIZED VIEW public.mv_team_last5;

\echo '=== VERIFY PLAYER GAME STATS ==='
SELECT MAX(game_datetime_est) AS latest_player_game
FROM public.player_game_stats;

SELECT COUNT(*) AS recent_player_rows
FROM public.player_game_stats
WHERE game_datetime_est >= NOW() - INTERVAL '30 days';

SELECT COUNT(*) AS null_player_dates
FROM public.player_game_stats
WHERE game_datetime_est IS NULL;

\echo '=== STAGING VS FINAL PLAYER CHECKS ==='
SELECT
  (SELECT MAX(NULLIF(gamedatetimeest,'')::timestamp) FROM staging.player_stats_raw) AS staging_latest,
  (SELECT MAX(game_datetime_est) FROM public.player_game_stats) AS final_latest,
  (SELECT COUNT(*) FROM staging.player_stats_raw) AS staging_rows,
  (SELECT COUNT(*) FROM public.player_game_stats) AS final_rows;