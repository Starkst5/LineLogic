
1. SEE ALL TABLES AND VIEWS TOGETHER

SELECT
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_type, table_name;

2. SEE ONLY VIEWS

SELECT
  schemaname,
  viewname
FROM pg_views
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, viewname;

3. SEE ONLY TABLES

SELECT
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename;

4. SEE ALL INDEXES 

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename, indexname;


5.  SEE INDEXES FOR A SPECIFIC TABLE

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'player_game_stats';


6. SEE COLUMNS + DATA TYPES FOR A SPECIFIC TABLE

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'app_player_game_stats'
ORDER BY ordinal_position;


7. SEE ROW COUNTS FOR KEY OBJECTS

SELECT
  'player_game_stats' AS name, COUNT(*) FROM player_game_stats
UNION ALL
SELECT
  'app_player_game_stats', COUNT(*) FROM app_player_game_stats
UNION ALL
SELECT
  'app_player_game_stats_model', COUNT(*) FROM app_player_game_stats_model
UNION ALL
SELECT
  'team_game_stats', COUNT(*) FROM team_game_stats;

8. SEE FOREIGN KEYS & CONSTAINTS

SELECT
  conname,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table,
  contype
FROM pg_constraint
WHERE connamespace NOT IN (
  SELECT oid
  FROM pg_namespace
  WHERE nspname IN ('pg_catalog', 'information_schema')
)
ORDER BY table_name;

ONLY FOREIGN KEYS 

SELECT
  conname,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE contype = 'f'
ORDER BY table_name;

SEE CONSTRAINTS FOR ONE TABLE (e.g. player_game_stats)

SELECT
  conname,
  contype,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conrelid = 'player_game_stats'::regclass;

DECODE CONSTRAINT TYPES

P -> Primary KEY
f -> Foreign Key
c -> Check 
u -> Unique

SELECT
    conname,
    conrelid::regclass AS table_name,
    CASE contype
        WHEN 'p' THEN 'Primary Key'
        WHEN 'f' THEN 'Foreign Key'
        WHEN 'c' THEN 'Check Constraint'
        WHEN 'u' THEN 'Unique Constraint'
    END AS constraint_type,
    confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE connamespace NOT IN (
    SELECT oid
    FROM pg_namespace
    WHERE nspname IN ('pg_catalog', 'information_schema')
)
ORDER BY table_name;


