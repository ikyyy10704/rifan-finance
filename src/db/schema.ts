import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  avatar: text("avatar"), // nama file di data/avatars
  totpSecret: text("totp_secret"), // terisi = 2FA aktif
  totpPending: text("totp_pending"), // rahasia sementara selama proses aktivasi
  totpLastStep: integer("totp_last_step"), // cegah kode yang sama dipakai dua kali
  dashboardPrefs: text("dashboard_prefs"), // JSON: widget beranda yang ditampilkan
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// Tiket login tahap kedua (kode 2FA). id = SHA-256 dari token di cookie rf_2fa.
export const loginChallenges = sqliteTable("login_challenges", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

// id = SHA-256 dari token di cookie, jadi bocornya database tidak membocorkan sesi aktif.
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("idx_sessions_user").on(t.userId)],
);

export const loginAttempts = sqliteTable(
  "login_attempts",
  {
    id: integer("id").primaryKey(),
    username: text("username").notNull(),
    ip: text("ip"),
    success: integer("success", { mode: "boolean" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("idx_login_attempts_user_time").on(t.username, t.createdAt)],
);

export const ACCOUNT_TYPES = ["cash", "bank", "ewallet"] as const;

export const accounts = sqliteTable(
  "accounts",
  {
    id: integer("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    type: text("type", { enum: ACCOUNT_TYPES }).notNull(),
    provider: text("provider"), // bri, dana, gopay, shopeepay, bank_other, ewallet_other, cash
    accountNumber: text("account_number"), // nomor rekening atau nomor HP e-wallet, opsional
    initialBalance: integer("initial_balance").notNull().default(0), // rupiah, bilangan bulat
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("idx_accounts_user").on(t.userId)],
);

export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    kind: text("kind", { enum: ["income", "expense"] }).notNull(),
    icon: text("icon"),
    color: text("color"),
    // Disembunyikan dari pilihan saat mencatat; transaksi lama tetap memakai kategorinya.
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("idx_categories_user").on(t.userId)],
);

export const TX_TYPES = ["income", "expense", "transfer"] as const;

// Saldo akun tidak disimpan: saldo awal + pemasukan − pengeluaran − transfer keluar + transfer masuk.
export const transactions = sqliteTable(
  "transactions",
  {
    id: integer("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    type: text("type", { enum: TX_TYPES }).notNull(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
    toAccountId: integer("to_account_id").references(() => accounts.id),
    categoryId: integer("category_id").references(() => categories.id),
    amount: integer("amount").notNull(),
    date: text("date").notNull(), // YYYY-MM-DD, zona Asia/Jakarta
    note: text("note"),
    // Sidik baris mutasi bank (norek|waktu|arah|nominal|saldo). Unik per user: baris yang sama tidak bisa diimpor dua kali.
    importHash: text("import_hash"),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [
    index("idx_tx_user_date").on(t.userId, t.date),
    uniqueIndex("idx_tx_import_hash").on(t.userId, t.importHash),
    check("tx_amount_positive", sql`${t.amount} > 0`),
  ],
);

// Satu kali unggah file mutasi. File aslinya tidak disimpan (berisi data rekening).
export const importBatches = sqliteTable("import_batches", {
  id: integer("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id),
  bank: text("bank").notNull().default("BRI"),
  fileType: text("file_type", { enum: ["csv", "pdf"] }).notNull(),
  fileName: text("file_name").notNull(),
  statementAccount: text("statement_account"), // nomor rekening yang tertulis di file
  periodFrom: text("period_from"),
  periodTo: text("period_to"),
  openingBalance: integer("opening_balance"),
  closingBalance: integer("closing_balance"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// Baris hasil baca file. Tetap "draft" sampai pengguna memasukkannya ke database.
export const importRows = sqliteTable(
  "import_rows",
  {
    id: integer("id").primaryKey(),
    batchId: integer("batch_id")
      .notNull()
      .references(() => importBatches.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    position: integer("position").notNull(), // urutan di file
    date: text("date").notNull(),
    time: text("time").notNull(),
    rawDescription: text("raw_description").notNull(),
    note: text("note"), // keterangan yang bisa diubah
    direction: text("direction", { enum: ["debit", "credit"] }).notNull(),
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    hash: text("hash").notNull(),
    kind: text("kind", { enum: TX_TYPES }).notNull(),
    categoryId: integer("category_id").references(() => categories.id),
    toAccountId: integer("to_account_id").references(() => accounts.id),
    status: text("status", { enum: ["draft", "imported", "duplicate"] }).notNull().default("draft"),
    transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
  },
  (t) => [index("idx_import_rows_batch").on(t.batchId, t.position)],
);

export type User = typeof users.$inferSelect;
export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type TxType = (typeof TX_TYPES)[number];
