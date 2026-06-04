// player.controller.js

export async function searchCurrentPlayers(pool, search) {
  const sql = `
    WITH current_window AS (
      SELECT MAX(game_datetime_est) - INTERVAL '180 days' AS start_date
      FROM public.player_game_stats
    ),
    player_teams AS (
      SELECT DISTINCT ON (person_id)
        person_id,
        team_id
      FROM public.player_game_stats
      WHERE team_id IS NOT NULL
      ORDER BY person_id, game_datetime_est DESC
    ),
    next_games AS (
      SELECT DISTINCT ON (pt.person_id)
        pt.person_id,
        CASE
          WHEN s.home_team_id = pt.team_id THEN away_t.team_name
          ELSE home_t.team_name
        END AS opponent_abbr
      FROM player_teams pt
      JOIN public.league_schedule_2025_26 s
        ON pt.team_id IN (s.home_team_id, s.away_team_id)
      JOIN public.teams home_t ON home_t.team_id = s.home_team_id
      JOIN public.teams away_t ON away_t.team_id = s.away_team_id
      WHERE s.game_datetime_est >= NOW()
      ORDER BY pt.person_id, s.game_datetime_est ASC
    )
    SELECT
      p.person_id,
      p.first_name || ' ' || p.last_name AS player_name,
      COUNT(DISTINCT g.game_id) AS games_in_db,
      MAX(g.game_datetime_est) AS latest_game,
      ng.opponent_abbr,
      ROUND(AVG(CASE
        WHEN g.game_datetime_est >= '2025-10-01'
          AND g.game_type IN ('Regular Season', 'Playoffs', 'Play-in Tournament', 'Emirates NBA Cup')
        THEN g.points END)::numeric, 1) AS h2h_pts,
      ROUND(AVG(CASE
        WHEN g.game_datetime_est >= '2025-10-01'
          AND g.game_type IN ('Regular Season', 'Playoffs', 'Play-in Tournament', 'Emirates NBA Cup')
        THEN g.reb_total END)::numeric, 1) AS h2h_reb,
      ROUND(AVG(CASE
        WHEN g.game_datetime_est >= '2025-10-01'
          AND g.game_type IN ('Regular Season', 'Playoffs', 'Play-in Tournament', 'Emirates NBA Cup')
        THEN g.assists END)::numeric, 1) AS h2h_ast,
      ROUND(AVG(CASE
        WHEN g.game_datetime_est >= '2025-10-01'
          AND g.game_type IN ('Regular Season', 'Playoffs', 'Play-in Tournament', 'Emirates NBA Cup')
        THEN g.blocks END)::numeric, 1) AS h2h_blk
    FROM public.players p
    JOIN public.player_game_stats g ON g.person_id = p.person_id
    CROSS JOIN current_window cw
    LEFT JOIN next_games ng ON ng.person_id = p.person_id
    WHERE g.game_datetime_est >= cw.start_date
      AND REPLACE(LOWER(p.first_name || ' ' || p.last_name), ' ', '')
          LIKE '%' || REPLACE(LOWER($1), ' ', '') || '%'
    GROUP BY p.person_id, p.first_name, p.last_name, ng.opponent_abbr
    ORDER BY games_in_db DESC, player_name ASC
    LIMIT 20;
  `;

  const result = await pool.query(sql, [search]);
  return result.rows;
}

export async function getPlayerGames(pool, playerId) {
  const sql = `
    SELECT
      g.game_id,
      g.game_datetime_est,
      g.game_type,
      g.comment,
      g.starting_position,
      p.first_name || ' ' || p.last_name AS player_name,
      g.points,
      g.assists,
      g.reb_total,
      g.blocks,
      g.steals,
      g.tpm AS fg3m,
      g.ftm,
      g.fta,
      g.home,
      g.minutes,
      g.opponent_team_id,
      opp.team_name AS opponent_abbr
    FROM public.player_game_stats g
    JOIN public.players p ON p.person_id = g.person_id
    LEFT JOIN public.teams opp ON opp.team_id = g.opponent_team_id
    WHERE g.person_id = $1
    ORDER BY g.game_datetime_est DESC
  `;
  const result = await pool.query(sql, [playerId]);
  return result.rows;
}

