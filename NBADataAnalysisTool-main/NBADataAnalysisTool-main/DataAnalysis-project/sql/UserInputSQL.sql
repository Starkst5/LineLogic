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
                                        AND g.game_datetime_est >= :season_start::timestamp
                                    GROUP BY p.person_id
                                    ),
                                    picked AS (
                                    SELECT person_id, player_name
                                    FROM matches
                                    ORDER BY games_in_view DESC, player_name
                                    LIMIT 1
                                    )
                                    SELECT
                                    pk.player_name,
                                    g.game_datetime_est,
                                    CASE
                                        WHEN g.home THEN 'vs ' || opp.team_abbrev
                                        ELSE '@ ' || opp.team_abbrev
                                    END AS matchup,
                                    g.points
                                    FROM public.player_game_stats g
                                    JOIN picked pk
                                    ON pk.person_id = g.person_id
                                    JOIN public.teams opp
                                    ON opp.team_id = g.opponent_team_id
                                    WHERE g.game_datetime_est >= :season_start::timestamp
                                    ORDER BY g.game_datetime_est DESC;
-------------
-- Player search + home/away filter + number of games
--- :search = user input for player name search
--- :location = both (default) / home / away
--- :n_games = how many games to return (default maybe 10 or 20)

                                WITH picked AS (
                                    SELECT
                                        p.person_id,
                                        MAX(p.first_name || ' ' || p.last_name) AS player_name
                                    FROM public.players p
                                    WHERE REPLACE(LOWER(p.first_name || p.last_name), ' ', '')
                                            LIKE '%' || REPLACE(LOWER(:search), ' ', '') || '%'
                                    GROUP BY p.person_id
                                    LIMIT 1
                                    )
                                    SELECT
                                    pk.player_name,
                                    g.game_datetime_est,
                                    CASE
                                        WHEN g.home THEN 'vs ' || opp.team_abbrev
                                        ELSE '@ ' || opp.team_abbrev
                                    END AS matchup,
                                    g.points
                                    FROM public.player_game_stats g
                                    JOIN picked pk
                                    ON pk.person_id = g.person_id
                                    JOIN public.teams opp
                                    ON opp.team_id = g.opponent_team_id
                                    WHERE
                                    (
                                        COALESCE(NULLIF(LOWER(:location), ''), 'both') = 'both'
                                        OR (LOWER(:location) = 'home' AND g.home = TRUE)
                                        OR (LOWER(:location) = 'away' AND g.home = FALSE)
                                    )
                                    ORDER BY g.game_datetime_est DESC
                                    LIMIT :n_games;

                                     