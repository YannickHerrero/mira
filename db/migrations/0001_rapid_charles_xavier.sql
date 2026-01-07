CREATE TABLE `downloads` (
	`id` text PRIMARY KEY NOT NULL,
	`tmdb_id` integer NOT NULL,
	`media_type` text NOT NULL,
	`season_number` integer,
	`episode_number` integer,
	`title` text NOT NULL,
	`poster_path` text,
	`file_name` text NOT NULL,
	`file_path` text NOT NULL,
	`file_size` integer,
	`quality` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`progress` real DEFAULT 0,
	`stream_url` text NOT NULL,
	`added_at` text DEFAULT (CURRENT_TIMESTAMP),
	`completed_at` text
);
