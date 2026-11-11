import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection, type NextRequest } from "next/server";
import { googleConfigured, OAUTH_COOKIE, OAUTH_COOKIE_PATH, startGoogleLogin } from "@/lib/google";

// Tombol "Masuk dengan Google" mengarah ke sini, lalu diteruskan ke halaman pilih akun Google.
export async function GET(request: NextRequest) {
  await connection(); // jangan dirender saat build: state dan cookie harus baru tiap permintaan
  if (!googleConfigured()) redirect("/login?google=belum-diatur");
  const { url, cookie } = startGoogleLogin(request.nextUrl.origin);
  (await cookies()).set(OAUTH_COOKIE, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // dikirim saat Google mengarahkan balik (navigasi GET biasa)
    path: OAUTH_COOKIE_PATH,
    maxAge: 600,
  });
  redirect(url);
}
