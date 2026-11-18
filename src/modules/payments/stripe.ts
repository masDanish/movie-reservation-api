import Stripe from "stripe";
import { AppError } from "@/src/lib/errors";

let client: Stripe | null = null;

/** Dibuat lazy supaya aplikasi tetap jalan walau Stripe belum dikonfigurasi. */
export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new AppError(500, "STRIPE_SECRET_KEY belum diset", "STRIPE_NOT_CONFIGURED");
    client = new Stripe(key);
  }
  return client;
}