--------------
--
--  Views
--
---------------
    View: Player last 5 games (with niche stats)

          CREATE OR REPLACE VIEW public.v_player_last5_games AS
          WITH ranked AS (
            SELECT
              pg.*,
              ROW_NUMBER() OVER (
                PARTITION BY pg.person_id
                ORDER BY pg.game_datetime_est DESC NULLS LAST, pg.game_id DESC
              ) AS rn
            FROM public.player_game_stats pg
            WHERE pg.game_datetime_est IS NOT NULL
          )
          SELECT
            r.person_id,
            p.first_name,
            p.last_name,
            (p.first_name || ' ' || p.last_name) AS player_name,

            r.game_id,
            r.game_datetime_est,
            r.game_type,
            r.game_label,
            r.game_sublabel,
            r.series_game_number,

            r.team_id,
            t.team_abbrev AS team_abbrev,
            r.opponent_team_id,
            ot.team_abbrev AS opponent_abbrev,

            r.home,
            r.win,

            r.minutes,
            r.points,
            r.assists,
            r.reb_total,
            r.reb_off,
            r.reb_def,
            r.steals,
            r.blocks,
            r.turnovers,
            r.fouls,
            r.plus_minus,

            r.fga, r.fgm, r.fg_pct,
            r.tpa, r.tpm, r.tp_pct,
            r.fta, r.ftm, r.ft_pct,

            -- =========================
            -- Niche / derived metrics
            -- =========================

            -- eFG% = (FGM + 0.5*3PM) / FGA
            CASE
              WHEN COALESCE(r.fga,0) = 0 THEN NULL
              ELSE (r.fgm + 0.5 * COALESCE(r.tpm,0))::numeric / r.fga
            END AS efg_pct,

            -- TS% = PTS / (2*(FGA + 0.44*FTA))
            CASE
              WHEN (COALESCE(r.fga,0) + 0.44 * COALESCE(r.fta,0)) = 0 THEN NULL
              ELSE r.points::numeric / (2 * (r.fga + 0.44 * r.fta))
            END AS ts_pct,

            -- Shot profile
            CASE WHEN COALESCE(r.fga,0) = 0 THEN NULL ELSE r.tpa::numeric / r.fga END AS tpar,  -- 3PA rate
            CASE WHEN COALESCE(r.fga,0) = 0 THEN NULL ELSE r.fta::numeric / r.fga END AS ftr,   -- FT rate

            -- Ball security / playmaking
            CASE WHEN COALESCE(r.turnovers,0) = 0 THEN NULL ELSE r.assists::numeric / r.turnovers END AS ast_to,

            -- “Stocks”
            (COALESCE(r.steals,0) + COALESCE(r.blocks,0)) AS stocks,

            -- Efficiency: points per “true shot attempt”
            CASE
              WHEN (COALESCE(r.fga,0) + 0.44 * COALESCE(r.fta,0)) = 0 THEN NULL
              ELSE r.points::numeric / (r.fga + 0.44 * r.fta)
            END AS pts_per_tsa,

            -- Per-36 (great for comparing minutes volatility)
            CASE WHEN COALESCE(r.minutes,0) = 0 THEN NULL ELSE r.points::numeric  * 36 / r.minutes END AS pts_per_36,
            CASE WHEN COALESCE(r.minutes,0) = 0 THEN NULL ELSE r.reb_total::numeric * 36 / r.minutes END AS reb_per_36,
            CASE WHEN COALESCE(r.minutes,0) = 0 THEN NULL ELSE r.assists::numeric * 36 / r.minutes END AS ast_per_36,

            r.season,
            r.rn
          FROM ranked r
          JOIN public.players p ON p.person_id = r.person_id
          LEFT JOIN public.teams t  ON t.team_id  = r.team_id
          LEFT JOIN public.teams ot ON ot.team_id = r.opponent_team_id
          WHERE r.rn <= 5;

    View: Player last 5 summary (aggregate)

            CREATE OR REPLACE VIEW public.v_player_last5_summary AS
        SELECT
          person_id,
          first_name,
          last_name,
          player_name,

          COUNT(*) AS games_in_window,

          -- Base averages
          AVG(minutes)    AS avg_min,
          AVG(points)     AS avg_pts,
          AVG(reb_total)  AS avg_reb,
          AVG(assists)    AS avg_ast,
          AVG(steals)     AS avg_stl,
          AVG(blocks)     AS avg_blk,
          AVG(turnovers)  AS avg_tov,

          -- Shooting volume averages
          AVG(fga) AS avg_fga,
          AVG(tpa) AS avg_tpa,
          AVG(fta) AS avg_fta,

          -- “True” rolling efficiencies computed from totals (better than averaging percents)
          CASE
            WHEN SUM(COALESCE(fga,0)) = 0 THEN NULL
            ELSE (SUM(fgm) + 0.5 * SUM(COALESCE(tpm,0)))::numeric / SUM(fga)
          END AS last5_efg_pct,

          CASE
            WHEN (SUM(COALESCE(fga,0)) + 0.44 * SUM(COALESCE(fta,0))) = 0 THEN NULL
            ELSE SUM(points)::numeric / (2 * (SUM(fga) + 0.44 * SUM(fta)))
          END AS last5_ts_pct,

          CASE
            WHEN SUM(COALESCE(fga,0)) = 0 THEN NULL
            ELSE SUM(tpa)::numeric / SUM(fga)
          END AS last5_tpar,

          CASE
            WHEN SUM(COALESCE(fga,0)) = 0 THEN NULL
            ELSE SUM(fta)::numeric / SUM(fga)
          END AS last5_ftr,

          CASE
            WHEN SUM(COALESCE(turnovers,0)) = 0 THEN NULL
            ELSE SUM(assists)::numeric / SUM(turnovers)
          END AS last5_ast_to,

          SUM(stocks) AS last5_stocks,

          -- Per-36 from totals (best practice)
          CASE WHEN SUM(COALESCE(minutes,0)) = 0 THEN NULL ELSE SUM(points)::numeric    * 36 / SUM(minutes) END AS last5_pts_per36,
          CASE WHEN SUM(COALESCE(minutes,0)) = 0 THEN NULL ELSE SUM(reb_total)::numeric * 36 / SUM(minutes) END AS last5_reb_per36,
          CASE WHEN SUM(COALESCE(minutes,0)) = 0 THEN NULL ELSE SUM(assists)::numeric  * 36 / SUM(minutes) END AS last5_ast_per36

        FROM public.v_player_last5_games
        GROUP BY person_id, first_name, last_name, player_name;

