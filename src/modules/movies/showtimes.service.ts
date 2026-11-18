import { prisma } from "@/src/lib/prisma";
import { AppError } from "@/src/lib/errors";
import { expireStaleReservations } from "@/src/modules/reservations/reservations.service";
import type { CreateShowtimeInput, ListShowtimesQuery } from "./movies.schema";

const BUFFER_MINUTES = 15; // jeda bersih-bersih antar film
const MAX_LOOKBACK_MINUTES = 12 * 60;

const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);

export async function listShowtimes({ movieId, theaterId, from, to }: ListShowtimesQuery) {
  return prisma.showtime.findMany({
    where: {
      ...(movieId ? { movieId } : {}),
      ...(theaterId ? { auditorium: { theaterId } } : {}),
      startsAt: { gte: from ?? new Date(), ...(to ? { lte: to } : {}) },
    },
    orderBy: { startsAt: "asc" },
    include: {
      movie: { select: { id: true, title: true, durationMinutes: true } },
      auditorium: {
        select: { id: true, name: true, theater: { select: { id: true, name: true, city: true } } },
      },
    },
  });
}

export async function createShowtime(input: CreateShowtimeInput) {
  const [movie, auditorium] = await Promise.all([
    prisma.movie.findUnique({ where: { id: input.movieId } }),
    prisma.auditorium.findUnique({ where: { id: input.auditoriumId } }),
  ]);
  if (!movie) throw new AppError(404, "Film tidak ditemukan", "MOVIE_NOT_FOUND");
  if (!auditorium) throw new AppError(404, "Studio tidak ditemukan", "AUDITORIUM_NOT_FOUND");

  const start = input.startsAt;
  if (start <= new Date()) {
    throw new AppError(400, "Jadwal harus di masa depan", "INVALID_TIME");
  }
  const end = addMinutes(start, movie.durationMinutes + BUFFER_MINUTES);

  // Cek bentrok jadwal di studio yang sama
  const nearby = await prisma.showtime.findMany({
    where: {
      auditoriumId: input.auditoriumId,
      startsAt: { gte: addMinutes(start, -MAX_LOOKBACK_MINUTES), lt: end },
    },
    include: { movie: { select: { durationMinutes: true } } },
  });

  const conflict = nearby.some((s) => {
    const sEnd = addMinutes(s.startsAt, s.movie.durationMinutes + BUFFER_MINUTES);
    return s.startsAt < end && sEnd > start;
  });
  if (conflict) {
    throw new AppError(409, "Jadwal bentrok dengan jadwal lain di studio ini", "SHOWTIME_CONFLICT");
  }

  return prisma.showtime.create({ data: input });
}

export async function getSeatAvailability(showtimeId: string) {
  // Bebaskan dulu kursi dari reservasi yang sudah kedaluwarsa
  await expireStaleReservations();

  const showtime = await prisma.showtime.findUnique({
    where: { id: showtimeId },
    include: {
      movie: { select: { title: true } },
      auditorium: {
        include: { seats: { orderBy: [{ row: "asc" }, { number: "asc" }] } },
      },
      tickets: { select: { seatId: true } },
    },
  });
  if (!showtime) throw new AppError(404, "Jadwal tayang tidak ditemukan", "NOT_FOUND");

  const taken = new Set(showtime.tickets.map((t) => t.seatId));
  const seats = showtime.auditorium.seats.map((s) => ({
    id: s.id,
    row: s.row,
    number: s.number,
    status: taken.has(s.id) ? "TAKEN" : "AVAILABLE",
  }));

  return {
    showtimeId: showtime.id,
    movie: showtime.movie.title,
    startsAt: showtime.startsAt,
    price: showtime.price,
    summary: {
      total: seats.length,
      taken: taken.size,
      available: seats.length - taken.size,
    },
    seats,
  };
}