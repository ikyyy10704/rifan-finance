import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { readSession } from "@/lib/session";

// Foto profil hanya untuk pengguna yang sudah login (admin melihat foto semua akun di Kelola Pengguna).
export async function GET(_req: Request, ctx: RouteContext<"/avatar/[id]">) {
  if (!(await readSession())) return new Response(null, { status: 401 });

  const { id } = await ctx.params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) return new Response(null, { status: 404 });
  const [row] = await db.select({ data: users.avatarData }).from(users).where(eq(users.id, userId));
  if (!row?.data) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": "image/webp",
      // URL memuat ?v=<versi foto>, jadi aman di-cache; foto baru = URL baru.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
