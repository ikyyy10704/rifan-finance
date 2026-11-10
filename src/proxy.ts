import { NextResponse, type NextRequest } from "next/server";

// Pemeriksaan cepat berdasarkan cookie saja. Validasi sesi di database ada di src/lib/dal.ts.
const PROTECTED = ["/dashboard", "/transaksi", "/akun", "/anggaran", "/laporan", "/kalender", "/rencana", "/import", "/admin", "/profil", "/kategori", "/notifikasi"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isProtected && !request.cookies.has("rf_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|brand/|icons/|sw.js|manifest.webmanifest|favicon.ico).*)"],
};
