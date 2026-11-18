import { NextResponse } from "next/server";
import { route, parseJson, parseQuery } from "@/src/lib/errors";
import { requireAdmin } from "@/src/lib/auth";
import { createMovieSchema, listMoviesQuery } from "@/src/modules/movies/movies.schema";
import { createMovie, listMovies } from "@/src/modules/movies/movies.service";

// Publik: GET /api/movies?genre=Action&q=galaxy&page=1&limit=10
export const GET = route(async (req) => {
  const query = parseQuery(req, listMoviesQuery);
  return NextResponse.json(await listMovies(query));
});

// Admin
export const POST = route(async (req) => {
  await requireAdmin(req);
  const body = await parseJson(req, createMovieSchema);
  return NextResponse.json(await createMovie(body), { status: 201 });
});