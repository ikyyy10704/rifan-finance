import "server-only";
import { createHash, randomBytes } from "node:crypto";

// Login Google (OpenID Connect, authorization code + PKCE) tanpa pustaka tambahan.
// id_token diambil langsung dari endpoint token Google lewat HTTPS dengan client secret,
// jadi isinya bisa dipercaya tanpa memeriksa tanda tangan (sesuai panduan Google).

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const OAUTH_COOKIE = "rf_oauth";
export const OAUTH_COOKIE_PATH = "/api/auth/google";

export const googleConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const b64url = (buf: Buffer) => buf.toString("base64url");

export function redirectUri(origin: string) {
  return `${process.env.APP_URL?.replace(/\/$/, "") ?? origin}/api/auth/google/callback`;
}

/** URL halaman pilih akun Google + nilai yang harus disimpan di cookie sampai callback. */
export function startGoogleLogin(origin: string) {
  const state = b64url(randomBytes(24));
  const nonce = b64url(randomBytes(24));
  const verifier = b64url(randomBytes(48));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return { url: url.toString(), cookie: JSON.stringify({ state, nonce, verifier }) };
}

export type GoogleProfile = { sub: string; email: string; name: string };

/** Tukar kode dari Google dengan profil. Null bila ada yang tidak cocok. */
export async function finishGoogleLogin(
  origin: string,
  code: string,
  saved: { nonce: string; verifier: string },
): Promise<GoogleProfile | null> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
      code_verifier: saved.verifier,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("[google] tukar kode gagal", res.status, await res.text());
    return null;
  }
  const { id_token } = (await res.json()) as { id_token?: string };
  const part = id_token?.split(".")[1];
  if (!part) return null;

  const c = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as {
    iss?: string;
    aud?: string;
    exp?: number;
    nonce?: string;
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };
  const issOk = c.iss === "https://accounts.google.com" || c.iss === "accounts.google.com";
  const fresh = typeof c.exp === "number" && c.exp * 1000 > Date.now();
  if (!issOk || c.aud !== process.env.GOOGLE_CLIENT_ID || !fresh || c.nonce !== saved.nonce) return null;
  if (!c.sub || !c.email || c.email_verified !== true) return null;
  return { sub: c.sub, email: c.email.toLowerCase(), name: (c.name ?? "").trim() || c.email.split("@")[0] };
}

/** Bila GOOGLE_ALLOWED_EMAILS diisi (dipisah koma), hanya email itu yang boleh membuat akun baru. */
export function emailAllowed(email: string) {
  const list = (process.env.GOOGLE_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.length === 0 || list.includes(email);
}
