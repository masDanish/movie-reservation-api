import bcrypt from "bcrypt";
import { prisma } from "@/src/lib/prisma";
import { AppError } from "@/src/lib/errors";
import { signToken } from "@/src/lib/auth";
import type { LoginInput, RegisterInput } from "./auth.schema";

const BCRYPT_ROUNDS = 10;

export async function register(input: RegisterInput) {
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw new AppError(409, "Email sudah terdaftar", "EMAIL_TAKEN");

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  // Role selalu USER. Admin hanya dibuat lewat seed/database, tidak lewat API publik.
  const user = await prisma.user.create({
    data: { email: input.email, passwordHash },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  const token = await signToken({ id: user.id, role: user.role });
  return { user, token };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Pesan sama untuk email salah / password salah (tidak membocorkan email terdaftar)
  const invalid = new AppError(401, "Email atau password salah", "INVALID_CREDENTIALS");
  if (!user) throw invalid;

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw invalid;

  const token = await signToken({ id: user.id, role: user.role });
  return {
    user: { id: user.id, email: user.email, role: user.role },
    token,
  };
}