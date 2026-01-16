/**
 * Widget data types
 *
 * These types must match the Swift Codable structs in the widget extension.
 * Any changes here must be reflected in targets/widget/widgets.swift
 */

export interface WidgetEpisodeInfo {
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string;
}

export interface WidgetReleaseItem {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterUrl: string | null; // Full TMDB image URL for widget to load
  releaseDate: string; // YYYY-MM-DD or ISO 8601
  releaseType: "episode" | "movie";
  episodeInfo: WidgetEpisodeInfo | null;
  score: number | null;
}

export interface WidgetData {
  releases: WidgetReleaseItem[];
  mode: "recent" | "upcoming";
  lastUpdated: string; // ISO 8601
}

export type WidgetMode = "recent" | "upcoming";
