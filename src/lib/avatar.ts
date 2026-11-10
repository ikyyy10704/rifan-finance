import "server-only";
import { randomBytes } from "node:crypto";
import sharp from "sharp";

// Foto disimpan di kolom users.avatar_data dan hanya dilayani lewat /avatar/[id] untuk pengguna yang sudah login.
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

/**
 * Validasi, potong persegi 256px, ubah ke WebP. sharp tidak menyalin metadata EXIF,
 * jadi lokasi GPS dari foto HP ikut terbuang.
 */
export async function processAvatar(file: File): Promise<{ data?: Buffer; version?: string; error?: string }> {
  if (!ACCEPTED.includes(file.type)) return { error: "Format foto harus JPG, PNG, atau WebP." };
  if (file.size > MAX_AVATAR_BYTES) return { error: "Ukuran foto maksimal 2 MB." };

  try {
    const data = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(256, 256, { fit: "cover" })
      .webp({ quality: 82 })
      .toBuffer();
    // Versi baru setiap unggah: dipakai di URL ?v= sehingga cache browser langsung berganti.
    return { data, version: randomBytes(8).toString("hex") };
  } catch {
    return { error: "File tidak bisa dibaca sebagai gambar." };
  }
}
