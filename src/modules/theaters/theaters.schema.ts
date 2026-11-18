import { z } from "zod";

export const createTheaterSchema = z.object({
  name: z.string().trim().min(1).max(100),
  city: z.string().trim().min(1).max(100),
});

export const createAuditoriumSchema = z.object({
  name: z.string().trim().min(1).max(100),
  rows: z.number().int().min(1).max(26), // baris A..Z
  seatsPerRow: z.number().int().min(1).max(40),
});

export type CreateTheaterInput = z.infer<typeof createTheaterSchema>;
export type CreateAuditoriumInput = z.infer<typeof createAuditoriumSchema>;