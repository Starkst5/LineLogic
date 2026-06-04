#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${PROJECT_ROOT}/refresh_log.txt"
DB_NAME="nba_data"

if [ -f "${PROJECT_ROOT}/sql/refresh_all.sql" ]; then
  SQL_FILE="${PROJECT_ROOT}/sql/refresh_all.sql"
elif [ -f "${PROJECT_ROOT}/refresh_all.sql" ]; then
  SQL_FILE="${PROJECT_ROOT}/refresh_all.sql"
else
  echo "ERROR: refresh_all.sql not found in:"
  echo "  ${PROJECT_ROOT}/sql/refresh_all.sql"
  echo "  ${PROJECT_ROOT}/refresh_all.sql"
  exit 1
fi

if [ -f "$LOG_FILE" ] && [ "$(wc -c < "$LOG_FILE")" -gt 5000000 ]; then
  mv "$LOG_FILE" "${LOG_FILE}.old"
fi

log() {
  echo "$@" | tee -a "$LOG_FILE"
}

run_psql() {
  sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"
}

command -v psql >/dev/null 2>&1 || { echo "ERROR: psql not found in PATH"; exit 127; }
command -v kaggle >/dev/null 2>&1 || { echo "ERROR: kaggle not found in PATH"; exit 127; }

cd "$PROJECT_ROOT"

log "====================================="
log "Starting NBA refresh: $(date)"
log "Project root: $PROJECT_ROOT"
log "SQL file: $SQL_FILE"
log "====================================="

log "Updating Kaggle dataset..."
mkdir -p "${PROJECT_ROOT}/data/kaggle_nba_sync"

kaggle datasets download \
  -d eoinamoore/historical-nba-data-and-player-box-scores \
  -p "${PROJECT_ROOT}/data/kaggle_nba_sync" \
  --unzip -q | tee -a "$LOG_FILE"

log "Running SQL refresh..."
run_psql -f "$SQL_FILE" | tee -a "$LOG_FILE"

log "Refreshing materialized views..."
run_psql -c "REFRESH MATERIALIZED VIEW public.mv_team_last5;" | tee -a "$LOG_FILE"

log "Running validation checks..."
run_psql -c "
SELECT
  (SELECT MAX(NULLIF(gamedatetimeest,'')::timestamp) FROM staging.player_stats_raw) AS staging_player_latest,
  (SELECT MAX(game_datetime_est) FROM public.player_game_stats WHERE game_datetime_est IS NOT NULL) AS final_player_latest,
  (SELECT MAX(game_datetime_est) FROM public.team_game_stats WHERE game_datetime_est IS NOT NULL) AS final_team_latest,
  (SELECT COUNT(*) FROM public.player_game_stats WHERE game_datetime_est IS NULL) AS null_player_dates;
" | tee -a "$LOG_FILE"

log "Refresh complete: $(date)"
log "====================================="