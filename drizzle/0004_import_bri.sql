CREATE TABLE `import_batches` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`account_id` integer NOT NULL,
	`bank` text DEFAULT 'BRI' NOT NULL,
	`file_type` text NOT NULL,
	`file_name` text NOT NULL,
	`statement_account` text,
	`period_from` text,
	`period_to` text,
	`opening_balance` integer,
	`closing_balance` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `import_rows` (
	`id` integer PRIMARY KEY NOT NULL,
	`batch_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`position` integer NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`raw_description` text NOT NULL,
	`note` text,
	`direction` text NOT NULL,
	`amount` integer NOT NULL,
	`balance_after` integer NOT NULL,
	`hash` text NOT NULL,
	`kind` text NOT NULL,
	`category_id` integer,
	`to_account_id` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`transaction_id` integer,
	FOREIGN KEY (`batch_id`) REFERENCES `import_batches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_import_rows_batch` ON `import_rows` (`batch_id`,`position`);--> statement-breakpoint
ALTER TABLE `transactions` ADD `import_hash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tx_import_hash` ON `transactions` (`user_id`,`import_hash`);