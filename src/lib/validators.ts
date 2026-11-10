import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._]{3,32}$/, "Username 3 sampai 32 karakter: huruf kecil, angka, titik, atau garis bawah.");

export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, "Isi username."),
  password: z.string().min(1, "Isi password."),
});

export const newUserSchema = z.object({
  username: usernameSchema,
  name: z.string().trim().min(1, "Isi nama.").max(60),
  password: z.string().min(8, "Password minimal 8 karakter."),
  role: z.enum(["admin", "user"]),
});
