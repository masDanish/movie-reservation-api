import { NextResponse } from "next/server";
import { route } from "@/src/lib/errors";
import { getSeatAvailability } from "@/src/modules/movies/showtimes.service";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  const { id } = await params;
  return NextResponse.json(await getSeatAvailability(id));
});