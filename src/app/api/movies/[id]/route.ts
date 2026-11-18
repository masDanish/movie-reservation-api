import { NextResponse } from "next/server";
import { route, parseJson } from "@/src/lib/errors";
import { requireAdmin } from "@/src/lib/auth";
import { updateMovieSchema } from "@/src/modules/movies/movies.schema";
import { deleteMovie, getMovie, updateMovie } from "@/src/modules/movies/movies.service";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  const { id } = await params;
  return NextResponse.json(await getMovie(id));
});

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;
  const body = await parseJson(req, updateMovieSchema);
  return NextResponse.json(await updateMovie(id, body));
});

export const DELETE = route<{ id: string }>(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;
  await deleteMovie(id);
  return new NextResponse(null, { status: 204 });
});