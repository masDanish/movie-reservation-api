import { NextResponse } from "next/server";
import { route, parseJson } from "@/src/lib/errors";
import { loginSchema } from "@/src/modules/auth/auth.schema";
import { login } from "@/src/modules/auth/auth.service";

export const POST = route(async (req) => {
  const body = await parseJson(req, loginSchema);
  const result = await login(body);
  return NextResponse.json(result);
});