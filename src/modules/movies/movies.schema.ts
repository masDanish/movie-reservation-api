import { z } from "zod";

export const createMovieSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  durationMinutes: z.number().int().positive().max(600),
  genres: z.array(z.string().trim().min(1).max(50)).default([]),
});

export const updateMovieSchema = createMovieSchema.partial();

export const listMoviesQuery = z.object({
  genre: z.string().trim().optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const createShowtimeSchema = z.object({
  movieId: z.string().min(1),
  auditoriumId: z.string().min(1),
  startsAt: z.coerce.date(),
  price: z.number().int().positive(),
});

export const listShowtimesQuery = z.object({
  movieId: z.string().optional(),
  theaterId: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type CreateMovieInput = z.infer<typeof createMovieSchema>;
export type UpdateMovieInput = z.infer<typeof updateMovieSchema>;
export type ListMoviesQuery = z.infer<typeof listMoviesQuery>;
export type CreateShowtimeInput = z.infer<typeof createShowtimeSchema>;
export type ListShowtimesQuery = z.infer<typeof listShowtimesQuery>;