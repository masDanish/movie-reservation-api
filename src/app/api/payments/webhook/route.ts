import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/src/modules/payments/stripe";
import {
  handleCheckoutCompleted,
  handleCheckoutExpired,
} from "@/src/modules/payments/payments.service";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Signature atau secret tidak ada" }, { status: 400 });
  }

  // Harus body mentah (text), bukan JSON, agar signature bisa diverifikasi
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Signature tidak valid" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "checkout.session.expired":
        await handleCheckoutExpired(event.data.object);
        break;
    }
  } catch (e) {
    console.error("Webhook gagal diproses", e);
    // 500 agar Stripe mencoba mengirim ulang
    return NextResponse.json({ error: "Gagal memproses event" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}