import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseWorkerDeps } from "@/lib/pipeline/supabase-deps";
import { runWorker } from "@/lib/pipeline/worker";

// Hobby: máximo 300 s. O laço para de pegar mensagens com folga antes disso.
export const maxDuration = 300;
const BUDGET_MS = 240_000;

function authorized(request: Request): boolean {
  const secret = process.env.WORKER_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runWorker(supabaseWorkerDeps(createAdminClient()), BUDGET_MS);
  return Response.json(result);
}
