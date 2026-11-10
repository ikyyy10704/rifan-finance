ALTER TABLE `categories` ADD `archived` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `dashboard_prefs` text;