Query: Lebron last 5 gmes + summary row

         WITH lebron AS (
            SELECT *
            FROM public.v_player_last5_games
            WHERE first_name = 'lebron' AND last_name = 'James'
          ),
          summary AS (
            SELECT
              'LAST5_AVG'::text AS row_type,
              'LeBron James'::text AS player_name,
              NULL::timestamp AS game_datetime_est,
              NULL::text AS team_abbrev,
              NULL::text AS opponent_abbrev,
              NULL::boolean AS home,
              NULL::boolean AS win,

              AVG(minutes) AS minutes,
              AVG(points) AS points,
              AVG(assists) AS assists,
              AVG(reb_total) AS reb_total,

              CASE WHEN SUM(COALESCE(fga,0))=0 THEN NULL
                  ELSE (SUM(fgm)+0.5*SUM(COALESCE(tpm,0)))::numeric/SUM(fga) END AS efg_pct,
              CASE WHEN (SUM(COALESCE(fga,0))+0.44*SUM(COALESCE(fta,0)))=0 THEN NULL
                  ELSE SUM(points)::numeric/(2*(SUM(fga)+0.44*SUM(fta))) END AS ts_pct,
              CASE WHEN SUM(COALESCE(fga,0))=0 THEN NULL ELSE SUM(tpa)::numeric/SUM(fga) END AS tpar,
              CASE WHEN SUM(COALESCE(fga,0))=0 THEN NULL ELSE SUM(fta)::numeric/SUM(fga) END AS ftr,
              CASE WHEN SUM(COALESCE(turnovers,0))=0 THEN NULL ELSE SUM(assists)::numeric/SUM(turnovers) END AS ast_to,
              SUM(stocks) AS stocks,
              CASE WHEN (SUM(COALESCE(fga,0))+0.44*SUM(COALESCE(fta,0)))=0 THEN NULL
                  ELSE SUM(points)::numeric/(SUM(fga)+0.44*SUM(fta)) END AS pts_per_tsa,
              CASE WHEN SUM(COALESCE(minutes,0))=0 THEN NULL ELSE SUM(points)::numeric*36/SUM(minutes) END AS pts_per_36
            FROM lebron
          )
          SELECT *
          FROM (
            SELECT
              'GAME' AS row_type,
              player_name, game_datetime_est, team_abbrev, opponent_abbrev, home, win,
              minutes, points, assists, reb_total,
              efg_pct, ts_pct, tpar, ftr, ast_to, stocks, pts_per_tsa, pts_per_36
            FROM lebron

            UNION ALL

            SELECT
              row_type,
              player_name, game_datetime_est, team_abbrev, opponent_abbrev, home, win,
              minutes, points, assists, reb_total,
              efg_pct, ts_pct, tpar, ftr, ast_to, stocks, pts_per_tsa, pts_per_36
            FROM summary
          ) u
          ORDER BY
            CASE WHEN u.row_type = 'GAME' THEN 0 ELSE 1 END,
            u.game_datetime_est DESC NULLS LAST;


Function: public.get_player_last5(first_name, last_name)


          CREATE OR REPLACE FUNCTION public.get_player_last5(p_first_name text, p_last_name text)
          RETURNS TABLE (
            row_type text,
            player_name text,
            game_datetime_est timestamp,
            team_abbrev text,
            opponent_abbrev text,
            home boolean,
            win boolean,

            minutes numeric,
            points numeric,
            assists numeric,
            rebounds numeric,

            efg_pct numeric,
            ts_pct numeric,
            tpar numeric,
            ftr numeric,
            ast_to numeric,
            stocks integer,
            pts_per_tsa numeric,
            pts_per_36 numeric
          )
          LANGUAGE sql
          STABLE
          AS $$
          WITH g AS (
            SELECT *
            FROM public.v_player_last5_games
            WHERE first_name = p_first_name
              AND last_name  = p_last_name
            ORDER BY game_datetime_est DESC NULLS LAST
            LIMIT 5
          ),
          s AS (
            SELECT
              'LAST5_AVG'::text AS row_type,
              (MAX(player_name))::text AS player_name,
              NULL::timestamp AS game_datetime_est,
              NULL::text AS team_abbrev,
              NULL::text AS opponent_abbrev,
              NULL::boolean AS home,
              NULL::boolean AS win,

              AVG(minutes) AS minutes,
              AVG(points)::numeric AS points,
              AVG(assists)::numeric AS assists,
              AVG(reb_total)::numeric AS rebounds,

              -- totals-based eFG% and TS% over the 5 games (best practice)
              CASE WHEN SUM(COALESCE(fga,0)) = 0 THEN NULL
                  ELSE (SUM(fgm) + 0.5 * SUM(COALESCE(tpm,0)))::numeric / SUM(fga) END AS efg_pct,

              CASE WHEN (SUM(COALESCE(fga,0)) + 0.44 * SUM(COALESCE(fta,0))) = 0 THEN NULL
                  ELSE SUM(points)::numeric / (2 * (SUM(fga) + 0.44 * SUM(fta))) END AS ts_pct,

              CASE WHEN SUM(COALESCE(fga,0)) = 0 THEN NULL
                  ELSE SUM(tpa)::numeric / SUM(fga) END AS tpar,

              CASE WHEN SUM(COALESCE(fga,0)) = 0 THEN NULL
                  ELSE SUM(fta)::numeric / SUM(fga) END AS ftr,

              CASE WHEN SUM(COALESCE(turnovers,0)) = 0 THEN NULL
                  ELSE SUM(assists)::numeric / SUM(turnovers) END AS ast_to,

              SUM(stocks)::int AS stocks,

              CASE WHEN (SUM(COALESCE(fga,0)) + 0.44 * SUM(COALESCE(fta,0))) = 0 THEN NULL
                  ELSE SUM(points)::numeric / (SUM(fga) + 0.44 * SUM(fta)) END AS pts_per_tsa,

              CASE WHEN SUM(COALESCE(minutes,0)) = 0 THEN NULL
                  ELSE SUM(points)::numeric * 36 / SUM(minutes) END AS pts_per_36
            FROM g
          )
          SELECT *
          FROM (
            SELECT
              'GAME'::text AS row_type,
              player_name,
              game_datetime_est,
              team_abbrev,
              opponent_abbrev,
              home,
              win,

              minutes,
              points::numeric,
              assists::numeric,
              reb_total::numeric AS rebounds,

              efg_pct,
              ts_pct,
              tpar,
              ftr,
              ast_to,
              stocks,
              pts_per_tsa,
              pts_per_36
            FROM g

            UNION ALL

            SELECT
              row_type,
              player_name,
              game_datetime_est,
              team_abbrev,
              opponent_abbrev,
              home,
              win,

              minutes,
              points,
              assists,
              rebounds,

              efg_pct,
              ts_pct,
              tpar,
              ftr,
              ast_to,
              stocks,
              pts_per_tsa,
              pts_per_36
            FROM s
          ) u
          ORDER BY
            CASE WHEN u.row_type = 'GAME' THEN 0 ELSE 1 END,
            u.game_datetime_est DESC NULLS LAST;
          $$;

  USE IT FOR LEBRON: SELECT * FROM public.get_player_last5('LeBron', 'James');

