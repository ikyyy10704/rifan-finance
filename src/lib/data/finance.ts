import "server-only";
import { asc, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, users, type AccountType, type TxType } from "@/db/schema";
import { parsePrefs } from "@/lib/dashboard-widgets";
import { requireUser } from "@/lib/dal";
import { shiftMonth, thisMonth } from "@/lib/format";

export type AccountWithBalance = {
  id: number;
  name: string;
  type: AccountType;
  provider: string | null;
  accountNumber: string | null;
  initialBalance: number;
  archived: boolean;
  balance: number;
};

export type Category = {
  id: number;
  name: string;
  kind: "income" | "expense";
  icon: string | null;
  color: string | null;
  archived: boolean;
};

export type TxRow = {
  id: number;
  type: TxType;
  amount: number;
  date: string;
  note: string | null;
  accountId: number;
  accountName: string;
  toAccountId: number | null;
  toAccountName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
};

// Rumus PRD: saldo awal + pemasukan − pengeluaran − transfer keluar + transfer masuk.
export async function getAccounts(): Promise<AccountWithBalance[]> {
  const user = await requireUser();
  const rows = db.all<Omit<AccountWithBalance, "archived"> & { archived: number }>(sql`
    SELECT a.id, a.name, a.type, a.provider, a.account_number AS accountNumber,
      a.initial_balance AS initialBalance, a.archived,
      a.initial_balance + COALESCE((
        SELECT SUM(CASE
          WHEN t.type = 'income' AND t.account_id = a.id THEN t.amount
          WHEN t.type IN ('expense', 'transfer') AND t.account_id = a.id THEN -t.amount
          WHEN t.type = 'transfer' AND t.to_account_id = a.id THEN t.amount
          ELSE 0 END)
        FROM transactions t
        WHERE t.user_id = a.user_id AND (t.account_id = a.id OR t.to_account_id = a.id)
      ), 0) AS balance
    FROM accounts a
    WHERE a.user_id = ${user.id}
    ORDER BY a.archived, a.id`);
  return rows.map((r) => ({ ...r, archived: !!r.archived }));
}

export async function getCategories(): Promise<Category[]> {
  const user = await requireUser();
  return db
    .select({
      id: categories.id,
      name: categories.name,
      kind: categories.kind,
      icon: categories.icon,
      color: categories.color,
      archived: categories.archived,
    })
    .from(categories)
    .where(eq(categories.userId, user.id))
    .orderBy(asc(categories.kind), asc(categories.id))
    .all();
}

/** Total pengeluaran per kategori dalam satu bulan, terbesar dulu. */
export async function getCategorySpend(month = thisMonth()) {
  const user = await requireUser();
  return db.all<{ id: number; name: string; icon: string | null; color: string | null; total: number }>(sql`
    SELECT c.id, c.name, c.icon, c.color, SUM(t.amount) AS total
    FROM transactions t JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ${user.id} AND t.type = 'expense' AND substr(t.date, 1, 7) = ${month}
    GROUP BY c.id ORDER BY total DESC`);
}

export async function getDashboardPrefs() {
  const user = await requireUser();
  const row = db.select({ prefs: users.dashboardPrefs }).from(users).where(eq(users.id, user.id)).get();
  return parsePrefs(row?.prefs);
}

export async function getMonthTotals(month = thisMonth()) {
  const user = await requireUser();
  const row = db.get<{ income: number; expense: number }>(sql`
    SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS income,
           COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense
    FROM transactions WHERE user_id = ${user.id} AND substr(date, 1, 7) = ${month}`);
  return row ?? { income: 0, expense: 0 };
}

/** Pemasukan dan pengeluaran per bulan, `count` bulan terakhir termasuk bulan ini. */
export async function getCashflow(count = 6) {
  const user = await requireUser();
  const last = thisMonth();
  const first = shiftMonth(last, -(count - 1));
  const rows = db.all<{ month: string; income: number; expense: number }>(sql`
    SELECT substr(date, 1, 7) AS month,
           COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS income,
           COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense
    FROM transactions
    WHERE user_id = ${user.id} AND substr(date, 1, 7) BETWEEN ${first} AND ${last}
    GROUP BY month`);
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  return Array.from({ length: count }, (_, i) => {
    const month = shiftMonth(first, i);
    return byMonth.get(month) ?? { month, income: 0, expense: 0 };
  });
}

type TxFilter = { month?: string; accountId?: number; q?: string; limit?: number };

export async function getTransactions({ month, accountId, q, limit }: TxFilter = {}): Promise<TxRow[]> {
  const user = await requireUser();
  const where = [sql`t.user_id = ${user.id}`];
  if (month) where.push(sql`substr(t.date, 1, 7) = ${month}`);
  if (accountId) where.push(sql`(t.account_id = ${accountId} OR t.to_account_id = ${accountId})`);
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    where.push(sql`(t.note LIKE ${like} ESCAPE '\\' OR c.name LIKE ${like} ESCAPE '\\')`);
  }
  return db.all<TxRow>(sql`
    SELECT t.id, t.type, t.amount, t.date, t.note,
           t.account_id AS accountId, a.name AS accountName,
           t.to_account_id AS toAccountId, ta.name AS toAccountName,
           t.category_id AS categoryId, c.name AS categoryName, c.icon AS categoryIcon, c.color AS categoryColor
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    LEFT JOIN accounts ta ON ta.id = t.to_account_id
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE ${sql.join(where, sql` AND `)}
    ORDER BY t.date DESC, t.id DESC
    ${limit ? sql`LIMIT ${limit}` : sql``}`);
}
