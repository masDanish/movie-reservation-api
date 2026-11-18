import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

function at(daysFromNow: number, hour: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function createAuditorium(theaterId: string, name: string, rows: number, perRow: number) {
  const auditorium = await prisma.auditorium.create({ data: { theaterId, name } });
  const seats = [];
  for (let r = 0; r < rows; r++) {
    for (let n = 1; n <= perRow; n++) {
      seats.push({ auditoriumId: auditorium.id, row: String.fromCharCode(65 + r), number: n });
    }
  }
  await prisma.seat.createMany({ data: seats });
  return auditorium;
}

async function main() {
  // PERINGATAN: menghapus semua data. Hanya untuk development.
  await prisma.ticket.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.showtime.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.auditorium.deleteMany();
  await prisma.theater.deleteMany();
  await prisma.movie.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.user.deleteMany();

  // --- Users ---
  await prisma.user.create({
    data: {
      email: "admin@example.com",
      passwordHash: await bcrypt.hash("Admin123!", 10),
      role: "ADMIN",
    },
  });
  await prisma.user.create({
    data: {
      email: "user@example.com",
      passwordHash: await bcrypt.hash("User12345!", 10),
      role: "USER",
    },
  });

  // --- Theater & studio ---
  const theater = await prisma.theater.create({
    data: { name: "Cinema Central", city: "Jakarta" },
  });
  const studioA = await createAuditorium(theater.id, "Studio 1", 5, 8);
  const studioB = await createAuditorium(theater.id, "Studio 2", 4, 6);

  // --- Movies (dibuat berurutan agar genre tidak balapan) ---
  const movieData = [
    { title: "Galaxy Runner", durationMinutes: 120, genres: ["Sci-Fi", "Action"] },
    { title: "Laugh Out Loud", durationMinutes: 105, genres: ["Comedy"] },
    { title: "The Last Harbor", durationMinutes: 148, genres: ["Drama"] },
    { title: "Night Whisper", durationMinutes: 95, genres: ["Horror", "Thriller"] },
  ];
  const movies = [];
  for (const m of movieData) {
    const movie = await prisma.movie.create({
      data: {
        title: m.title,
        description: `Film contoh: ${m.title}`,
        durationMinutes: m.durationMinutes,
        genres: {
          connectOrCreate: m.genres.map((name) => ({ where: { name }, create: { name } })),
        },
      },
    });
    movies.push(movie);
  }

  // --- Showtimes: 3 hari ke depan, 3 slot per hari per studio ---
  const hours = [12, 15, 18];
  for (let day = 1; day <= 3; day++) {
    for (let slot = 0; slot < hours.length; slot++) {
      await prisma.showtime.create({
        data: {
          movieId: movies[(day + slot) % movies.length].id,
          auditoriumId: studioA.id,
          startsAt: at(day, hours[slot]),
          price: 50000,
        },
      });
      await prisma.showtime.create({
        data: {
          movieId: movies[(day + slot + 1) % movies.length].id,
          auditoriumId: studioB.id,
          startsAt: at(day, hours[slot]),
          price: 45000,
        },
      });
    }
  }

  console.log("Seed selesai.");
  console.log("Admin : admin@example.com / Admin123!");
  console.log("User  : user@example.com / User12345!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());