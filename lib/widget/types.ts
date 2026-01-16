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
  posterFilename: string | null; // Local filename in App Group posters directory
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
