import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexProvider } from "convex/react";
import type { ReactNode } from "react";
import { convex } from "./client";
import { convexTokenStorage } from "./storage";

interface ConvexSyncProviderProps {
  children: ReactNode;
}

export function ConvexSyncProvider({ children }: ConvexSyncProviderProps) {
  return (
    <ConvexProvider client={convex}>
      <ConvexAuthProvider client={convex} storage={convexTokenStorage}>
        {children}
      </ConvexAuthProvider>
    </ConvexProvider>
  );
}
