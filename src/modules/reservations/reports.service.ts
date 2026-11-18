import { prisma } from "@/src/lib/prisma";

export async function getReport(from?: Date, to?: Date) {
  const startsAt = {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
  const hasRange = Boolean(from || to);

  const revenue = await prisma.ticket.aggregate({
    where: {
      reservation: { status: "CONFIRMED" },
      ...(hasRange ? { showtime: { startsAt } } : {}),
    },
    _sum: { price: true },
    _count: { _all: true },
  });

  const showtimes = await prisma.showtime.findMany({
    where: hasRange ? { startsAt } : {},
    orderBy: { startsAt: "asc" },
    include: {
      movie: { select: { title: true } },
      auditorium: { select: { name: true, _count: { select: { seats: true } } } },
      _count: { select: { tickets: { where: { reservation: { status: "CONFIRMED" } } } } },
    },
  });

  return {
    totalRevenue: revenue._sum.price ?? 0,
    totalTicketsSold: revenue._count._all,
    showtimes: showtimes.map((s) => {
      const capacity = s.auditorium._count.seats;
      const sold = s._count.tickets;
      return {
        showtimeId: s.id,
        movie: s.movie.title,
        auditorium: s.auditorium.name,
        startsAt: s.startsAt,
        capacity,
        sold,
        occupancyPercent: capacity === 0 ? 0 : Math.round((sold / capacity) * 1000) / 10,
      };
    }),
  };
}