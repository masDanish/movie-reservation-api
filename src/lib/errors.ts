import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z, ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string = "ERROR",
    public details?: unknown
  ) {
    super(message);
  }
}

function errorBody(code: string, message: string, details?: unknown) {
  return { error: { code, message, ...(details ? { details } : {}) } };
}

export function toErrorResponse(e: unknown): NextResponse {
  if (e instanceof AppError) {
    return NextResponse.json(errorBody(e.code, e.message, e.details), { status: e.status });
  }

  if (e instanceof ZodError) {
    const details = e.issues.map((i) => ({
      path: i.path.map(String).join("."),
      message: i.message,
    }));
    return NextResponse.json(errorBody("VALIDATION_ERROR", "Input tidak valid", details), {
      status: 400,
    });
  }

  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      return NextResponse.json(errorBody("DUPLICATE", "Data sudah ada (duplikat)"), { status: 409 });
    }
    if (e.code === "P2025") {
      return NextResponse.json(errorBody("NOT_FOUND", "Data tidak ditemukan"), { status: 404 });
    }
    if (e.code === "P2003") {
      return NextResponse.json(
        errorBody("IN_USE", "Data masih dipakai oleh data lain"),
        { status: 409 }
      );
    }
  }

  console.error(e);
  return NextResponse.json(errorBody("INTERNAL_ERROR", "Terjadi kesalahan pada server"), {
    status: 500,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ctx<P = any> = { params: Promise<P> };

/** Membungkus handler agar semua error otomatis menjadi respons JSON seragam. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function route<P = any>(
  handler: (req: NextRequest, ctx: Ctx<P>) => Promise<Response>
) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      return toErrorResponse(e);
    }
  };
}

export async function parseJson<S extends z.ZodType>(
  req: NextRequest,
  schema: S
): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError(400, "Body harus berupa JSON yang valid", "INVALID_JSON");
  }
  return schema.parse(body);
}

export function parseQuery<S extends z.ZodType>(req: NextRequest, schema: S): z.infer<S> {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams));
}