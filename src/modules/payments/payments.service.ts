import type Stripe from "stripe";
import { prisma } from "@/src/lib/prisma";
import { AppError } from "@/src/lib/errors";
import type { AuthUser } from "@/src/lib/auth";
import { expireStaleReservations } from "@/src/modules/reservations/reservations.service";
import { getStripe } from "./stripe";

const CURRENCY = process.env.STRIPE_CURRENCY ?? "idr";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export async function createCheckoutSession(user: AuthUser, reservationId: string) {
  await expireStaleReservations();

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { tickets: true, showtime: { include: { movie: true } } },
  });
  if (!reservation || reservation.userId !== user.id) {
    throw new AppError(404, "Reservasi tidak ditemukan", "NOT_FOUND");
  }
  if (reservation.status !== "PENDING") {
    throw new AppError(
      409,
      `Reservasi berstatus ${reservation.status}, tidak bisa dibayar`,
      "INVALID_STATUS"
    );
  }

  const quantity = reservation.tickets.length;
  const unitPrice = reservation.tickets[0].price;

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    client_reference_id: reservation.id,
    metadata: { reservationId: reservation.id },
    line_items: [
      {
        quantity,
        price_data: {
          currency: CURRENCY,
          // Stripe memperlakukan IDR sebagai mata uang 2 desimal, jadi dikali 100.
          // Jika akun Stripe-mu tidak mendukung IDR, ganti STRIPE_CURRENCY ke "usd"
          // dan sesuaikan harga di database.
          unit_amount: unitPrice * 100,
          product_data: { name: `Tiket ${reservation.showtime.movie.title}` },
        },
      },
    ],
    // URL ini placeholder untuk frontend. Karena project ini hanya backend,
    // halamannya boleh 404; yang penting webhook-nya bekerja.
    success_url: `${APP_URL}/payment/success?reservationId=${reservation.id}`,
    cancel_url: `${APP_URL}/payment/cancel?reservationId=${reservation.id}`,
  });

  if (!session.url) throw new AppError(502, "Stripe tidak mengembalikan URL checkout", "STRIPE_ERROR");

  // upsert: jika user memulai checkout lagi, session lama diganti yang baru
  await prisma.payment.upsert({
    where: { reservationId: reservation.id },
    create: { reservationId: reservation.id, stripeSessionId: session.id, status: "PENDING" },
    update: { stripeSessionId: session.id, status: "PENDING" },
  });

  return { checkoutUrl: session.url, sessionId: session.id };
}

/** Dipanggil dari webhook saat Stripe memberi tahu pembayaran berhasil. */
export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;

  const payment = await prisma.payment.findUnique({
    where: { stripeSessionId: session.id },
    include: { reservation: true },
  });
  if (!payment) return;

  // Idempotent: Stripe bisa mengirim event yang sama berkali-kali
  if (payment.status === "PAID" || payment.status === "REFUNDED") return;

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  if (payment.reservation.status === "PENDING") {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: "PAID", stripePaymentIntentId: paymentIntentId },
      }),
      prisma.reservation.update({
        where: { id: payment.reservationId },
        data: { status: "CONFIRMED" },
      }),
    ]);
    return;
  }

  // Pembayaran terlambat (reservasi sudah EXPIRED/CANCELLED): kembalikan uang
  if (paymentIntentId) {
    await getStripe().refunds.create({ payment_intent: paymentIntentId });
  }
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "REFUNDED", stripePaymentIntentId: paymentIntentId },
  });
}

export async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  await prisma.payment.updateMany({
    where: { stripeSessionId: session.id, status: "PENDING" },
    data: { status: "FAILED" },
  });
}