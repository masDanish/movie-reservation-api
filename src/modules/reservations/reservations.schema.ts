import { z } from "zod";

export const MAX_SEATS_PER_RESERVATION = 6;

export const createReservationSchema = z
  .object({
    showtimeId: z.string().min(1),
    seatIds: z.array(z.string().min(1)).min(1).max(MAX_SEATS_PER_RESERVATION),
  })
  .refine((v) => new Set(v.seatIds).size === v.seatIds.length, {
    message: "seatIds tidak boleh duplikat",
    path: ["seatIds"],
  });

export type CreateReservationInput = z.infer<typeof createReservationSchema>;