/**
 * project_stats contra o Supabase local: totais da visão geral somados no
 * banco, e só para o dono do projeto.
 */
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const service = createAdminClient();
const run = Date.now();

async function userClient(tag: string) {
  const email = `stats-${tag}-${run}@example.test`;
  const password = "senha-de-teste-123";
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = createClient<Database>(url, anonKey, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password });
  return { client, id: data.user.id };
}

let owner: Awaited<ReturnType<typeof userClient>>;
let other: Awaited<ReturnType<typeof userClient>>;
let projectId: string;

beforeAll(async () => {
  [owner, other] = await Promise.all([userClient("owner"), userClient("other")]);
  const { data: p } = await owner.client.from("projects").insert({ name: "Stats" }).select("id").single();
  projectId = p!.id;

  const ids: string[] = [];
  for (const sha of ["a", "b"]) {
    const { data, error } = await owner.client
      .from("articles")
      .insert({ project_id: projectId, sha256: sha.repeat(64), storage_path: `${owner.id}/${sha}.pdf` })
      .select("id")
      .single();
    if (error) throw error;
    ids.push(data.id);
  }
  // O pipeline (service role) é quem grava status, campos e custos.
  await service.from("articles").update({ status: "verified" }).eq("id", ids[0]);
  await service.from("articles").update({ status: "needs_review" }).eq("id", ids[1]);
  const field = { quote: "q", pdf_page: 1, source: "llm", edited: false, auto_approved: false, audit_pending: false, agrees: null as boolean | null };
  const { error: fe } = await service.from("article_fields").insert([
    { article_id: ids[0], key: "objective", value: "x", status: "accepted", ...field },
    { article_id: ids[0], key: "method", value: "x", status: "accepted", ...field, edited: true },
    { article_id: ids[1], key: "objective", value: "x", status: "pending", ...field, audit_pending: true, agrees: true },
    { article_id: ids[1], key: "method", value: "x", status: "rejected", ...field },
  ]);
  if (fe) throw fe;
  const runRow = { model: "openai/gpt-5-mini", stage: "extract", input_tokens: 1, output_tokens: 1, latency_ms: 1, prompt_version: "t" };
  const { error: re } = await service.from("llm_runs").insert([
    { article_id: ids[0], cost_usd: 0.1, ...runRow },
    { article_id: ids[0], cost_usd: 0.05, ...runRow },
    { article_id: ids[1], cost_usd: 0.2, ...runRow },
  ]);
  if (re) throw re;
});

describe("project_stats", () => {
  it("soma artigos, custos, auditoria e qualidade por campo", async () => {
    const { data, error } = await owner.client.rpc("project_stats", { p_project: projectId });
    expect(error).toBeNull();
    const s = data as Record<string, unknown> & { quality: Record<string, number | string>[] };
    expect(s).toMatchObject({ total: 2, extracted: 2, reviewed: 1, costed_articles: 2, audit_queue: 1 });
    expect(Number(s.cost)).toBeCloseTo(0.35, 6);

    const byKey = Object.fromEntries(s.quality.map((q) => [q.key, q]));
    expect(byKey.objective).toMatchObject({ total: 2, reviewed: 1, as_is: 1, checked: 1, agree: 1 });
    expect(byKey.method).toMatchObject({ total: 2, reviewed: 2, as_is: 0, edited: 1, rejected: 1 });
  });

  it("outro usuário não vê os números do projeto", async () => {
    const { data, error } = await other.client.rpc("project_stats", { p_project: projectId });
    expect(error).toBeNull();
    expect(data).toBeNull();
  });
});
