import "server-only";
import { redirect } from "next/navigation";
import { readSession } from "./session";

// Pengecekan sesi yang sebenarnya. proxy.ts hanya melihat ada tidaknya cookie.
export async function requireUser() {
  const user = await readSession();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
