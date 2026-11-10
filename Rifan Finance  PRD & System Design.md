# Rifan Finance — PRD & System Design

Nov 8, 2026 · @Ikyyy

## Ringkasan

Rifan Finance adalah aplikasi web keuangan pribadi untuk dua pengguna, Rizki dan Irfan Rifan, dibangun dengan Next.js dan SQLite. SQLite sudah cukup dan justru paling cocok untuk skala ini: gratis, tanpa server database terpisah, dan backup cukup dengan menyalin satu file.

| Item | Keterangan |
| --- | --- |
| Nama produk | Rifan Finance |
| Pemilik & pengguna | Rizki, Irfan Rifan |
| Platform | Web responsif (desktop dan HP), bisa dipasang sebagai PWA |
| Tech stack | Next.js (App Router) + TypeScript, SQLite, Drizzle ORM, Tailwind CSS |
| Versi dokumen | 1.0 — draf awal |

## PRD (Product Requirements Document)

MVP fokus pada mencatat transaksi, melihat saldo per akun, anggaran, dan laporan bulanan. Setelah itu menyusul import mutasi BRI, kalender keuangan, dan perencanaan pembelian.

### Latar belakang

Catatan keuangan di spreadsheet atau aplikasi umum sulit dipakai bersama, penuh iklan, dan data tersimpan di server pihak lain. Aplikasi milik sendiri memberi kendali penuh atas data dan fitur.

### Tujuan

- Setiap transaksi tercatat dalam waktu kurang dari 15 detik dari HP.
- Saldo semua akun (tunai, bank, e-wallet) terlihat dalam satu layar.
- Pengeluaran per kategori bisa dibandingkan dengan anggaran bulanan.
- Data sepenuhnya milik pengguna dan bisa diekspor kapan saja.

### Pengguna

| Pengguna | Kebutuhan utama |
| --- | --- |
| Rizki | Mencatat pengeluaran harian, memantau anggaran, melihat laporan bulanan |
| Irfan Rifan | Mencatat pengeluaran harian, memantau anggaran, melihat laporan bulanan |

Setiap pengguna punya data sendiri. Fitur dompet bersama untuk pengeluaran gabungan masuk fase 2.

### Ruang lingkup MVP

| Fitur | Deskripsi | Prioritas |
| --- | --- | --- |
| Login | Email + password per pengguna, sesi aman | P0 |
| Akun / dompet | Tambah akun tunai, bank, e-wallet dengan saldo awal | P0 |
| Transaksi | Catat pemasukan, pengeluaran, dan transfer antar akun; edit dan hapus | P0 |
| Kategori | Kategori bawaan (Makan, Transportasi, Tagihan, Gaji, dll.) yang bisa diubah | P0 |
| Dashboard | Total saldo, pemasukan vs pengeluaran bulan ini, 5 transaksi terakhir | P0 |
| Anggaran | Batas bulanan per kategori dengan indikator persen terpakai | P1 |
| Laporan | Grafik pengeluaran per kategori dan tren 6 bulan | P1 |
| Filter & cari | Berdasarkan tanggal, akun, kategori, kata kunci | P1 |
| Ekspor | Unduh transaksi sebagai CSV | P1 |
| Transaksi berulang | Tagihan rutin (listrik, langganan) dibuat otomatis | P2 |

Di luar ruang lingkup MVP: sinkronisasi otomatis dengan bank, investasi/saham, multi mata uang, aplikasi native Android/iOS.

### Fitur tambahan

| Fitur | Deskripsi | Prioritas |
| --- | --- | --- |
| Import mutasi BRI | Upload file mutasi/e-statement BRI dalam format CSV atau PDF sesuai template yang disediakan, pratinjau, lalu simpan sebagai transaksi | P1 |
| Kalender keuangan | Tampilan bulanan berisi transaksi per hari, jatuh tempo tagihan, dan target tanggal rencana pembelian | P1 |
| Perencanaan pembelian | Daftar barang yang ingin dibeli dengan harga target, tanggal target, prioritas, dan progres tabungan | P1 |

**Import mutasi BRI**

