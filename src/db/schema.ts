import { sql } from "drizzle-orm";
import { bigint, boolean, check, customType, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// Waktu dibuat disimpan sebagai teks UTC "YYYY-MM-DD HH:MM:SS" (format yang sama dengan versi SQLite).
const nowText = sql`to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')`;
// Nominal rupiah: bigint supaya total di atas 2,1 miliar tidak meluap; dibaca sebagai number JS.
const rupiah = (name: string) => bigint(name, { mode: "number" });
const ms = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });
const id = () => integer("id").primaryKey().generatedByDefaultAsIdentity();

export const users = pgTable("users", {
  id: id(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"), // null = akun dari Google yang belum membuat password
  googleSub: text("google_sub").unique(), // id akun Google (klaim "sub"), tetap walau email berganti
  email: text("email"), // email Google, hanya informasi
  // Langkah perkenalan yang sedang dikerjakan (1 profil, 2 dompet, 3 kategori). null = selesai.
  setupStep: integer("setup_step"),
  role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
  active: boolean("active").notNull().default(true),
  avatar: text("avatar"), // versi foto (dipakai di URL ?v= untuk cache); null = tanpa foto
  avatarData: bytea("avatar_data"), // WebP 256px, sekitar 10-20 KB
  totpSecret: text("totp_secret"), // terisi = 2FA aktif
  totpPending: text("totp_pending"), // rahasia sementara selama proses aktivasi
  totpLastStep: bigint("totp_last_step", { mode: "number" }), // cegah kode yang sama dipakai dua kali
  dashboardPrefs: text("dashboard_prefs"), // JSON: widget beranda yang ditampilkan
  notifyPrefs: text("notify_prefs"), // JSON: pengaturan peringatan harian
  createdAt: text("created_at").notNull().default(nowText),
});

// Tiket login tahap kedua (kode 2FA). id = SHA-256 dari token di cookie rf_2fa.
export const loginChallenges = pgTable("login_challenges", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: ms("expires_at").notNull(),
});

// id = SHA-256 dari token di cookie, jadi bocornya database tidak membocorkan sesi aktif.
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ms("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (t) => [index("idx_sessions_user").on(t.userId)],
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: id(),
    username: text("username").notNull(),
    ip: text("ip"),
    success: boolean("success").notNull(),
    createdAt: ms("created_at").notNull(),
  },
  (t) => [index("idx_login_attempts_user_time").on(t.username, t.createdAt)],
);

export const ACCOUNT_TYPES = ["cash", "bank", "ewallet"] as const;

export const accounts = pgTable(
  "accounts",
  {
    id: id(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    type: text("type", { enum: ACCOUNT_TYPES }).notNull(),
    provider: text("provider"), // bri, dana, gopay, shopeepay, bank_other, ewallet_other, cash
    accountNumber: text("account_number"), // nomor rekening atau nomor HP e-wallet, opsional
    initialBalance: rupiah("initial_balance").notNull().default(0), // rupiah, bilangan bulat
    archived: boolean("archived").notNull().default(false),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (t) => [index("idx_accounts_user").on(t.userId)],
);

export const categories = pgTable(
  "categories",
  {
    id: id(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    kind: text("kind", { enum: ["income", "expense"] }).notNull(),
    icon: text("icon"),
    color: text("color"),
    // Disembunyikan dari pilihan saat mencatat; transaksi lama tetap memakai kategorinya.
    archived: boolean("archived").notNull().default(false),
  },
  (t) => [index("idx_categories_user").on(t.userId)],
);

export const TX_TYPES = ["income", "expense", "transfer"] as const;

// Saldo akun tidak disimpan: saldo awal + pemasukan − pengeluaran − transfer keluar + transfer masuk.
export const transactions = pgTable(
  "transactions",
  {
    id: id(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    type: text("type", { enum: TX_TYPES }).notNull(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
    toAccountId: integer("to_account_id").references(() => accounts.id),
    categoryId: integer("category_id").references(() => categories.id),
    amount: rupiah("amount").notNull(),
    date: text("date").notNull(), // YYYY-MM-DD, zona Asia/Jakarta
    note: text("note"),
    // Sidik baris mutasi bank (norek|waktu|arah|nominal|saldo). Unik per user: baris yang sama tidak bisa diimpor dua kali.
    importHash: text("import_hash"),
    createdAt: text("created_at").notNull().default(nowText),
    updatedAt: text("updated_at").notNull().default(nowText),
  },
  (t) => [
    index("idx_tx_user_date").on(t.userId, t.date),
    uniqueIndex("idx_tx_import_hash").on(t.userId, t.importHash),
    check("tx_amount_positive", sql`${t.amount} > 0`),
  ],
);

// Peringatan keuangan harian. Satu jenis per hari per user (unik), dibuat ulang tiap hari dari data terbaru.
export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: text("day").notNull(), // YYYY-MM-DD (Asia/Jakarta)
    kind: text("kind").notNull(),
    level: text("level", { enum: ["info", "warning", "danger"] }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    readAt: text("read_at"),
    pushedAt: text("pushed_at"), // terkirim sebagai push ke HP
    createdAt: text("created_at").notNull().default(nowText),
  },
  (t) => [uniqueIndex("idx_notif_user_day_kind").on(t.userId, t.day, t.kind), index("idx_notif_user_read").on(t.userId, t.readAt)],
);

// Langganan Web Push per perangkat (browser/HP).
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: id(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: text("created_at").notNull().default(nowText),
});

// Satu kali unggah file mutasi. File aslinya tidak disimpan (berisi data rekening).
export const importBatches = pgTable("import_batches", {
  id: id(),
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
  openingBalance: rupiah("opening_balance"),
  closingBalance: rupiah("closing_balance"),
  // Diisi saat pengguna menekan "Batalkan impor ini": transaksinya dihapus, riwayat file tetap ada.
  canceledAt: text("canceled_at"),
  createdAt: text("created_at").notNull().default(nowText),
});

// Baris hasil baca file. Tetap "draft" sampai pengguna memasukkannya ke database.
export const importRows = pgTable(
  "import_rows",
  {
    id: id(),
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
    amount: rupiah("amount").notNull(),
    balanceAfter: rupiah("balance_after").notNull(),
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
