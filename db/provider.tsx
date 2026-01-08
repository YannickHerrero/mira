import type { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import type { SQLJsDatabase } from "drizzle-orm/sql-js";
import React, { type PropsWithChildren, useEffect, useState } from "react";
import { initialize } from "./drizzle";
import { DatabaseContext } from "./context";

// Re-export for convenience
export { DatabaseContext, useDatabase } from "./context";


export function DatabaseProvider({children}: PropsWithChildren) {
  const [db, setDb] = useState<SQLJsDatabase | ExpoSQLiteDatabase | null>(null);

  useEffect(() => {
    if (db) return
    initialize().then((newDb) => {
      setDb(newDb);
    })

  }, []);

  return (
    <DatabaseContext.Provider value={{db}}>
      {children}
    </DatabaseContext.Provider>
  );
}

