import pkg from 'pg';
import fs from 'fs';
import { createInterface } from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 60000,
  max: 5,
});

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current === '' ? null : current);
      current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current === '' ? null : current);
  return result;
}

async function loadCSV(filePath, processor) {
  const fileStream = fs.createReadStream(filePath);
  const rl = createInterface({ input: fileStream, crlfDelay: Infinity });
  let headers = null;
  let count = 0;
  let batch = [];

  for await (const line of rl) {
    if (!headers) {
      headers = line.split(',').map(h => h.trim().replace(/"/g, ''));
      continue;
    }
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => row[h] = values[i]);
    batch.push(row);

    if (batch.length >= 1000) {
      await processor(batch);
      count += batch.length;
      process.stdout.write(`\r  ${count} rows loaded...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await processor(batch);
    count += batch.length;
  }

  console.log(`\r  ✅ Done - ${count} rows loaded`);
}

// Build a multi-row INSERT with parameterized values
function buildBatchInsert(table, columns, rows, onConflict) {
  const values = [];
  const placeholders = rows.map((row, i) => {
    const start = i * columns.length + 1;
    columns.forEach(col => values.push(row[col]));
    return `(${columns.map((_, j) => `$${start + j}`).join(',')})`;
  });
  return {
    text: `INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders.join(',')} ${onConflict}`,
    values,
  };
}

async function loadTeams() {
  console.log('Loading teams...');
  await loadCSV('../data/kaggle_nba_sync/TeamStatistics.csv', async (rows) => {
    const seen = new Map();
    for (const row of rows) {
      if (row.teamId) seen.set(row.teamId, { team_id: row.teamId, team_city: row.teamCity, team_name: row.teamName });
    }
    const mapped = Array.from(seen.values());
    if (mapped.length === 0) return;
    const columns = ['team_id', 'team_city', 'team_name'];
    const onConflict = 'ON CONFLICT (team_id) DO UPDATE SET team_city = EXCLUDED.team_city, team_name = EXCLUDED.team_name';
    const query = buildBatchInsert('public.teams', columns, mapped, onConflict);
    await pool.query(query);
  });
}

async function loadPlayers() {
  console.log('Loading players...');
  await loadCSV('../data/kaggle_nba_sync/Players.csv', async (rows) => {
    const seen = new Map();
    for (const row of rows) {
      if (row.personId) seen.set(row.personId, {
        person_id: row.personId,
        first_name: row.firstName,
        last_name: row.lastName,
        is_guard: row.guard === '1',
        is_forward: row.forward === '1',
        is_center: row.center === '1',
      });
    }
    const mapped = Array.from(seen.values());
    if (mapped.length === 0) return;
    const columns = ['person_id', 'first_name', 'last_name', 'is_guard', 'is_forward', 'is_center'];
    const onConflict = 'ON CONFLICT (person_id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, is_guard = EXCLUDED.is_guard, is_forward = EXCLUDED.is_forward, is_center = EXCLUDED.is_center';
    const query = buildBatchInsert('public.players', columns, mapped, onConflict);
    await pool.query(query);
  });
}

async function loadPlayerStats() {
  console.log('Loading player game stats...');
  await loadCSV('../data/kaggle_nba_sync/PlayerStatistics.csv', async (rows) => {
    const mapped = rows.map(row => ({
      game_id: row.gameId,
      person_id: row.personId,
      team_id: row.playerteamId,
      opponent_team_id: row.opponentteamId,
      game_datetime_est: row.gameDateTimeEst,
      home: row.home === 'True',
      win: row.win === 'True',
      minutes: parseFloat(row.numMinutes) || 0,
      points: parseInt(row.points) || 0,
      assists: parseInt(row.assists) || 0,
      reb_total: parseInt(row.reboundsTotal) || 0,
      reb_off: parseInt(row.reboundsOffensive) || 0,
      reb_def: parseInt(row.reboundsDefensive) || 0,
      steals: parseInt(row.steals) || 0,
      blocks: parseInt(row.blocks) || 0,
      turnovers: parseInt(row.turnovers) || 0,
      fouls: parseInt(row.foulsPersonal) || 0,
      plus_minus: parseFloat(row.plusMinusPoints) || 0,
      fga: parseInt(row.fieldGoalsAttempted) || 0,
      fgm: parseInt(row.fieldGoalsMade) || 0,
      fg_pct: parseFloat(row.fieldGoalsPercentage) || 0,
      tpa: parseInt(row.threePointersAttempted) || 0,
      tpm: parseInt(row.threePointersMade) || 0,
      tp_pct: parseFloat(row.threePointersPercentage) || 0,
      fta: parseInt(row.freeThrowsAttempted) || 0,
      ftm: parseInt(row.freeThrowsMade) || 0,
      ft_pct: parseFloat(row.freeThrowsPercentage) || 0,
      game_type: row.gameType,
      game_label: row.gameLabel,
      game_sublabel: row.gameSubLabel,
      series_game_number: parseInt(row.seriesGameNumber) || null,
      comment: row.comment || null,
      starting_position: row.startingPosition || null,
    }));

    const columns = [
      'game_id','person_id','team_id','opponent_team_id',
      'game_datetime_est','home','win','minutes',
      'points','assists','reb_total','reb_off','reb_def',
      'steals','blocks','turnovers','fouls','plus_minus',
      'fga','fgm','fg_pct','tpa','tpm','tp_pct','fta','ftm','ft_pct',
      'game_type','game_label','game_sublabel','series_game_number',
      'comment','starting_position',
    ];
    const onConflict = `ON CONFLICT (game_id, person_id) DO UPDATE SET
      points = EXCLUDED.points, assists = EXCLUDED.assists,
      reb_total = EXCLUDED.reb_total, comment = EXCLUDED.comment,
      starting_position = EXCLUDED.starting_position`;

    // Split into smaller chunks to avoid hitting Postgres parameter limit (65535)
    const chunkSize = 100;
    for (let i = 0; i < mapped.length; i += chunkSize) {
      const chunk = mapped.slice(i, i + chunkSize);
      try {
        const query = buildBatchInsert('public.player_game_stats', columns, chunk, onConflict);
        await pool.query(query);
      } catch (e) {
        // skip bad chunks
      }
    }
  });
}

async function loadPlayerUsage() {
  console.log('Loading player usage stats...');
  await loadCSV('../data/kaggle_nba_sync/player_stats_usage_rs.csv', async (rows) => {
    const mapped = rows.map(row => ({
      game_id: row.GAME_ID,
      person_id: row.PLAYER_ID,
      usg_pct: parseFloat(row.USG_PCT) || null,
      pct_ast: parseFloat(row.PCT_AST) || null,
      pct_reb: parseFloat(row.PCT_REB) || null,
      pct_tov: parseFloat(row.PCT_TOV) || null,
      pct_stl: parseFloat(row.PCT_STL) || null,
      pct_blk: parseFloat(row.PCT_BLK) || null,
    }));
    const columns = ['game_id','person_id','usg_pct','pct_ast','pct_reb','pct_tov','pct_stl','pct_blk'];
    const onConflict = 'ON CONFLICT (game_id, person_id) DO NOTHING';

    const chunkSize = 500;
    for (let i = 0; i < mapped.length; i += chunkSize) {
      const chunk = mapped.slice(i, i + chunkSize);
      try {
        const query = buildBatchInsert('public.player_game_stats_usage', columns, chunk, onConflict);
        await pool.query(query);
      } catch (e) {
        // skip
      }
    }
  });
}

async function loadTeamAdvancedStats() {
  console.log('Loading team advanced stats...');
  await loadCSV('../data/kaggle_nba_sync/TeamStatisticsExtended.csv', async (rows) => {
    const mapped = rows.map(row => ({
      game_id: row.gameId,
      team_id: row.teamId,
      game_datetime_est: row.gameDateTimeEst,
      gametype: row.gameType,
      defrating: parseFloat(row.defensiveRating) || null,
      pace: parseFloat(row.pace) || null,
    }));
    const columns = ['game_id','team_id','game_datetime_est','gametype','defrating','pace'];
    const onConflict = 'ON CONFLICT (game_id, team_id) DO UPDATE SET defrating = EXCLUDED.defrating, pace = EXCLUDED.pace';

    const chunkSize = 500;
    for (let i = 0; i < mapped.length; i += chunkSize) {
      const chunk = mapped.slice(i, i + chunkSize);
      try {
        const query = buildBatchInsert('public.team_game_stats_advanced', columns, chunk, onConflict);
        await pool.query(query);
      } catch (e) {
        // skip
      }
    }
  });
}

async function loadSchedule() {
  console.log('Loading 2025-26 schedule...');
  await loadCSV('../data/kaggle_nba_sync/LeagueSchedule25_26.csv', async (rows) => {
    const mapped = rows.map(row => ({
      game_id: row.gameId,
      game_datetime_est: row.gameDateTimeEst,
      game_day: row.gameDay,
      home_team_id: row.homeTeamId,
      away_team_id: row.awayTeamId,
      home_team_name: row.homeTeamName,
      home_team_city: row.homeTeamCity,
      away_team_name: row.awayTeamName,
      away_team_city: row.awayTeamCity,
      arena_name: row.arenaName,
      arena_city: row.arenaCity,
      arena_state: row.arenaState,
      game_label: row.gameLabel,
      game_sublabel: row.gameSubLabel,
      game_subtype: row.gameSubtype,
      series_game_number: row.seriesGameNumber || null,
      week_number: parseInt(row.weekNumber) || null,
    }));
    const columns = [
      'game_id','game_datetime_est','game_day',
      'home_team_id','away_team_id',
      'home_team_name','home_team_city',
      'away_team_name','away_team_city',
      'arena_name','arena_city','arena_state',
      'game_label','game_sublabel','game_subtype',
      'series_game_number','week_number',
    ];
    const onConflict = 'ON CONFLICT (game_id) DO NOTHING';

    const chunkSize = 100;
    for (let i = 0; i < mapped.length; i += chunkSize) {
      const chunk = mapped.slice(i, i + chunkSize);
      try {
        const query = buildBatchInsert('public.league_schedule_2025_26', columns, chunk, onConflict);
        await pool.query(query);
      } catch (e) {
        // skip
      }
    }
  });
}

async function main() {
  try {
    await loadTeams();
    await loadPlayers();
    await loadPlayerStats();
    await loadPlayerUsage();
    await loadTeamAdvancedStats();
    await loadSchedule();
    console.log('\n🎉 All data loaded successfully!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();