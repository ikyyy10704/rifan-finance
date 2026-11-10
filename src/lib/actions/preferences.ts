"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { WIDGETS, type DashboardPrefs } from "@/lib/dashboard-widgets";

export async function saveDashboardPrefs(prefs: DashboardPrefs) {
  const user = await requireUser();
  // Hanya id widget yang dikenal dan nilai boolean yang disimpan.
  const clean = Object.fromEntries(WIDGETS.map((w) => [w.id, prefs[w.id] === true]));
  db.update(users).set({ dashboardPrefs: JSON.stringify(clean) }).where(eq(users.id, user.id)).run();
  refresh();
}
