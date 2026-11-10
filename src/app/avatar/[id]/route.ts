import { eq } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/db";
import { users } from "@/db/schema";
import { AVATAR_DIR, isSafeAvatarName } from "@/lib/avatar";
import { readSession } from "@/lib/session";

// Foto profil hanya untuk pengguna yang sudah login (admin melihat foto semua akun di Kelola Pengguna).
export async function GET(_req: Request, ctx: RouteContext<"/avatar/[id]">) {
  if (!(await readSession())) return new Response(null, { status: 401 });

  const { id } = await ctx.params;
  const row = db.select({ avatar: users.avatar }).from(users).where(eq(users.id, Number(id))).get();
  if (!row?.avatar || !isSafeAvatarName(row.avatar)) return new Response(null, { status: 404 });

  try {
    const body = await readFile(join(AVATAR_DIR, row.avatar));
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": "image/webp",
        // URL memuat ?v=<nama file>, jadi aman di-cache; foto baru = URL baru.
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
