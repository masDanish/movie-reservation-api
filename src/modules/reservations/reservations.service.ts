import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { AppError } from "@/src/lib/errors";
import type { AuthUser } from "@/src/lib/auth";
import { getStripe } from "@/src/modules/payments/stripe";
import type { CreateReservationInput } from "./reservations.schema";

export const HOLD_MINUTES = 15;

const reservationInclude = {
  showtime: {
    select: {
      startsAt: true,
      price: true,
      movie: { select: { id: true, title: true } },
      auditorium: { select: { name: true, theater: { select: { name: true, city: true } } } },
    },
  },
  tickets: { include: { seat: { select: { row: true, number: true } } } },
  payment: { select: { status: true } },
} satisfies Prisma.ReservationInclude;

/**
 * Reservasi PENDING yang lewat expiresAt diubah jadi EXPIRED dan tiketnya
 * dihapus, sehingga kursi bebas lagi. Dipanggil "malas" (lazy) sebelum
 * operasi yang bergantung pada ketersediaan kursi.
 */
export async function expireStaleReservations(): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const stale = await tx.reservation.findMany({
      where: { status: "PENDING", expiresAt: { lt: new Date() } },
      select: { id: true },
    });
    if (stale.length === 0) return 0;

    const ids = stale.map((r) => r.id);
    await tx.ticket.deleteMany({ where: { reservationId: { in: ids } } });
    await tx.reservation.updateMany({
      where: { id: { in: ids }, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    return ids.length;
  });
}

export async function createReservation(userId: string, input: CreateReservationInput) {
  await expireStaleReservations();

  const showtime = await prisma.showtime.findUnique({ where: { id: input.showtimeId } });
  if (!showtime) throw new AppError(404, "Jadwal tayang tidak ditemukan", "NOT_FOUND");
  if (showtime.startsAt <= new Date()) {
    throw new AppError(400, "Jadwal tayang sudah dimulai", "SHOWTIME_STARTED");
  }

  // Semua kursi harus milik studio jadwal ini
  const seats = await prisma.seat.findMany({
    where: { id: { in: input.seatIds }, auditoriumId: showtime.auditoriumId },
  });
  if (seats.length !== input.seatIds.length) {
    throw new AppError(400, "Ada kursi yang tidak valid untuk studio ini", "INVALID_SEATS");
  }

  const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);

  try {
    // Nested create = satu transaksi atomik. Jika ada kursi yang sudah punya
    // tiket di jadwal ini, constraint UNIQUE(showtimeId, seatId) menolak semuanya.
    return await prisma.reservation.create({
      data: {
        userId,
        showtimeId: showtime.id,
        expiresAt,
        tickets: {
          create: seats.map((seat) => ({
            showtimeId: showtime.id,
            seatId: seat.id,
            price: showtime.price,
          })),
        },
      },
      include: reservationInclude,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new AppError(
        409,
        "Satu atau lebih kursi baru saja dipesan orang lain. Silakan pilih kursi lain.",
        "SEAT_TAKEN"
      );
    }
    throw e;
  }
}

export async function listMyReservations(userId: string) {
  await expireStaleReservations();
  return prisma.reservation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: reservationInclude,
  });
}

export async function getReservation(user: AuthUser, id: string) {
  await expireStaleReservations();
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: reservationInclude,
  });
  // 404 (bukan 403) agar tidak membocorkan keberadaan reservasi orang lain
  if (!reservation || (user.role !== "ADMIN" && reservation.userId !== user.id)) {
    throw new AppError(404, "Reservasi tidak ditemukan", "NOT_FOUND");
  }
  return reservation;
}

export async function cancelReservation(user: AuthUser, id: string) {
  const r = await prisma.reservation.findUnique({
    where: { id },
    include: { showtime: true, payment: true },
  });
  if (!r || (user.role !== "ADMIN" && r.userId !== user.id)) {
    throw new AppError(404, "Reservasi tidak ditemukan", "NOT_FOUND");
  }
  if (r.status !== "PENDING" && r.status !== "CONFIRMED") {
    throw new AppError(409, `Reservasi berstatus ${r.status} tidak bisa dibatalkan`, "INVALID_STATUS");
  }
  if (r.showtime.startsAt <= new Date()) {
    throw new AppError(400, "Jadwal tayang sudah dimulai, tidak bisa dibatalkan", "SHOWTIME_STARTED");
  }

  const wasPaid = r.payment?.status === "PAID";
  if (wasPaid && r.payment?.stripePaymentIntentId) {
    await getStripe().refunds.create({ payment_intent: r.payment.stripePaymentIntentId });
  }

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.ticket.deleteMany({ where: { reservationId: id } }),
    prisma.reservation.update({ where: { id }, data: { status: "CANCELLED" } }),
  ];
  if (r.payment) {
    ops.push(
      prisma.payment.update({
        where: { id: r.payment.id },
        data: { status: wasPaid ? "REFUNDED" : "FAILED" },
      })
    );
  }
  await prisma.$transaction(ops);

  return { id, status: "CANCELLED" as const, refunded: wasPaid };
}