import { ConvexReactClient } from "convex/react";

const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  console.warn(
    "[Convex] EXPO_PUBLIC_CONVEX_URL is not set. Cloud sync will not work."
  );
}

export const convex = new ConvexReactClient(CONVEX_URL ?? "https://placeholder.convex.cloud", {
  // Disable if URL is not configured
  disabled: !CONVEX_URL,
});
