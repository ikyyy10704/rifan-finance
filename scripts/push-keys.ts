// Buat kunci VAPID untuk Web Push dan simpan ke .env.local (tidak masuk Git).
// Contoh: npm run push:keys -- --email anda@gmail.com
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { generateVAPIDKeys } from "web-push";

const { values } = parseArgs({ options: { email: { type: "string" }, force: { type: "boolean", default: false } } });
const file = ".env.local";
const current = existsSync(file) ? readFileSync(file, "utf8") : "";

if (/^VAPID_PRIVATE_KEY=/m.test(current) && !values.force) {
  console.log("Kunci VAPID sudah ada di .env.local. Pakai --force untuk membuat ulang (perangkat harus mengaktifkan notifikasi lagi).");
  process.exit(0);
}

const keys = generateVAPIDKeys();
const subject = values.email ? `mailto:${values.email}` : "mailto:admin@example.com";
const kept = current
  .split(/\r?\n/)
  .filter((l) => !/^VAPID_(PUBLIC_KEY|PRIVATE_KEY|SUBJECT)=/.test(l))
  .join("\n")
  .trim();
const block = `# Web Push (dibuat oleh npm run push:keys)\nVAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\nVAPID_SUBJECT=${subject}\n`;
writeFileSync(file, (kept ? kept + "\n\n" : "") + block);
console.log(`Kunci VAPID disimpan di ${file}. Nyalakan ulang server (npm run dev / npm run start) agar terbaca.`);
if (!values.email) console.log("Saran: jalankan lagi dengan --email <email Anda> --force; beberapa layanan push (Apple) menolak alamat contoh.");
