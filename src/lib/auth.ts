import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { AppError } from "./errors";

export type AuthUser = { id: string; role: Role };

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET belum diset di .env");
  return new TextEncoder().encode(secret);
}

export async function signToken(user: AuthUser): Promise<string> {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function requireAuth(req: NextRequest): Promise<AuthUser> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "Token tidak ditemukan", "UNAUTHORIZED");
  }

  try {
    const { payload } = await jwtVerify(header.slice(7), getSecret());
    const role = payload.role;
    if (!payload.sub || (role !== "USER" && role !== "ADMIN")) {
      throw new Error("payload tidak valid");
    }
    return { id: payload.sub, role };
  } catch {
    throw new AppError(401, "Token tidak valid atau sudah kedaluwarsa", "UNAUTHORIZED");
  }
}

export async function requireAdmin(req: NextRequest): Promise<AuthUser> {
  const user = await requireAuth(req);
  if (user.role !== "ADMIN") {
    throw new AppError(403, "Hanya admin yang boleh mengakses ini", "FORBIDDEN");
  }
  return user;
}