async function getOpponentDefStats(pool, opponentTeamId) {
  const sql = `
    WITH team_avgs AS (
      SELECT
        team_id,
        AVG(defrating) AS avg_def_rating,
        AVG(pace)      AS avg_pace
      FROM public.team_game_stats_advanced
      WHERE gametype = 'Regular Season'
        AND game_datetime_est >= NOW() - INTERVAL '60 days'
      GROUP BY team_id
    )
    SELECT
      t.avg_def_rating AS opponent_def_rating,
      t.avg_pace       AS opponent_pace,
      AVG(a.avg_def_rating) OVER () AS league_avg_def_rating,
      AVG(a.avg_pace)       OVER () AS league_avg_pace
    FROM team_avgs t
    CROSS JOIN team_avgs a
    WHERE t.team_id = $1
    LIMIT 1
  `;

  const result = await pool.query(sql, [opponentTeamId]);
  const row = result.rows[0];
  if (!row || row.opponent_def_rating === null) return null;

  return {
    defRating:          parseFloat(row.opponent_def_rating),
    pace:               parseFloat(row.opponent_pace),
    leagueAvgDefRating: parseFloat(row.league_avg_def_rating),
    leagueAvgPace:      parseFloat(row.league_avg_pace),
  };
}

async function getDefensiveRankings(pool) {
  const sql = `
    SELECT
      team_id,
      RANK() OVER (ORDER BY AVG(defrating) ASC) AS def_rank
    FROM public.team_game_stats_advanced
    WHERE gametype = 'Regular Season'
      AND game_datetime_est >= NOW() - INTERVAL '60 days'
    GROUP BY team_id
  `;
  const result = await pool.query(sql);
  return result.rows;
}

async function getOpponentDefByPosition(pool, opponentTeamId, playerId) {
  const sql = `
    WITH player_position AS (
      SELECT is_guard, is_forward, is_center
      FROM public.players
      WHERE person_id = $2
    ),
    same_position_players AS (
      SELECT p.person_id
      FROM public.players p
      CROSS JOIN player_position pp
      WHERE (
        (pp.is_guard   = true AND p.is_guard   = true) OR
        (pp.is_forward = true AND p.is_forward = true) OR
        (pp.is_center  = true AND p.is_center  = true)
      )
      AND p.person_id != $2
    ),
    vs_opponent AS (
      SELECT
        ROUND(AVG(g.points)::numeric, 2)    AS avg_pts_allowed,
        ROUND(AVG(g.reb_total)::numeric, 2) AS avg_reb_allowed,
        ROUND(AVG(g.assists)::numeric, 2)   AS avg_ast_allowed,
        ROUND(AVG(g.blocks)::numeric, 2)    AS avg_blk_allowed,
        ROUND(AVG(g.steals)::numeric, 2)    AS avg_stl_allowed,
        ROUND(AVG(g.tpm)::numeric, 2)       AS avg_3pm_allowed,
        ROUND(AVG(g.ftm)::numeric, 2)       AS avg_ftm_allowed,
        COUNT(*)                            AS sample_size
      FROM public.player_game_stats g
      JOIN same_position_players sp ON sp.person_id = g.person_id
      WHERE g.opponent_team_id = $1
        AND g.game_datetime_est >= '2025-10-01'
        AND g.game_type IN ('Regular Season', 'Playoffs', 'Play-in Tournament')
        AND g.minutes >= 10
        AND (g.comment IS NULL OR g.comment = '')
    ),
    league_avg AS (
      SELECT
        ROUND(AVG(g.points)::numeric, 2)    AS avg_pts,
        ROUND(AVG(g.reb_total)::numeric, 2) AS avg_reb,
        ROUND(AVG(g.assists)::numeric, 2)   AS avg_ast,
        ROUND(AVG(g.blocks)::numeric, 2)    AS avg_blk,
        ROUND(AVG(g.steals)::numeric, 2)    AS avg_stl,
        ROUND(AVG(g.tpm)::numeric, 2)       AS avg_3pm,
        ROUND(AVG(g.ftm)::numeric, 2)       AS avg_ftm
      FROM public.player_game_stats g
      JOIN same_position_players sp ON sp.person_id = g.person_id
      WHERE g.game_datetime_est >= '2025-10-01'
        AND g.game_type IN ('Regular Season', 'Playoffs', 'Play-in Tournament')
        AND g.minutes >= 10
        AND (g.comment IS NULL OR g.comment = '')
    )
    SELECT
      vo.avg_pts_allowed, vo.avg_reb_allowed, vo.avg_ast_allowed,
      vo.avg_blk_allowed, vo.avg_stl_allowed, vo.avg_3pm_allowed,
      vo.avg_ftm_allowed, vo.sample_size,
      la.avg_pts AS league_avg_pts, la.avg_reb AS league_avg_reb,
      la.avg_ast AS league_avg_ast, la.avg_blk AS league_avg_blk,
      la.avg_stl AS league_avg_stl, la.avg_3pm AS league_avg_3pm,
      la.avg_ftm AS league_avg_ftm
    FROM vs_opponent vo
    CROSS JOIN league_avg la
  `;

  try {
    const result = await pool.query(sql, [opponentTeamId, playerId]);
    return result.rows[0] || null;
  } catch (err) {
    console.error('getOpponentDefByPosition error:', err);
    return null;
  }
}

