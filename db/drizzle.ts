import { type ExpoSQLiteDatabase, drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync, deleteDatabaseSync } from "expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import type { SQLJsDatabase } from "drizzle-orm/sql-js";

import migrations from "./migrations/migrations";

// Database name - change this to reset the database
const DB_NAME = "mira_v2.db";

const expoDb = openDatabaseSync(DB_NAME, { enableChangeListener: true });
const db = drizzle(expoDb);

export const initialize = (): Promise<ExpoSQLiteDatabase> => {
  return Promise.resolve(db);
};

export const useMigrationHelper = () => {
  return useMigrations(db, migrations);
};

/**
 * Reset the database by deleting and recreating it.
 * Use this for development when schema changes significantly.
 */
export const resetDatabase = () => {
  try {
    deleteDatabaseSync(DB_NAME);
    console.log("Database reset successfully");
  } catch (error) {
    console.error("Failed to reset database:", error);
  }
};