- Pengguna memilih akun tujuan (misalnya "BRI Tabungan"), lalu mengunggah file CSV atau PDF.
- Sistem membaca kolom tanggal, uraian, debet, kredit, dan saldo; debet menjadi pengeluaran, kredit menjadi pemasukan.
- Layar pratinjau menampilkan semua baris sebelum disimpan; pengguna bisa mengubah kategori atau melewati baris.
- Baris yang sudah pernah diimpor dideteksi dan dilewati otomatis agar tidak dobel.
- Kategori ditebak dari kata kunci uraian (misalnya "PLN" → Tagihan, "GOPAY" → E-wallet); aturan bisa ditambah pengguna.
- Saldo akhir di file dibandingkan dengan saldo di aplikasi; selisih ditampilkan sebagai peringatan.
- Pertanyaan terbuka: kolom pasti di template CSV dan PDF BRI yang Anda sediakan perlu dicocokkan dengan parser.

**Kalender keuangan**

- Tampilan bulan dengan total pengeluaran per hari; hari dengan pengeluaran besar diberi warna lebih pekat.
- Klik tanggal untuk melihat daftar transaksi hari itu dan menambah transaksi baru di tanggal tersebut.
- Penanda untuk jatuh tempo tagihan rutin dan tanggal target rencana pembelian.
- Pengingat sendiri (misalnya "Bayar kos", "Perpanjang STNK") dengan nominal opsional.

**Perencanaan pembelian**

- Setiap rencana berisi nama barang, harga target, tanggal target, prioritas (tinggi/sedang/rendah), tautan toko, dan catatan.
- Sistem menghitung tabungan yang dibutuhkan per bulan: (harga target − dana terkumpul) ÷ sisa bulan.
- Pengguna menyisihkan dana ke rencana; progres ditampilkan dalam persen.
- Saat barang dibeli, satu klik membuat transaksi pengeluaran dan menandai rencana selesai.
- Rencana tampil di dashboard dan di kalender pada tanggal targetnya.

User stories tambahan:

1. Sebagai pengguna, saya ingin mengunggah mutasi BRI bulan ini agar tidak perlu mengetik ulang puluhan transaksi.
2. Sebagai pengguna, saya ingin melihat kalender untuk tahu tanggal berapa pengeluaran saya paling besar dan tagihan apa yang akan jatuh tempo.
3. Sebagai pengguna, saya ingin merencanakan membeli laptop Rp12.000.000 dalam 8 bulan dan tahu berapa yang harus ditabung per bulan.

### PWA (Progressive Web App)

Rifan Finance bisa dipasang di layar utama HP seperti aplikasi biasa, tanpa Play Store atau App Store, dan tetap bisa mencatat transaksi saat sinyal hilang.

| Kemampuan | Deskripsi | Prioritas |
| --- | --- | --- |
| Bisa dipasang | Ikon logo Rifan Finance di layar utama, terbuka layar penuh tanpa bilah browser | P1 |
| Tampilan aplikasi | Splash screen dan warna bilah status hijau tua sesuai tema | P1 |
| Pintasan | Tekan lama ikon untuk langsung ke "Catat Transaksi" atau "Kalender" | P1 |
| Mode offline | Halaman yang pernah dibuka tetap tampil; transaksi baru disimpan di HP lalu dikirim otomatis saat online | P2 |
| Notifikasi | Pengingat tagihan jatuh tempo, anggaran terpakai 80%, dan target rencana pembelian | P2 |
| Pembaruan | Saat ada versi baru, muncul tombol "Muat ulang" tanpa perlu instal ulang | P1 |

- Android (Chrome): muncul tombol "Pasang aplikasi" di dalam aplikasi.
- iPhone (Safari): ditampilkan panduan singkat "Bagikan → Tambah ke Layar Utama"; notifikasi hanya aktif setelah aplikasi dipasang.
- Transaksi yang belum terkirim diberi tanda "Menunggu sinkron" agar pengguna tahu statusnya.
- Saat logout, semua data yang disimpan di HP dihapus.

User stories PWA:

1. Sebagai pengguna, saya ingin membuka Rifan Finance dari ikon di HP agar terasa seperti aplikasi biasa.
2. Sebagai pengguna, saya ingin tetap bisa mencatat pengeluaran di tempat tanpa sinyal, lalu tersinkron sendiri nanti.
3. Sebagai pengguna, saya ingin diingatkan sehari sebelum tagihan kos jatuh tempo.