export async function getPlayerGameContext(pool, playerId) {
  const sql = `
    WITH player_current_team AS (
      SELECT pgs.team_id
      FROM public.player_game_stats pgs
      WHERE pgs.person_id = $1
        AND pgs.team_id IS NOT NULL
      ORDER BY pgs.game_datetime_est DESC
      LIMIT 1
    ),
    last_game AS (
      SELECT game_datetime_est
      FROM public.player_game_stats
      WHERE person_id = $1
        AND (comment IS NULL OR comment = '')
      ORDER BY game_datetime_est DESC
      LIMIT 1
    )
    SELECT
      s.game_id,
      s.game_datetime_est,
      CASE WHEN s.home_team_id = pct.team_id THEN true ELSE false END AS is_home,
      CASE
        WHEN s.home_team_id = pct.team_id THEN away_team.team_name
        ELSE home_team.team_name
      END AS opponent_abbr,
      CASE
        WHEN s.home_team_id = pct.team_id THEN away_team.team_city || ' ' || away_team.team_name
        ELSE home_team.team_city || ' ' || home_team.team_name
      END AS opponent_full_name,
      CASE
        WHEN s.home_team_id = pct.team_id THEN s.away_team_id
        ELSE s.home_team_id
      END AS opponent_team_id,
      own_team.team_city || ' ' || own_team.team_name AS own_team_abbrev,
      CASE
        WHEN EXTRACT(EPOCH FROM (s.game_datetime_est - lg.game_datetime_est)) / 86400 <= 1.5
        THEN true ELSE false
      END AS is_back_to_back
    FROM player_current_team pct
    CROSS JOIN last_game lg
    JOIN public.league_schedule_2025_26 s
      ON pct.team_id IN (s.home_team_id, s.away_team_id)
    JOIN public.teams home_team ON home_team.team_id = s.home_team_id
    JOIN public.teams away_team ON away_team.team_id = s.away_team_id
    JOIN public.teams own_team ON own_team.team_id = pct.team_id
    WHERE s.game_datetime_est >= NOW() - INTERVAL '12 hours'
      AND s.game_datetime_est <= NOW() + INTERVAL '3 days'
    ORDER BY s.game_datetime_est
    LIMIT 1
  `;

  try {
    const result = await pool.query(sql, [playerId]);
    const gameContext = result.rows[0] || null;
    if (!gameContext) return null;

    const [defStats, defRankings, positionDef] = await Promise.all([
      getOpponentDefStats(pool, gameContext.opponent_team_id),
      getDefensiveRankings(pool),
      getOpponentDefByPosition(pool, gameContext.opponent_team_id, playerId),
    ]);

    const rankRow = defRankings.find(
      (r) => String(r.team_id) === String(gameContext.opponent_team_id)
    );

    gameContext.opponentContext = {
      defRating:          defStats?.defRating          ?? undefined,
      pace:               defStats?.pace               ?? undefined,
      leagueAvgDefRating: defStats?.leagueAvgDefRating ?? undefined,
      leagueAvgPace:      defStats?.leagueAvgPace      ?? undefined,
      positionRank:       rankRow ? parseInt(rankRow.def_rank) : undefined,
      positionDef: positionDef ? {
        avgPtsAllowed: parseFloat(positionDef.avg_pts_allowed),
        avgRebAllowed: parseFloat(positionDef.avg_reb_allowed),
        avgAstAllowed: parseFloat(positionDef.avg_ast_allowed),
        avgBlkAllowed: parseFloat(positionDef.avg_blk_allowed),
        avgStlAllowed: parseFloat(positionDef.avg_stl_allowed),
        avg3pmAllowed: parseFloat(positionDef.avg_3pm_allowed),
        avgFtmAllowed: parseFloat(positionDef.avg_ftm_allowed),
        sampleSize:    parseInt(positionDef.sample_size),
        leagueAvgPts:  parseFloat(positionDef.league_avg_pts),
        leagueAvgReb:  parseFloat(positionDef.league_avg_reb),
        leagueAvgAst:  parseFloat(positionDef.league_avg_ast),
        leagueAvgBlk:  parseFloat(positionDef.league_avg_blk),
        leagueAvgStl:  parseFloat(positionDef.league_avg_stl),
        leagueAvg3pm:  parseFloat(positionDef.league_avg_3pm),
        leagueAvgFtm:  parseFloat(positionDef.league_avg_ftm),
      } : undefined,
    };

    return gameContext;
  } catch (err) {
    console.error('getPlayerGameContext SQL error:', err);
    return null;
  }
}

