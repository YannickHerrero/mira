CREATE TABLE IF NOT EXISTS `media` (
	`tmdb_id` integer NOT NULL,
	`media_type` text NOT NULL,
	`title` text NOT NULL,
	`title_original` text,
	`imdb_id` text,
	`year` integer,
	`score` real,
	`poster_path` text,
	`backdrop_path` text,
	`description` text,
	`genres` text,
	`season_count` integer,
	`episode_count` integer,
	`is_favorite` integer DEFAULT false,
	`added_at` text DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP),
	PRIMARY KEY(`tmdb_id`, `media_type`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `watch_progress` (
	`tmdb_id` integer NOT NULL,
	`media_type` text NOT NULL,
	`season_number` integer,
	`episode_number` integer,
	`position` integer DEFAULT 0 NOT NULL,
	`duration` integer DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT false,
	`watched_at` text DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP),
	PRIMARY KEY(`tmdb_id`, `media_type`, `season_number`, `episode_number`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `watchlist` (
	`tmdb_id` integer NOT NULL,
	`media_type` text NOT NULL,
	`added_at` text DEFAULT (CURRENT_TIMESTAMP),
	PRIMARY KEY(`tmdb_id`, `media_type`)
);
