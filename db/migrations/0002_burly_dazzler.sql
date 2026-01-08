CREATE TABLE `list_items` (
	`list_id` text NOT NULL,
	`tmdb_id` integer NOT NULL,
	`media_type` text NOT NULL,
	`added_at` text DEFAULT (CURRENT_TIMESTAMP),
	PRIMARY KEY(`list_id`, `tmdb_id`, `media_type`),
	FOREIGN KEY (`list_id`) REFERENCES `lists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lists` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`is_default` integer DEFAULT false,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP)
);
