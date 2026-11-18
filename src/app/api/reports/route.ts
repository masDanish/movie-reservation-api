import { NextResponse } from "next/server";
import { z } from "zod";
import { route, parseQuery } from "@/src/lib/errors";
import { requireAdmin } from "@/src/lib/auth";
import { getReport } from "@/src/modules/reservations/reports.service";

const query = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// Admin: GET /api/reports?from=2026-12-01&to=2026-12-31
export const GET = route(async (req) => {
  await requireAdmin(req);
  const { from, to } = parseQuery(req, query);
  return NextResponse.json(await getReport(from, to));
});