--------
--
--
-- Replaced above function
--------

  Replace function: public.get_player_last5(first_name, last_name) with usage

            DROP FUNCTION IF EXISTS public.get_player_last5(text, text);

            CREATE OR REPLACE FUNCTION public.get_player_last5(p_first_name text, p_last_name text)
            RETURNS TABLE (
              row_type text,
              player_name text,
              game_datetime_est timestamp,
              team_abbrev text,
              opponent_abbrev text,
              home boolean,
              win boolean,

              minutes numeric,
              points numeric,
              assists numeric,
              rebounds numeric,

              efg_pct numeric,
              ts_pct numeric,
              tpar numeric,
              ftr numeric,
              ast_to numeric,
              stocks integer,
              pts_per_tsa numeric,
              pts_per_36 numeric,

              -- usage / niche rates
              usg_pct numeric,
              pct_ast numeric,
              pct_reb numeric,
              pct_tov numeric,
              pct_stl numeric,
              pct_blk numeric
            )
            LANGUAGE sql
            STABLE
            AS $$
            WITH g AS (
              SELECT
                v.*,
                u.usg_pct,
                u.pct_ast,
                u.pct_reb,
                u.pct_tov,
                u.pct_stl,
                u.pct_blk
              FROM public.v_player_last5_games v
              LEFT JOIN public.player_game_stats_usage u
                ON u.game_id = v.game_id
              AND u.person_id = v.person_id
              WHERE v.first_name = p_first_name
                AND v.last_name  = p_last_name
              ORDER BY v.game_datetime_est DESC NULLS LAST
              LIMIT 5
            ),
            s AS (
              SELECT
                'LAST5_AVG'::text AS row_type,
                (MAX(player_name))::text AS player_name,
                NULL::timestamp AS game_datetime_est,
                NULL::text AS team_abbrev,
                NULL::text AS opponent_abbrev,
                NULL::boolean AS home,
                NULL::boolean AS win,

                AVG(minutes) AS minutes,
                AVG(points)::numeric AS points,
                AVG(assists)::numeric AS assists,
                AVG(reb_total)::numeric AS rebounds,

                -- totals-based efficiencies (best practice)
                CASE WHEN SUM(COALESCE(fga,0)) = 0 THEN NULL
                    ELSE (SUM(fgm) + 0.5 * SUM(COALESCE(tpm,0)))::numeric / SUM(fga) END AS efg_pct,

                CASE WHEN (SUM(COALESCE(fga,0)) + 0.44 * SUM(COALESCE(fta,0))) = 0 THEN NULL
                    ELSE SUM(points)::numeric / (2 * (SUM(fga) + 0.44 * SUM(fta))) END AS ts_pct,

                CASE WHEN SUM(COALESCE(fga,0)) = 0 THEN NULL
                    ELSE SUM(tpa)::numeric / SUM(fga) END AS tpar,

                CASE WHEN SUM(COALESCE(fga,0)) = 0 THEN NULL
                    ELSE SUM(fta)::numeric / SUM(fga) END AS ftr,

                CASE WHEN SUM(COALESCE(turnovers,0)) = 0 THEN NULL
                    ELSE SUM(assists)::numeric / SUM(turnovers) END AS ast_to,

                SUM(stocks)::int AS stocks,

                CASE WHEN (SUM(COALESCE(fga,0)) + 0.44 * SUM(COALESCE(fta,0))) = 0 THEN NULL
                    ELSE SUM(points)::numeric / (SUM(fga) + 0.44 * SUM(fta)) END AS pts_per_tsa,

                CASE WHEN SUM(COALESCE(minutes,0)) = 0 THEN NULL
                    ELSE SUM(points)::numeric * 36 / SUM(minutes) END AS pts_per_36,

                -- minutes-weighted usage/pct stats (more stable than plain avg)
                CASE WHEN SUM(COALESCE(minutes,0)) = 0 THEN NULL
                    ELSE SUM(COALESCE(usg_pct,0) * minutes)::numeric / SUM(minutes) END AS usg_pct,

                CASE WHEN SUM(COALESCE(minutes,0)) = 0 THEN NULL
                    ELSE SUM(COALESCE(pct_ast,0) * minutes)::numeric / SUM(minutes) END AS pct_ast,

                CASE WHEN SUM(COALESCE(minutes,0)) = 0 THEN NULL
                    ELSE SUM(COALESCE(pct_reb,0) * minutes)::numeric / SUM(minutes) END AS pct_reb,

                CASE WHEN SUM(COALESCE(minutes,0)) = 0 THEN NULL
                    ELSE SUM(COALESCE(pct_tov,0) * minutes)::numeric / SUM(minutes) END AS pct_tov,

                CASE WHEN SUM(COALESCE(minutes,0)) = 0 THEN NULL
                    ELSE SUM(COALESCE(pct_stl,0) * minutes)::numeric / SUM(minutes) END AS pct_stl,

                CASE WHEN SUM(COALESCE(minutes,0)) = 0 THEN NULL
                    ELSE SUM(COALESCE(pct_blk,0) * minutes)::numeric / SUM(minutes) END AS pct_blk
              FROM g
            )
            SELECT *
            FROM (
              SELECT
                'GAME'::text AS row_type,
                player_name,
                game_datetime_est,
                team_abbrev,
                opponent_abbrev,
                home,
                win,

                minutes,
                points::numeric,
                assists::numeric,
                reb_total::numeric AS rebounds,

                efg_pct,
                ts_pct,
                tpar,
                ftr,
                ast_to,
                stocks,
                pts_per_tsa,
                pts_per_36,

                usg_pct,
                pct_ast,
                pct_reb,
                pct_tov,
                pct_stl,
                pct_blk
              FROM g

              UNION ALL

              SELECT
                row_type,
                player_name,
                game_datetime_est,
                team_abbrev,
                opponent_abbrev,
                home,
                win,

                minutes,
                points,
                assists,
                rebounds,

                efg_pct,
                ts_pct,
                tpar,
                ftr,
                ast_to,
                stocks,
                pts_per_tsa,
                pts_per_36,

                usg_pct,
                pct_ast,
                pct_reb,
                pct_tov,
                pct_stl,
                pct_blk
              FROM s
            ) u
            ORDER BY
              CASE WHEN u.row_type = 'GAME' THEN 0 ELSE 1 END,
              u.game_datetime_est DESC NULLS LAST;
            $$;

