import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { AppError } from "@/src/lib/errors";
import type { CreateMovieInput, ListMoviesQuery, UpdateMovieInput } from "./movies.schema";

const genreConnect = (names: string[]) =>
  names.map((name) => ({ where: { name }, create: { name } }));

export async function listMovies({ genre, q, page, limit }: ListMoviesQuery) {
  const where: Prisma.MovieWhereInput = {
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    ...(genre
      ? { genres: { some: { name: { equals: genre, mode: "insensitive" } } } }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.movie.findMany({
      where,
      include: { genres: true },
      orderBy: { title: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.movie.count({ where }),
  ]);

  return {
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getMovie(id: string) {
  const movie = await prisma.movie.findUnique({
    where: { id },
    include: {
      genres: true,
      showtimes: {
        where: { startsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        include: {
          auditorium: { select: { id: true, name: true, theater: true } },
        },
      },
    },
  });
  if (!movie) throw new AppError(404, "Film tidak ditemukan", "NOT_FOUND");
  return movie;
}

export async function createMovie(input: CreateMovieInput) {
  const { genres, ...rest } = input;
  return prisma.movie.create({
    data: { ...rest, genres: { connectOrCreate: genreConnect(genres) } },
    include: { genres: true },
  });
}

export async function updateMovie(id: string, input: UpdateMovieInput) {
  const { genres, ...rest } = input;
  return prisma.movie.update({
    where: { id },
    data: {
      ...rest,
      ...(genres ? { genres: { set: [], connectOrCreate: genreConnect(genres) } } : {}),
    },
    include: { genres: true },
  });
}

export async function deleteMovie(id: string) {
  // Gagal dengan 409 (P2003) bila film masih punya jadwal tayang
  await prisma.movie.delete({ where: { id } });
}