### User stories

1. Sebagai pengguna, saya ingin mencatat pengeluaran dengan nominal, kategori, akun, dan catatan agar tahu ke mana uang saya pergi.
2. Sebagai pengguna, saya ingin memindahkan uang antar akun (misalnya bank ke e-wallet) tanpa tercatat sebagai pengeluaran.
3. Sebagai pengguna, saya ingin menetapkan anggaran makan Rp2.000.000 per bulan dan diberi peringatan saat terpakai 80%.
4. Sebagai pengguna, saya ingin melihat laporan bulan lalu untuk mengetahui kategori pengeluaran terbesar.
5. Sebagai pengguna, saya ingin mengekspor data ke CSV sebagai cadangan atau untuk diolah di Excel.

### Kebutuhan non-fungsional

- Mata uang Rupiah (IDR), format Rp1.234.567, zona waktu Asia/Jakarta.
- Nominal disimpan sebagai bilangan bulat (rupiah) agar tidak ada galat pembulatan.
- Halaman utama tampil di bawah 2 detik di HP dengan koneksi 4G.
- Tampilan mobile-first; form transaksi bisa diisi dengan satu tangan.
- Password di-hash (argon2/bcrypt), seluruh akses lewat HTTPS.
- Backup otomatis database minimal sekali sehari.

### Metrik keberhasilan

- Kedua pengguna mencatat transaksi minimal 5 hari per minggu selama bulan pertama.
- Selisih saldo aplikasi dengan saldo nyata di bank kurang dari 1% saat dicek akhir bulan.

### Roadmap

1. Fase 1 — MVP: login, akun, transaksi, kategori, dashboard.
2. Fase 2 — Kontrol: anggaran, laporan, filter, ekspor CSV, import mutasi BRI (CSV dan PDF), kalender keuangan, perencanaan pembelian, PWA yang bisa dipasang di HP.
3. Fase 3 — Otomatisasi: transaksi berulang, dompet bersama Rizki & Irfan, mode offline dan notifikasi push PWA.

## Rekomendasi database

Ya, SQLite bisa dan direkomendasikan. Untuk dua pengguna dengan ribuan hingga puluhan ribu transaksi per tahun, SQLite jauh di bawah batas kemampuannya. Satu syarat: aplikasi harus berjalan di server dengan disk permanen (VPS), atau memakai Turso jika ingin deploy di Vercel.

| Opsi | Cocok untuk | Kelebihan | Kekurangan |
| --- | --- | --- | --- |
| SQLite (file lokal) — **pilihan utama** | VPS / server rumah / Docker | Gratis, tanpa server DB, sangat cepat, backup = salin 1 file | Tidak bisa di Vercel/Netlify karena disk serverless tidak permanen |
| Turso (libSQL, kompatibel SQLite) | Deploy di Vercel | Sintaks dan skema sama dengan SQLite, ada paket gratis | Bergantung pada layanan pihak ketiga |
| PostgreSQL (Neon / Supabase) | Rencana jangka panjang dengan banyak pengguna | Fitur lengkap, concurrency tinggi | Berlebihan untuk 2 pengguna, perlu kelola server/layanan |

Saran praktis:

- Pakai Drizzle ORM. Kode yang sama bisa jalan di SQLite lokal maupun Turso, dan migrasi ke PostgreSQL nanti relatif mudah.
- Aktifkan mode WAL (`PRAGMA journal_mode=WAL`) agar baca dan tulis tidak saling mengunci.
- Aktifkan `PRAGMA foreign_keys=ON` di setiap koneksi.
- Untuk pengembangan lokal cukup file `data/keuangan.db`.

## System design

Arsitekturnya monolit sederhana: satu aplikasi Next.js dan satu file SQLite di satu VPS. Tidak ada API terpisah; halaman memanggil Server Actions yang langsung menulis ke database lewat Drizzle.

&#91;embedded content: arsitektur aplikasi · 1 server, 1 file database\]

Jika ingin deploy di Vercel, kotak VPS diganti Vercel dan file SQLite diganti Turso; kode aplikasi tetap sama.

### Tech stack

