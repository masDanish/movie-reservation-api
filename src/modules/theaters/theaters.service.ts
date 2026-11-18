import { prisma } from "@/src/lib/prisma";
import { AppError } from "@/src/lib/errors";
import type { CreateAuditoriumInput, CreateTheaterInput } from "./theaters.schema";

export async function listTheaters() {
  return prisma.theater.findMany({
    orderBy: { name: "asc" },
    include: {
      auditoriums: {
        select: { id: true, name: true, _count: { select: { seats: true } } },
      },
    },
  });
}

export async function createTheater(input: CreateTheaterInput) {
  return prisma.theater.create({ data: input });
}

/** Membuat studio sekaligus men-generate kursinya (A1..A8, B1..B8, dst). */
export async function createAuditorium(theaterId: string, input: CreateAuditoriumInput) {
  const theater = await prisma.theater.findUnique({ where: { id: theaterId } });
  if (!theater) throw new AppError(404, "Bioskop tidak ditemukan", "NOT_FOUND");

  return prisma.$transaction(async (tx) => {
    const auditorium = await tx.auditorium.create({
      data: { theaterId, name: input.name },
    });

    const seats: { auditoriumId: string; row: string; number: number }[] = [];
    for (let r = 0; r < input.rows; r++) {
      for (let n = 1; n <= input.seatsPerRow; n++) {
        seats.push({
          auditoriumId: auditorium.id,
          row: String.fromCharCode(65 + r),
          number: n,
        });
      }
    }
    await tx.seat.createMany({ data: seats });

    return { ...auditorium, totalSeats: seats.length };
  });
}