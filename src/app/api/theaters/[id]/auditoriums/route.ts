import { NextResponse } from "next/server";
import { route, parseJson } from "@/src/lib/errors";
import { requireAdmin } from "@/src/lib/auth";
import { createAuditoriumSchema } from "@/src/modules/theaters/theaters.schema";
import { createAuditorium } from "@/src/modules/theaters/theaters.service";

export const POST = route<{ id: string }>(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;
  const body = await parseJson(req, createAuditoriumSchema);
  return NextResponse.json(await createAuditorium(id, body), { status: 201 });
});