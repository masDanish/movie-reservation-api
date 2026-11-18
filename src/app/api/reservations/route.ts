import { NextResponse } from "next/server";
import { route, parseJson } from "@/src/lib/errors";
import { requireAuth } from "@/src/lib/auth";
import { createReservationSchema } from "@/src/modules/reservations/reservations.schema";
import { createReservation, listMyReservations } from "@/src/modules/reservations/reservations.service";

export const GET = route(async (req) => {
  const user = await requireAuth(req);
  return NextResponse.json(await listMyReservations(user.id));
});

export const POST = route(async (req) => {
  const user = await requireAuth(req);
  const body = await parseJson(req, createReservationSchema);
  return NextResponse.json(await createReservation(user.id, body), { status: 201 });
});