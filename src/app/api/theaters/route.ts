import { NextResponse } from "next/server";
import { route, parseJson } from "@/src/lib/errors";
import { requireAdmin } from "@/src/lib/auth";
import { createTheaterSchema } from "@/src/modules/theaters/theaters.schema";
import { createTheater, listTheaters } from "@/src/modules/theaters/theaters.service";

export const GET = route(async () => {
  return NextResponse.json(await listTheaters());
});

export const POST = route(async (req) => {
  await requireAdmin(req);
  const body = await parseJson(req, createTheaterSchema);
  return NextResponse.json(await createTheater(body), { status: 201 });
});