NBA Data Analysis Tool

A PostgreSQL-based NBA analytics database designed to power advanced team and player insights, rolling performance metrics, and automated daily updates.

This project automates ingestion of structured NBA data from Kaggle, normalizes it into a relational schema, and supports production-style refresh automation.


Overview

The NBA Data Analysis Tool is built to:
-Store normalized NBA game, team, and player data
-Support advanced statistical analysis
-Power rolling performance metrics (e.g., last 5 games)
-Automatically refresh daily using cron + shell automation
-Maintain production-style data integrity and indexing
-The system is optimized for:
-Player performance modeling
-Team trend analysis
-Recent-game splits
-Predictive modeling features


Running Locally
  1. Install PostgreSQL
  2. Install Kaggle CLI
  3. Add Kaggle API credentials to ~/.kaggle/
  4. Run:
      ./run_refresh.sh

       ssh -i ~/.ssh/DreMac.pem ubuntu@50.19.182.211.  (IP ADDRESS CHANGES)


Repository Structure

DataAnalysis-project/
│
├── sql/
│   └── refresh_all.sql
│
├── data/
│   └── kaggle_nba_sync/   (ignored in git)
│
├── run_refresh.sh
├── .gitignore
└── README.md


Architecture
Kaggle Dataset
      ↓
Shell Automation (run_refresh.sh)
      ↓
Staging Tables (raw text schema)
      ↓
Typed Public Tables (normalized schema)
      ↓
Materialized Views (last-5 analytics)

Refresh Pipeline Steps
1. Download latest Kaggle dataset
2. Load raw CSVs into staging tables
3. Cast and validate data types
4. Upsert into normalized public tables
5. Refresh materialized views


Database Schema

Core Dimension Tables
    teams
        -team_id (PK)
        -team_city
        -team_name
        -team_abbrev

    players
        -person_id (PK)
        -first_name
        -last_name
        -birthdate
        -country
        -Position flags (guard, forward, center)
        -Draft metadata

    games Stores metadata for every NBA game.
        -game_id (PK)
        -game_datetime_est
        -home_team_id
        -away_team_id
        -arena_name
        -arena_city
        -arena_state
        -game_label

Team Game Tables : Each row represents one team in one game.

    team_game_stats

        Primary key: (game_id, team_id)

        Includes:
        -Points, assists, rebounds
        -Shooting splits
        -Fouls, turnovers
        -Quarter scoring
        -Season record

    team_game_stats_advanced

        -Offensive Rating
        -Defensive Rating
        -Net Rating
        -True Shooting %
        -Pace
        -Possessions
        -Usage-based metrics

    team_game_stats_four_factors

        -Effective FG%
        -Turnover %
        -Offensive Rebound %
        -Free Throw Rate
        -Opponent versions of all metrics

    team_game_stats_misc
        -Points in paint
        -Fast break points
        -Second chance points
        -Points off turnovers
        -Opponent equivalents

team_game_stats_scoring
        -% points from 3
        -% points from FT
        -% points in paint
        -Assisted vs unassisted splits
        -Shot attempt distribution


Player Game Tables : Each row represents one player in one game.

    player_game_stats

    Primary key: (game_id, person_id)
        -Points
        -Assists
        -Rebounds
        -Shooting splits
        -Minutes
        -Plus/minus

    player_game_stats_advanced
        -Offensive Rating
        -Defensive Rating
        -Net Rating
        -True Shooting %
        -Usage %
        -Rebound %
        -Assist %

    player_game_stats_misc
        -Fantasy points
        -Paint scoring
        -Fast break scoring
        -Defensive contests

    player_game_stats_scoring
        -Shot profile percentages.

    player_game_stats_usage
        -Usage %
        -% Team Rebounds
        -% Team Assists
        -% Turnovers
        -% Steals
        -% Blocks

Table Relationships

teams (team_id PK)
  └── team_game_stats (game_id, team_id PK)
        ├── team_game_stats_advanced
        ├── team_game_stats_four_factors
        ├── team_game_stats_misc
        └── team_game_stats_scoring

players (person_id PK)
  └── player_game_stats (game_id, person_id PK)
        ├── player_game_stats_advanced
        ├── player_game_stats_misc
        ├── player_game_stats_scoring
        └── player_game_stats_usage

Index Strategy
Optimized for rolling analytics queries:
-idx_tgs_team_dt (team_id, game_datetime_est DESC)
-idx_pgs_person_dt (person_id, game_datetime_est DESC)
-Composite PKs on (game_id, team_id)
-Composite PKs on (game_id, person_id)

Designed to support:
-Last 5 games queries
-Split analysis
-Player trend tracking
-Efficient joins across stat tables

Materialized Views
  mv_team_last5
    -Pre-aggregated last 5 game metrics per team.

  mv_player_last5
    -Pre-aggregated last 5 game metrics per player.

These improve performance for rolling analytics.


Data Refresh Automation
The refresh process is automated using:

    run_refresh.sh
    sql/refresh_all.sql
    Kaggle CLI
Scheduled via cron:
    0 5,17 * * *
    Runs twice daily.

Data Scope
The database includes:
    -All historical games involving current NBA teams 
    -All historical games involving current NBA players
    -Daily updates for new games
    -Optimized for rolling performance analytics











# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
