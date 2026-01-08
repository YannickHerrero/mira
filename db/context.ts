import type { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import type { SQLJsDatabase } from "drizzle-orm/sql-js";
import React, { useContext } from "react";

export type ContextType = { db: SQLJsDatabase | ExpoSQLiteDatabase | null };

export const DatabaseContext = React.createContext<ContextType>({ db: null });

export const useDatabase = () => useContext(DatabaseContext);
