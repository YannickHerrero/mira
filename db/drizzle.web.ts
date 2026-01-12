import { type SQLJsDatabase, drizzle } from "drizzle-orm/sql-js";
import initSqlJs from "sql.js";
import { useEffect, useState } from "react";
import { useDatabase } from "./context";

let dbInstance: SQLJsDatabase | null = null;

// Individual SQL statements to create all tables (derived from migrations)
const SCHEMA_STATEMENTS = [
  // Migration 0000: Core tables
  `CREATE TABLE IF NOT EXISTS media (
    tmdb_id INTEGER NOT NULL,
    media_type TEXT NOT NULL,
    title TEXT NOT NULL,
    title_original TEXT,
    imdb_id TEXT,
    year INTEGER,
    score REAL,
    poster_path TEXT,
    backdrop_path TEXT,
    description TEXT,
    genres TEXT,
    season_count INTEGER,
    episode_count INTEGER,
    is_favorite INTEGER DEFAULT 0,
    added_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    PRIMARY KEY(tmdb_id, media_type)
  )`,
  `CREATE TABLE IF NOT EXISTS watch_progress (
    tmdb_id INTEGER NOT NULL,
    media_type TEXT NOT NULL,
    season_number INTEGER,
    episode_number INTEGER,
    position INTEGER DEFAULT 0 NOT NULL,
    duration INTEGER DEFAULT 0 NOT NULL,
    completed INTEGER DEFAULT 0,
    watched_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    PRIMARY KEY(tmdb_id, media_type, season_number, episode_number)
  )`,
  `CREATE TABLE IF NOT EXISTS watchlist (
    tmdb_id INTEGER NOT NULL,
    media_type TEXT NOT NULL,
    added_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    PRIMARY KEY(tmdb_id, media_type)
  )`,
  // Migration 0001: Downloads table
  `CREATE TABLE IF NOT EXISTS downloads (
    id TEXT PRIMARY KEY NOT NULL,
    tmdb_id INTEGER NOT NULL,
    media_type TEXT NOT NULL,
    season_number INTEGER,
    episode_number INTEGER,
    title TEXT NOT NULL,
    poster_path TEXT,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    quality TEXT,
    status TEXT DEFAULT 'pending' NOT NULL,
    progress REAL DEFAULT 0,
    stream_url TEXT NOT NULL,
    info_hash TEXT,
    added_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    completed_at TEXT
  )`,
  // Migration 0002: Lists tables
  `CREATE TABLE IF NOT EXISTS lists (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
  )`,
  `CREATE TABLE IF NOT EXISTS list_items (
    list_id TEXT NOT NULL,
    tmdb_id INTEGER NOT NULL,
    media_type TEXT NOT NULL,
    added_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    PRIMARY KEY(list_id, tmdb_id, media_type),
    FOREIGN KEY (list_id) REFERENCES lists(id) ON UPDATE NO ACTION ON DELETE CASCADE
  )`,
];

export const initialize = async (): Promise<SQLJsDatabase> => {
  console.log("[DB Web] Initializing database...");
  
  if (dbInstance) {
    console.log("[DB Web] Returning existing instance");
    return dbInstance;
  }

  console.log("[DB Web] Loading sql.js...");
  const SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  });

  console.log("[DB Web] Creating new database...");
  // Create a new empty database for web
  const sqldb = new SQL.Database();

  // Run schema migrations
  console.log("[DB Web] Running schema migrations...");
  try {
    for (const statement of SCHEMA_STATEMENTS) {
      try {
        console.log("[DB Web] Running:", statement.substring(0, 50) + "...");
        sqldb.run(statement);
      } catch (stmtErr) {
        console.warn("[DB Web] Statement error:", stmtErr);
      }
    }
    console.log("[DB Web] Schema created successfully");
  } catch (err) {
    console.error("[DB Web] Failed to create schema:", err);
  }

  dbInstance = drizzle(sqldb);
  console.log("[DB Web] Database ready!");

  return dbInstance;
};

interface State {
  success: boolean;
  error?: Error;
}

// Web migration helper - waits for database to be ready
export const useMigrationHelper = (): State => {
  const { db } = useDatabase();
  const [state, setState] = useState<State>({
    success: false,
    error: undefined,
  });

  useEffect(() => {
    if (db) {
      console.log("[DB Web] Migration helper: database is ready");
      setState({ success: true, error: undefined });
    }
  }, [db]);

  return state;
};