Example of use: SELECT * FROM public.get_player_last5('LeBron','James');

    Create get_player_lastN() (supports 5/10/20/etc.)

          DROP FUNCTION IF EXISTS public.get_player_lastN(text, text, integer);

          CREATE OR REPLACE FUNCTION public.get_player_lastN(
            p_first_name text,
            p_last_name text,
            p_n integer DEFAULT 10
          )
          RETURNS TABLE (
            row_type text,
            player_name text,
            game_datetime_est timestamp,
            team_abbrev text,
            opponent_abbrev text,
            home boolean,
            win boolean,

            minutes numeric,
            points integer,
            assists integer,
            rebounds integer,

            fga integer,
            fgm integer,
            tpa integer,
            tpm integer,
            fta integer,
            ftm integer,
            turnovers integer,

            efg_pct numeric,
            ts_pct numeric,
            tpar numeric,
            ftr numeric,
            ast_to numeric,
            stocks integer,
            pts_per_tsa numeric,
            pts_per_36 numeric,

            usg_pct numeric,
            pct_ast numeric,
            pct_reb numeric,
            pct_tov numeric,
            pct_stl numeric,
            pct_blk numeric
          )
          LANGUAGE sql
          STABLE
          AS $$
          WITH target AS (
            SELECT p.person_id, (p.first_name || ' ' || p.last_name) AS player_name
            FROM public.players p
            WHERE p.first_name = p_first_name
              AND p.last_name  = p_last_name
            ORDER BY p.person_id
            LIMIT 1
          ),
          g AS (
            SELECT
              pg.game_id,
              pg.person_id,
              t.player_name,
              pg.game_datetime_est,
              tm.team_abbrev,
              ot.team_abbrev AS opponent_abbrev,
              pg.home,
              pg.win,
              pg.minutes,
              pg.points,
              pg.assists,
              pg.reb_total AS rebounds,
              pg.fga, pg.fgm, pg.tpa, pg.tpm, pg.fta, pg.ftm,
              pg.turnovers,
              pg.steals,
              pg.blocks,

              -- usage table
              u.usg_pct,
              u.pct_ast,
              u.pct_reb,
              u.pct_tov,
              u.pct_stl,
              u.pct_blk,

              -- niche metrics
              CASE
                WHEN pg.fga IS NULL OR pg.fga = 0 THEN NULL
                ELSE (pg.fgm + 0.5 * COALESCE(pg.tpm,0))::numeric / pg.fga
              END AS efg_pct,

              CASE
                WHEN (COALESCE(pg.fga,0) + 0.44 * COALESCE(pg.fta,0)) = 0 THEN NULL
                ELSE pg.points::numeric / (2 * (pg.fga + 0.44 * pg.fta))
              END AS ts_pct,

              CASE WHEN pg.fga IS NULL OR pg.fga = 0 THEN NULL
                  ELSE pg.tpa::numeric / pg.fga END AS tpar,

              CASE WHEN pg.fga IS NULL OR pg.fga = 0 THEN NULL
                  ELSE pg.fta::numeric / pg.fga END AS ftr,

              CASE WHEN COALESCE(pg.turnovers,0) = 0 THEN NULL
                  ELSE pg.assists::numeric / pg.turnovers END AS ast_to,

              (COALESCE(pg.steals,0) + COALESCE(pg.blocks,0))::int AS stocks,

              CASE
                WHEN (COALESCE(pg.fga,0) + 0.44 * COALESCE(pg.fta,0)) = 0 THEN NULL
                ELSE pg.points::numeric / (pg.fga + 0.44 * pg.fta)
              END AS pts_per_tsa,

              CASE
                WHEN COALESCE(pg.minutes,0) = 0 THEN NULL
                ELSE pg.points::numeric * 36 / pg.minutes
              END AS pts_per_36
            FROM public.player_game_stats pg
            JOIN target t ON t.person_id = pg.person_id
            JOIN public.teams tm ON tm.team_id = pg.team_id
            JOIN public.teams ot ON ot.team_id = pg.opponent_team_id
            LEFT JOIN public.player_game_stats_usage u
              ON u.game_id = pg.game_id
            AND u.person_id = pg.person_id
            WHERE pg.game_datetime_est IS NOT NULL
            ORDER BY pg.game_datetime_est DESC
            LIMIT GREATEST(1, LEAST(p_n, 100))
          ),
          s AS (
            SELECT
              ('LAST' || COUNT(*)::text || '_AVG')::text AS row_type,
              MAX(player_name)::text AS player_name,
              NULL::timestamp AS game_datetime_est,
              NULL::text AS team_abbrev,
              NULL::text AS opponent_abbrev,
              NULL::boolean AS home,
              NULL::boolean AS win,

              AVG(minutes) AS minutes,
              AVG(points)::int AS points,
              AVG(assists)::int AS assists,
              AVG(rebounds)::int AS rebounds,

              AVG(fga)::int AS fga,
              AVG(fgm)::int AS fgm,
              AVG(tpa)::int AS tpa,
              AVG(tpm)::int AS tpm,
              AVG(fta)::int AS fta,
              AVG(ftm)::int AS ftm,
              AVG(turnovers)::int AS turnovers,

              -- totals-based efficiencies for the summary row
              CASE WHEN SUM(COALESCE(fga,0)) = 0 THEN NULL
                  ELSE (SUM(fgm) + 0.5 * SUM(COALESCE(tpm,0)))::numeric / SUM(fga) END AS efg_pct,

              CASE WHEN (SUM(COALESCE(fga,0)) + 0.44 * SUM(COALESCE(fta,0))) = 0 THEN NULL
                  ELSE SUM(points)::numeric / (2 * (SUM(fga) + 0.44 * SUM(fta))) END AS ts_pct,

              CASE WHEN SUM(COALESCE(fga,0)) = 0 THEN NULL
                  ELSE SUM(tpa)::numeric / SUM(fga) END AS tpar,

              CASE WHEN SUM(COALESCE(fga,0)) = 0 THEN NULL
                  ELSE SUM(fta)::numeric / SUM(fga) END AS ftr,

              CASE WHEN SUM(COALESCE(turnovers,0)) = 0 THEN NULL
                  ELSE SUM(assists)::numeric / SUM(turnovers) END AS ast_to,

              SUM(stocks)::int AS stocks,

              CASE WHEN (SUM(COALESCE(fga,0)) + 0.44 * SUM(COALESCE(fta,0))) = 0 THEN NULL
                  ELSE SUM(points)::numeric / (SUM(fga) + 0.44 * SUM(fta)) END AS pts_per_tsa,

              CASE WHEN SUM(COALESCE(minutes,0)) = 0 THEN NULL
                  ELSE SUM(points)::numeric * 36 / SUM(minutes) END AS pts_per_36,

              -- minutes-weighted usage rates
              CASE WHEN SUM(COALESCE(minutes,0)) = 0 THEN NULL
                  ELSE SUM(COALESCE(usg_pct,0) * minutes)::numeric / SUM(minutes) END AS usg_pct,

              CASE WHEN SUM(COALESCE(minutes,0)) = 0 THEN NULL
                  ELSE SUM(COALESCE(pct_ast,0) * minutes)::numeric / SUM(minutes) END AS pct_ast,

              CASE WHEN SUM(COALESCE(minutes,0)) = 0 THEN NULL
                  ELSE SUM(COALESCE(pct_reb,0) * minutes)::numeric / SUM(minutes) END AS pct_reb,

              CASE WHEN SUM(COALESCE(minutes,0)) = 0 THEN NULL
                  ELSE SUM(COALESCE(pct_tov,0) * minutes)::numeric / SUM(minutes) END AS pct_tov,

              CASE WHEN SUM(COALESCE(minutes,0)) = 0 THEN NULL
                  ELSE SUM(COALESCE(pct_stl,0) * minutes)::numeric / SUM(minutes) END AS pct_stl,

              CASE WHEN SUM(COALESCE(minutes,0)) = 0 THEN NULL
                  ELSE SUM(COALESCE(pct_blk,0) * minutes)::numeric / SUM(minutes) END AS pct_blk
            FROM g
          )
          SELECT
            row_type, player_name, game_datetime_est, team_abbrev, opponent_abbrev, home, win,
            minutes, points, assists, rebounds,
            fga, fgm, tpa, tpm, fta, ftm, turnovers,
            efg_pct, ts_pct, tpar, ftr, ast_to, stocks, pts_per_tsa, pts_per_36,
            usg_pct, pct_ast, pct_reb, pct_tov, pct_stl, pct_blk
          FROM (
            SELECT
              0 AS sort_bucket,
              'GAME'::text AS row_type,
              player_name, game_datetime_est, team_abbrev, opponent_abbrev, home, win,
              minutes, points, assists, rebounds,
              fga, fgm, tpa, tpm, fta, ftm, turnovers,
              efg_pct, ts_pct, tpar, ftr, ast_to, stocks, pts_per_tsa, pts_per_36,
              usg_pct, pct_ast, pct_reb, pct_tov, pct_stl, pct_blk
            FROM g

            UNION ALL

            SELECT
              1 AS sort_bucket,
              row_type, player_name, game_datetime_est, team_abbrev, opponent_abbrev, home, win,
              minutes, points, assists, rebounds,
              fga, fgm, tpa, tpm, fta, ftm, turnovers,
              efg_pct, ts_pct, tpar, ftr, ast_to, stocks, pts_per_tsa, pts_per_36,
              usg_pct, pct_ast, pct_reb, pct_tov, pct_stl, pct_blk
            FROM s
          ) x
          ORDER BY x.sort_bucket, x.game_datetime_est DESC NULLS LAST;
          $$;

