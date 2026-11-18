import { NextResponse } from "next/server";
import { route, parseJson, parseQuery } from "@/src/lib/errors";
import { requireAdmin } from "@/src/lib/auth";
import { createShowtimeSchema, listShowtimesQuery } from "@/src/modules/movies/movies.schema";
import { createShowtime, listShowtimes } from "@/src/modules/movies/showtimes.service";

// Publik: GET /api/showtimes?movieId=...&theaterId=...&from=2026-12-01
export const GET = route(async (req) => {
  const query = parseQuery(req, listShowtimesQuery);
  return NextResponse.json(await listShowtimes(query));
});

// Admin
export const POST = route(async (req) => {
  await requireAdmin(req);
  const body = await parseJson(req, createShowtimeSchema);
  return NextResponse.json(await createShowtime(body), { status: 201 });
});