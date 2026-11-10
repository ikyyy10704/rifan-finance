// Contoh: npm run user:create -- --username rizki --name "Rizki" --role admin
// Password ditanyakan tanpa ditampilkan. Untuk otomasi bisa lewat env USER_PASSWORD.
import { hash } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { createDb } from "../src/db/client";
import { seedDefaultCategories } from "../src/db/defaults";
import { users } from "../src/db/schema";
import { newUserSchema } from "../src/lib/validators";

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const out = rl as unknown as { _writeToOutput: (s: string) => void };
    let muted = false;
    out._writeToOutput = (s) => {
      if (!muted || s.includes(question)) process.stdout.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      username: { type: "string" },
      name: { type: "string" },
      role: { type: "string", default: "user" },
    },
  });

  let password = process.env.USER_PASSWORD ?? "";
  if (!password) {
    password = await askHidden("Password: ");
    const again = await askHidden("Ulangi password: ");
    if (password !== again) throw new Error("Password tidak sama.");
  }

  const input = newUserSchema.safeParse({
    username: values.username,
    name: values.name ?? values.username,
    role: values.role,
    password,
  });
  if (!input.success) {
    throw new Error(input.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n"));
  }

  const db = createDb();
  const existing = db.select().from(users).where(eq(users.username, input.data.username)).get();
  if (existing) throw new Error(`Username "${input.data.username}" sudah dipakai.`);

  const passwordHash = await hash(input.data.password);
  const created = db
    .insert(users)
    .values({ username: input.data.username, name: input.data.name, role: input.data.role, passwordHash })
    .returning({ id: users.id })
    .get();
  seedDefaultCategories(db, created.id);
  console.log(`Akun dibuat: ${input.data.username} (${input.data.role})`);
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