export async function getGamesByDate(pool, date) {
  const sql = `
    SELECT
      s.game_id,
      s.game_datetime_est,
      home_team.team_id   AS home_team_id,
      home_team.team_city || ' ' || home_team.team_name AS home_team_name,
      COALESCE(home_team.team_abbrev, home_team.team_name) AS home_team_abbrev,
      away_team.team_id   AS away_team_id,
      away_team.team_city || ' ' || away_team.team_name AS away_team_name,
      COALESCE(away_team.team_abbrev, away_team.team_name) AS away_team_abbrev
    FROM public.league_schedule_2025_26 s
    JOIN public.teams home_team ON home_team.team_id = s.home_team_id
    JOIN public.teams away_team ON away_team.team_id = s.away_team_id
    WHERE s.game_datetime_est::date = $1::date
    ORDER BY s.game_datetime_est ASC
  `;

  const result = await pool.query(sql, [date]);
  return result.rows;
}

export async function getPlayersByTeam(pool, teamId) {
  const sql = `
    WITH current_season AS (
      SELECT person_id
      FROM public.player_game_stats
      WHERE team_id = $1
        AND game_datetime_est >= '2025-10-01'
      GROUP BY person_id
    )
    SELECT
      p.person_id,
      p.first_name || ' ' || p.last_name AS player_name,
      ROUND(AVG(g.points)::numeric, 1)    AS avg_pts,
      ROUND(AVG(g.reb_total)::numeric, 1) AS avg_reb,
      ROUND(AVG(g.assists)::numeric, 1)   AS avg_ast,
      ROUND(AVG(g.minutes)::numeric, 1)   AS avg_min
    FROM current_season cs
    JOIN public.players p ON p.person_id = cs.person_id
    JOIN public.player_game_stats g ON g.person_id = cs.person_id
      AND g.game_datetime_est >= '2025-10-01'
    GROUP BY p.person_id, p.first_name, p.last_name
    ORDER BY avg_pts DESC
  `;

  const result = await pool.query(sql, [teamId]);
  return result.rows;
}

export async function getPlayerTeammates(pool, playerId) {
  const sql = `
    WITH player_games AS (
      SELECT team_id, game_id
      FROM public.player_game_stats
      WHERE person_id = $1
        AND game_datetime_est >= '2025-10-01'
    )
    SELECT
      p.person_id,
      p.first_name || ' ' || p.last_name AS player_name,
      COUNT(*) AS games_together
    FROM player_games pg
    JOIN public.player_game_stats pgs
      ON pgs.team_id = pg.team_id
      AND pgs.game_id = pg.game_id
      AND pgs.person_id != $1
      AND pgs.minutes >= 10
    JOIN public.players p ON p.person_id = pgs.person_id
    GROUP BY p.person_id, p.first_name, p.last_name
    HAVING COUNT(*) >= 5
    ORDER BY games_together DESC
    LIMIT 20
  `;

  const result = await pool.query(sql, [playerId]);
  return result.rows;
}

export async function getGameLogsWithTeammate(pool, playerId, teammateId) {
  const sql = `
    WITH player_games AS (
      SELECT game_id, game_datetime_est, team_id
      FROM public.player_game_stats
      WHERE person_id = $1
        AND game_datetime_est >= '2025-10-01'
    ),
    teammate_games AS (
      SELECT game_id
      FROM public.player_game_stats
      WHERE person_id = $2
        AND minutes >= 10
    )
    SELECT
      pg.game_id,
      CASE WHEN tg.game_id IS NOT NULL THEN true ELSE false END AS teammate_active
    FROM player_games pg
    LEFT JOIN teammate_games tg ON tg.game_id = pg.game_id
  `;

  const result = await pool.query(sql, [playerId, teammateId]);
  return result.rows;
}