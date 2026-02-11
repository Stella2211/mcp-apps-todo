CREATE TABLE `todos` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '',
	`completed` integer DEFAULT false NOT NULL,
	`username` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