| Lapisan | Pilihan | Alasan |
| --- | --- | --- |
| Framework | Next.js (App Router) + TypeScript | Frontend dan backend dalam satu proyek |
| UI | Tailwind CSS + shadcn/ui | Komponen siap pakai, mudah dibuat responsif |
| Grafik | Recharts | Grafik laporan kategori dan tren |
| Form & validasi | React Hook Form + Zod | Skema validasi dipakai di client dan server |
| Auth | Auth.js (Credentials) | Login email + password, sesi via cookie |
| ORM | Drizzle ORM + better-sqlite3 | Ringan, type-safe, migrasi otomatis |
| Database | SQLite (atau Turso untuk Vercel) | Lihat bagian rekomendasi database |

### Struktur folder

```
src/
  app/
    (auth)/login/page.tsx
    (app)/dashboard/page.tsx
    (app)/transaksi/page.tsx
    (app)/akun/page.tsx
    (app)/anggaran/page.tsx
    (app)/laporan/page.tsx
    api/export/route.ts        # unduh CSV
  db/
    schema.ts                  # definisi tabel Drizzle
    index.ts                   # koneksi + PRAGMA WAL
    seed.ts                    # akun Rizki & Irfan, kategori bawaan
  lib/
    actions/                   # server actions per fitur
    auth.ts
    format.ts                  # format Rupiah & tanggal
    validators.ts              # skema Zod
drizzle/                       # file migrasi
data/keuangan.db               # file database (tidak di-commit)
```

### Skema database

Saldo akun tidak disimpan, tetapi dihitung dari saldo awal ditambah transaksi. Dengan begitu saldo tidak pernah selisih dengan riwayatnya.

```sql
CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE accounts (
  id              INTEGER PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  name            TEXT NOT NULL,              -- BCA, Dana, Tunai
  type            TEXT NOT NULL CHECK (type IN ('cash','bank','ewallet')),
  initial_balance INTEGER NOT NULL DEFAULT 0, -- dalam rupiah
  archived        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE categories (
  id      INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name    TEXT NOT NULL,
  kind    TEXT NOT NULL CHECK (kind IN ('income','expense')),
  icon    TEXT,
  color   TEXT
);

CREATE TABLE transactions (
  id            INTEGER PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  type          TEXT NOT NULL CHECK (type IN ('income','expense','transfer')),
  account_id    INTEGER NOT NULL REFERENCES accounts(id),
  to_account_id INTEGER REFERENCES accounts(id), -- hanya untuk transfer
  category_id   INTEGER REFERENCES categories(id), -- kosong untuk transfer
  amount        INTEGER NOT NULL CHECK (amount > 0),
  date          TEXT NOT NULL,               -- YYYY-MM-DD
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_tx_user_date ON transactions(user_id, date);

CREATE TABLE budgets (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  month       TEXT NOT NULL,                 -- YYYY-MM
  amount      INTEGER NOT NULL,
  UNIQUE (user_id, category_id, month)
);
```

Rumus saldo akun: saldo awal + pemasukan − pengeluaran − transfer keluar + transfer masuk.

### Server Actions & endpoint

| Fitur | Fungsi | Keterangan |
| --- | --- | --- |
| Transaksi | `createTransaction`, `updateTransaction`, `deleteTransaction` | Validasi Zod, cek akun milik pengguna |
| Akun | `createAccount`, `archiveAccount`, `getBalances` | Saldo dihitung dengan satu query SUM |
| Kategori | `createCategory`, `updateCategory` | Kategori bawaan dibuat saat seed |
| Anggaran | `setBudget`, `getBudgetProgress` | Persen terpakai per kategori per bulan |
| Laporan | `getMonthlySummary`, `getTrend` | Agregasi per kategori dan per bulan |
| Ekspor | `GET /api/export?from=&to=` | Route handler, hasil file CSV |

### Desain fitur tambahan

Ketiga fitur memakai database yang sama; hanya import BRI yang butuh library tambahan untuk membaca file.

**Tabel tambahan**

