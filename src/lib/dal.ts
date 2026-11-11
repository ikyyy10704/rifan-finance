import "server-only";
import { redirect } from "next/navigation";
import { readSession } from "./session";

// Pengecekan sesi yang sebenarnya. proxy.ts hanya melihat ada tidaknya cookie.
// Akun baru dari Google diarahkan ke /mulai sampai langkah perkenalannya selesai.
export async function requireUser() {
  const user = await requireSignedIn();
  if (user.setupStep !== null) redirect("/mulai");
  return user;
}

/** Sesi valid tanpa syarat perkenalan selesai. Hanya untuk halaman dan action di /mulai. */
export async function requireSignedIn() {
  const user = await readSession();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
