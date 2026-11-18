import { NextResponse } from "next/server";
import { route, parseJson } from "@/src/lib/errors";
import { registerSchema } from "@/src/modules/auth/auth.schema";
import { register } from "@/src/modules/auth/auth.service";

export const POST = route(async (req) => {
  const body = await parseJson(req, registerSchema);
  const result = await register(body);
  return NextResponse.json(result, { status: 201 });
});