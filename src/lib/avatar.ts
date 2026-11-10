import "server-only";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "sharp";

// Di luar public/: foto hanya dilayani lewat /avatar/[id] untuk pengguna yang sudah login.
export const AVATAR_DIR = join(process.cwd(), "data", "avatars");
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export const isSafeAvatarName = (name: string) => /^\d+-[a-f0-9]{16}\.webp$/.test(name);

/**
 * Validasi, potong persegi 256px, ubah ke WebP. sharp tidak menyalin metadata EXIF,
 * jadi lokasi GPS dari foto HP ikut terbuang.
 */
export async function saveAvatar(userId: number, file: File): Promise<{ name?: string; error?: string }> {
  if (!ACCEPTED.includes(file.type)) return { error: "Format foto harus JPG, PNG, atau WebP." };
  if (file.size > MAX_AVATAR_BYTES) return { error: "Ukuran foto maksimal 2 MB." };

  let out: Buffer;
  try {
    out = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(256, 256, { fit: "cover" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return { error: "File tidak bisa dibaca sebagai gambar." };
  }

  await mkdir(AVATAR_DIR, { recursive: true });
  const name = `${userId}-${randomBytes(8).toString("hex")}.webp`;
  await writeFile(join(AVATAR_DIR, name), out);
  return { name };
}

export async function deleteAvatarFile(name: string | null) {
  if (name && isSafeAvatarName(name)) await rm(join(AVATAR_DIR, name), { force: true });
}