```sql
-- Import mutasi bank
CREATE TABLE import_batches (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  account_id  INTEGER NOT NULL REFERENCES accounts(id),
  bank        TEXT NOT NULL DEFAULT 'BRI',
  file_type   TEXT NOT NULL CHECK (file_type IN ('csv','pdf')),
  file_name   TEXT NOT NULL,
  period_from TEXT, period_to TEXT,
  rows_total  INTEGER NOT NULL, rows_imported INTEGER NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
ALTER TABLE transactions ADD COLUMN import_batch_id INTEGER REFERENCES import_batches(id);
ALTER TABLE transactions ADD COLUMN import_hash TEXT; -- hash tanggal+uraian+nominal+saldo
CREATE UNIQUE INDEX idx_tx_import_hash ON transactions(user_id, import_hash);

CREATE TABLE category_rules (  -- tebak kategori dari uraian
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  keyword     TEXT NOT NULL,    -- contoh: 'PLN', 'GOPAY'
  category_id INTEGER NOT NULL REFERENCES categories(id)
);

-- Kalender
CREATE TABLE recurring_bills (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  name        TEXT NOT NULL,    -- Listrik, Internet, Kos
  amount      INTEGER,
  category_id INTEGER REFERENCES categories(id),
  day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  active      INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE calendar_events (
  id      INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title   TEXT NOT NULL,
  date    TEXT NOT NULL,        -- YYYY-MM-DD
  amount  INTEGER,
  note    TEXT,
  done    INTEGER NOT NULL DEFAULT 0
);

-- Perencanaan pembelian
CREATE TABLE purchase_plans (
  id             INTEGER PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id),
  name           TEXT NOT NULL,
  target_price   INTEGER NOT NULL,
  target_date    TEXT,          -- YYYY-MM-DD
  priority       TEXT NOT NULL CHECK (priority IN ('high','medium','low')),
  url            TEXT,
  note           TEXT,
  status         TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','bought','cancelled')),
  transaction_id INTEGER REFERENCES transactions(id) -- terisi saat dibeli
);
CREATE TABLE plan_contributions (
  id      INTEGER PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES purchase_plans(id),
  amount  INTEGER NOT NULL,
  date    TEXT NOT NULL
);
```

**Alur import BRI**

1. Pengguna memilih akun BRI tujuan dan mengunggah file (maksimal 5 MB) di halaman `/import`.
2. Server mendeteksi tipe file. CSV dibaca dengan Papa Parse; PDF diekstrak teksnya dengan `unpdf` (pdf.js), lalu baris tabel dipecah dengan pola tanggal di awal baris.
3. Parser khusus BRI memetakan kolom template ke format standar: tanggal, uraian, debet, kredit, saldo. Format angka Indonesia (1.234.567,00) diubah ke bilangan bulat rupiah.
4. Setiap baris diberi `import_hash`; baris dengan hash yang sudah ada ditandai "sudah diimpor".
5. Kategori ditebak dari `category_rules`; baris tanpa kecocokan diberi kategori "Lainnya".
6. Pratinjau tampil ke pengguna. Setelah dikonfirmasi, semua baris disimpan dalam satu transaksi database bersama satu `import_batches`.
7. Satu batch bisa dibatalkan, yang menghapus semua transaksi dari batch tersebut.

File asli tidak disimpan di server setelah diproses, karena berisi data rekening. Jika PDF dari bank dilindungi password, form upload menyediakan kolom password yang hanya dipakai saat membaca file.

**Kalender dan perencanaan**

- Kalender tidak punya tabel transaksi sendiri. Isinya digabung dari `transactions` (total per hari), `recurring_bills` (jatuh tempo), `calendar_events`, dan `purchase_plans.target_date`.
- Komponen kalender: grid bulan buatan sendiri dengan Tailwind, atau library seperti `react-day-picker`.
- Kebutuhan tabungan per bulan dihitung saat dibaca, tidak disimpan, agar selalu sesuai sisa waktu.

| Fitur | Server Actions / endpoint |
| --- | --- |
| Import BRI | `parseBankFile` (pratinjau), `confirmImport`, `undoImport`, `createCategoryRule` |
| Kalender | `getCalendarMonth(month)`, `createEvent`, `createRecurringBill` |
| Perencanaan | `createPlan`, `addContribution`, `markPlanBought`, `getPlanProgress` |

Folder baru: `src/app/(app)/import`, `src/app/(app)/kalender`, `src/app/(app)/rencana`, dan `src/lib/importers/bri.ts` untuk parser BRI, agar bank lain bisa ditambahkan nanti dengan file parser terpisah.

### Desain PWA

