import { NextResponse } from "next/server";
import { route } from "@/src/lib/errors";
import { requireAuth } from "@/src/lib/auth";
import { cancelReservation, getReservation } from "@/src/modules/reservations/reservations.service";

export const GET = route<{ id: string }>(async (req, { params }) => {
  const user = await requireAuth(req);
  const { id } = await params;
  return NextResponse.json(await getReservation(user, id));
});

export const DELETE = route<{ id: string }>(async (req, { params }) => {
  const user = await requireAuth(req);
  const { id } = await params;
  return NextResponse.json(await cancelReservation(user, id));
});