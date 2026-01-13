/**
 * Types for widget data exchange between React Native app and iOS widget
 * These types must match the Swift ReleaseItem struct
 */

/**
 * Episode information for TV show releases
 */
export interface WidgetEpisodeInfo {
  season: number;
  episode: number;
  name: string;
}

/**
 * Simplified release data structure for the widget
 * This is serialized to JSON and stored in App Group shared storage
 */
export interface WidgetRelease {
  /** TMDB ID */
  id: number;
  /** "movie" or "tv" */
  mediaType: "movie" | "tv";
  /** Display title */
  title: string;
  /** Full poster URL (not just path) */
  posterUrl: string | null;
  /** Release date in YYYY-MM-DD format */
  releaseDate: string;
  /** Episode info for TV shows */
  episodeInfo: WidgetEpisodeInfo | null;
}
