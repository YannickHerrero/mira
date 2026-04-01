import type { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import type { SQLJsDatabase } from "drizzle-orm/sql-js";
import React, { type PropsWithChildren, useEffect, useState } from "react";
import { initialize, useMigrationHelper } from "./drizzle";
import { DatabaseContext } from "./context";

// Re-export for convenience
export { DatabaseContext, useDatabase } from "./context";


export function DatabaseProvider({children}: PropsWithChildren) {
  const [db, setDb] = useState<SQLJsDatabase | ExpoSQLiteDatabase | null>(null);
  const { success } = useMigrationHelper();

  useEffect(() => {
    if (db || !success) return;
    initialize().then((newDb) => {
      setDb(newDb);
    });
  }, [success]);

  return (
    <DatabaseContext.Provider value={{db}}>
      {children}
    </DatabaseContext.Provider>
  );
}