Example of use:
          SELECT * FROM public.get_player_lastN('LeBron','James',10);
          SELECT * FROM public.get_player_lastN('LeBron','James',20);


top 10 players by last-5 points (with usage)

            WITH last5 AS (
              SELECT
                v.person_id,
                MAX(v.player_name) AS player_name,
                AVG(v.points) AS avg_pts,
                AVG(v.assists) AS avg_ast,
                AVG(v.reb_total) AS avg_reb,
                AVG(u.usg_pct) AS avg_usg
              FROM public.v_player_last5_games v
              LEFT JOIN public.player_game_stats_usage u
                ON u.game_id = v.game_id
              AND u.person_id = v.person_id
              GROUP BY v.person_id
            )
            SELECT *
            FROM last5
            ORDER BY avg_pts DESC NULLS LAST
            LIMIT 10;

            
Fix A (quick): filter to current season / recent window in your query

Since your DB clearly has current data (3089 rows since 2025-10-01), just add a cutoff:

                                      WITH last5 AS (
                                        SELECT
                                          v.person_id,
                                          MAX(v.player_name) AS player_name,
                                          AVG(v.points) AS avg_pts,
                                          AVG(v.assists) AS avg_ast,
                                          AVG(v.reb_total) AS avg_reb,
                                          AVG(u.usg_pct) AS avg_usg
                                        FROM public.v_player_last5_games v
                                        LEFT JOIN public.player_game_stats_usage u
                                          ON u.game_id = v.game_id
                                        AND u.person_id = v.person_id
                                        WHERE v.game_datetime_est >= '2025-10-01'::timestamp
                                        GROUP BY v.person_id
                                      )
                                      SELECT *
                                      FROM last5
                                      ORDER BY avg_pts DESC NULLS LAST
                                      LIMIT 10;

                                      WITH matches AS (

-- TESTED SINCE 12/27/2026

  ------------
  --
  -- SEARCH PLAYER POINTS IN LAST 5 GAMES VIEW
  --  
  -------------
  USER PLAYER INPUT (SEARCHES FOR "use player" IN LAST 5 GAMES VIEW)
  replace :search with actual input in production code

                                   WITH matches AS (
                                    SELECT
                                      v.person_id,
                                      MAX(v.player_name) AS player_name,
                                      COUNT(*) AS games_in_view
                                    FROM analytics.v_player_last5_games_current v
                                    WHERE REPLACE(LOWER(v.player_name), ' ', '') LIKE
                                          '%' || REPLACE(LOWER(:search), ' ', '') || '%'
                                    GROUP BY v.person_id
                                  ),
                                  picked AS (
                                    SELECT person_id, player_name
                                    FROM matches
                                    ORDER BY games_in_view DESC, player_name
                                    LIMIT 1
                                  )
                                  SELECT
                                    v.player_name,
                                    v.game_datetime_est,
                                    CASE
                                      WHEN v.home THEN 'vs ' || v.opponent_abbrev
                                      ELSE '@ ' || v.opponent_abbrev
                                    END AS matchup,
                                    v.points
                                  FROM analytics.v_player_last5_games_current v
                                  JOIN picked p
                                    ON p.person_id = v.person_id
                                  ORDER BY v.game_datetime_est DESC
                                  LIMIT 5;

  USER PLAYER INPUT (SEARCHES FOR "use player" IN LAST game_count GAMES VIEW)
  replace :search with actual input in production code
  pass :game_count as parameter for number of games to return

                                 WITH matches AS (
                                  SELECT
                                    p.person_id,
                                    MAX(p.first_name || ' ' || p.last_name) AS player_name
                                  FROM public.players p
                                  WHERE REPLACE(LOWER(p.first_name || p.last_name), ' ', '')
                                        LIKE '%' || REPLACE(LOWER(:search), ' ', '') || '%'
                                  GROUP BY p.person_id
                                ),
                                picked AS (
                                  SELECT person_id, player_name
                                  FROM matches
                                  ORDER BY player_name
                                  LIMIT 1
                                )
                                SELECT
                                  p.player_name,
                                  g.game_datetime_est,
                                  CASE
                                    WHEN g.home THEN 'vs ' || g.opponent_abbrev
                                    ELSE '@ ' || g.opponent_abbrev
                                  END AS matchup,
                                  g.points
                                FROM public.player_game_stats g
                                JOIN picked p
                                  ON p.person_id = g.person_id
                                ORDER BY g.game_datetime_est DESC
                                LIMIT :game_count;

 
USER PLAYER INPUT (SEARCHES FOR "use player" IN LAST SEASON GAMES VIEW)
  replace :search with actual input in production code

                                  WITH matches AS (
                                    SELECT
                                      p.person_id,
                                      MAX(p.first_name || ' ' || p.last_name) AS player_name,
                                      COUNT(*) AS games_in_view
                                    FROM public.players p
                                    JOIN public.player_game_stats g
                                      ON g.person_id = p.person_id
                                    WHERE REPLACE(LOWER(p.first_name || p.last_name), ' ', '')
                                          LIKE '%' || REPLACE(LOWER(:search), ' ', '') || '%'
                                      AND g.game_datetime_est >= '2025-10-01'::timestamp
                                    GROUP BY p.person_id
                                  ),
                                  picked AS (
                                    SELECT person_id, player_name
                                    FROM matches
                                    ORDER BY games_in_view DESC, player_name
                                    LIMIT 1
                                  )
                                  SELECT
                                    p.player_name,
                                    g.game_datetime_est,
                                    CASE
                                      WHEN g.home THEN 'vs ' || g.opponentteamabbrev
                                      ELSE '@ ' || g.opponentteamabbrev
                                    END AS matchup,
                                    g.points
                                  FROM public.player_game_stats g
                                  JOIN picked p
                                    ON p.person_id = g.person_id
                                  WHERE g.game_datetime_est >= '2025-10-01'::timestamp
                                  ORDER BY g.game_datetime_est DESC;