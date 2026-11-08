/**
 * Migração de segurança contra o Supabase local:
 * funções de RLS fora da API, link de origem só http(s), limites por usuário.
 */
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const admin = createAdminClient();
const run = Date.now();

async function userClient(tag: string) {
  const email = `sec-${tag}-${run}@example.test`;
  const password = "senha-de-teste-123";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = createClient<Database>(url, anonKey, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password });
  return { client, id: data.user.id };
}

let A: Awaited<ReturnType<typeof userClient>>;
let projectId: string;

beforeAll(async () => {
  A = await userClient("a");
  const { data, error } = await A.client.from("projects").insert({ name: "Segurança" }).select("id").single();
  if (error) throw error;
  projectId = data.id;
});

describe("segurança", () => {
  it("owns_article e owns_project não são chamáveis pela API", async () => {
    // Chamada genérica: as funções saíram dos tipos gerados junto com o schema public.
    const rpc = A.client.rpc.bind(A.client) as unknown as (fn: string, args: object) => PromiseLike<{ error: unknown }>;
    const r1 = await rpc("owns_article", { a: "00000000-0000-0000-0000-000000000000" });
    const r2 = await rpc("owns_project", { p: projectId });
    expect(r1.error).not.toBeNull();
    expect(r2.error).not.toBeNull();
  });

  it("RLS continua funcionando com as funções no schema private", async () => {
    const { data, error } = await A.client.from("projects").select("id").eq("id", projectId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("link de origem só aceita http(s)", async () => {
    const base = { project_id: projectId, storage_path: `${A.id}/x.pdf` };
    const bad = await A.client
      .from("articles")
      .insert({ ...base, sha256: "a".repeat(64), source_url: "javascript:alert(1)" });
    expect(bad.error?.message).toMatch(/articles_source_url_http/);
    const ok = await A.client
      .from("articles")
      .insert({ ...base, sha256: "b".repeat(64), source_url: "https://example.org/a.pdf" });
    expect(ok.error).toBeNull();
  });

  it("limite diário de artigos", async () => {
    // Enche a cota pelo service role (sem auth.uid(), não é contado como inserção do usuário).
    const rows = Array.from({ length: 99 }, (_, i) => ({
      project_id: projectId,
      sha256: i.toString(16).padStart(64, "c"),
      storage_path: `${A.id}/q${i}.pdf`,
    }));
    const { error: fill } = await admin.from("articles").insert(rows);
    expect(fill).toBeNull();

    const { error } = await A.client
      .from("articles")
      .insert({ project_id: projectId, sha256: "d".repeat(64), storage_path: `${A.id}/d.pdf` });
    expect(error?.message).toMatch(/Limite de 100 artigos por dia/);
  });
});