PWA terdiri dari tiga bagian: manifest, service worker, dan antrean offline. Semuanya berjalan di aplikasi Next.js yang sama, dan HTTPS wajib aktif.

**Manifest** (`src/app/manifest.ts`, didukung bawaan Next.js App Router)

```ts
export default function manifest() {
  return {
    name: 'Rifan Finance',
    short_name: 'Rifan',
    description: 'Setiap rupiah tercatat, setiap tujuan tercapai',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F2F5F1',
    theme_color: '#0B4D3B',
    lang: 'id',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Catat Transaksi', url: '/transaksi/baru' },
      { name: 'Kalender', url: '/kalender' },
    ],
  };
}
```

Ikon dibuat dari logo dolar Rifan Finance; versi maskable diberi ruang aman di tepi agar tidak terpotong di Android. Untuk iPhone ditambah `apple-touch-icon` 180×180.

**Service worker** (Serwist, `@serwist/next`)

| Jenis permintaan | Strategi cache | Alasan |
| --- | --- | --- |
| File statis (JS, CSS, font, ikon) | Cache first | Jarang berubah, membuat aplikasi terbuka cepat |
| Halaman (dashboard, kalender, rencana) | Network first, cadangan cache | Data selalu terbaru saat online, tetap tampil saat offline |
| Data transaksi dan saldo | Network first, cache maksimal 1 hari | Data keuangan tidak boleh basi terlalu lama |
| Upload import BRI | Tidak di-cache | File mutasi bank bersifat sensitif |

**Antrean offline**

1. Saat offline, form transaksi menyimpan data ke IndexedDB (library `idb`) dengan `client_id` UUID.
2. Transaksi tampil di daftar dengan label "Menunggu sinkron".
3. Saat koneksi kembali (event `online` atau Background Sync bila didukung), antrean dikirim ke endpoint `POST /api/sync`.
4. Server menyimpan `client_id` di kolom unik sehingga pengiriman ulang tidak membuat transaksi dobel.

**Notifikasi push**

- Memakai Web Push dengan kunci VAPID dan library `web-push` di server.
- Langganan disimpan di tabel baru:

```sql
ALTER TABLE transactions ADD COLUMN client_id TEXT; -- UUID dari HP untuk sinkron offline
CREATE UNIQUE INDEX idx_tx_client_id ON transactions(user_id, client_id);

CREATE TABLE push_subscriptions (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

- Cron harian pukul 07.00 WIB memeriksa tagihan yang jatuh tempo besok, anggaran di atas 80%, dan target rencana pembelian, lalu mengirim notifikasi.

**Pengujian PWA**: cek manifest dan service worker di Chrome DevTools (tab Application), uji pasang di Android dan iPhone, dan uji mode pesawat untuk antrean offline.

### Keamanan

- Pendaftaran publik ditutup; akun Rizki dan Irfan Rifan dibuat lewat skrip seed.
- Setiap query wajib difilter `user_id` dari sesi, bukan dari input form.
- Password di-hash dengan argon2; login dibatasi 5 percobaan per 15 menit.
- Cookie sesi `httpOnly`, `secure`, `sameSite=lax`; seluruh akses lewat HTTPS.
- File database dan `.env` tidak masuk Git.

### Deployment

1. Sewa VPS kecil (1 vCPU, 1 GB RAM sudah cukup) dengan Ubuntu.
2. Jalankan aplikasi dengan Docker atau PM2 (`next build` lalu `next start`).
3. Simpan `data/keuangan.db` di volume permanen, bukan di dalam container.
4. Pasang Caddy sebagai reverse proxy untuk HTTPS otomatis dengan domain sendiri.
5. Jalankan `drizzle-kit migrate` setiap kali deploy versi baru.

Alternatif tanpa server: Vercel + Turso, dengan `DATABASE_URL` diarahkan ke Turso.

### Backup

- Cron harian pukul 02.00 WIB: `sqlite3 data/keuangan.db ".backup backups/keuangan-$(date +%F).db"`.
- Salin folder backup ke cloud storage (Google Drive atau Backblaze) dengan rclone.
- Simpan 30 backup terakhir; uji restore minimal sekali sebulan.
- Pengguna juga bisa mengekspor CSV kapan saja dari aplikasi.
