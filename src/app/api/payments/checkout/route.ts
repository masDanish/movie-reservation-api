import { NextResponse } from "next/server";
import { z } from "zod";
import { route, parseJson } from "@/src/lib/errors";
import { requireAuth } from "@/src/lib/auth";
import { createCheckoutSession } from "@/src/modules/payments/payments.service";

const schema = z.object({ reservationId: z.string().min(1) });

export const POST = route(async (req) => {
  const user = await requireAuth(req);
  const { reservationId } = await parseJson(req, schema);
  return NextResponse.json(await createCheckoutSession(user, reservationId));
});