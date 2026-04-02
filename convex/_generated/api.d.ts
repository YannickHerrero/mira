/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTP from "../ResendOTP.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as mutations_downloads from "../mutations/downloads.js";
import type * as mutations_favorites from "../mutations/favorites.js";
import type * as mutations_listItems from "../mutations/listItems.js";
import type * as mutations_lists from "../mutations/lists.js";
import type * as mutations_media from "../mutations/media.js";
import type * as mutations_progress from "../mutations/progress.js";
import type * as mutations_watchlist from "../mutations/watchlist.js";
import type * as queries_syncAll from "../queries/syncAll.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  auth: typeof auth;
  http: typeof http;
  "mutations/downloads": typeof mutations_downloads;
  "mutations/favorites": typeof mutations_favorites;
  "mutations/listItems": typeof mutations_listItems;
  "mutations/lists": typeof mutations_lists;
  "mutations/media": typeof mutations_media;
  "mutations/progress": typeof mutations_progress;
  "mutations/watchlist": typeof mutations_watchlist;
  "queries/syncAll": typeof queries_syncAll;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
