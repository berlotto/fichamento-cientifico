/**
 * Administração (SaaS) contra o Supabase local: quem lê e altera as
 * configurações, limites por usuário, teto de gasto e registro de gasto.
 */
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const service = createAdminClient();
const run = Date.now();

async function userClient(tag: string, role?: "admin") {
  const email = `adm-${tag}-${run}@example.test`;
  const password = "senha-de-teste-123";
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    ...(role ? { app_metadata: { role } } : {}),
  });
  if (error) throw error;
  const client = createClient<Database>(url, anonKey, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password });
  return { client, id: data.user.id };
}

let admin: Awaited<ReturnType<typeof userClient>>;
let user: Awaited<ReturnType<typeof userClient>>;
let projectId: string;
let original: { extract_model: string | null } | null;

const insertArticle = (sha: string) =>
  user.client
    .from("articles")
    .insert({ project_id: projectId, sha256: sha.repeat(64).slice(0, 64), storage_path: `${user.id}/${sha}.pdf` })
    .select("id")
    .single();

beforeAll(async () => {
  [admin, user] = await Promise.all([userClient("admin", "admin"), userClient("user")]);
  const { data: p } = await user.client.from("projects").insert({ name: "Admin" }).select("id").single();
  projectId = p!.id;
  const { data } = await service.from("app_settings").select("extract_model").single();
  original = data;
});

afterAll(async () => {
  await service.from("app_settings").update({ extract_model: original?.extract_model ?? null }).eq("id", true);
  await service.from("user_limits").delete().eq("user_id", user.id);
});

describe("configurações do serviço", () => {
  it("usuário comum não lê nem altera; admin lê e altera", async () => {
    const { data: seen } = await user.client.from("app_settings").select("*");
    expect(seen).toEqual([]);
    const { data: changed } = await user.client
      .from("app_settings")
      .update({ extract_model: "openai/gpt-5-mini" })
      .eq("id", true)
      .select("id");
    expect(changed ?? []).toEqual([]);

    const { data: mine } = await admin.client
      .from("app_settings")
      .update({ extract_model: "openai/gpt-5-mini" })
      .eq("id", true)
      .select("extract_model");
    expect(mine).toEqual([{ extract_model: "openai/gpt-5-mini" }]);
  });

  it("modelo com formato inválido é recusado", async () => {
    const { error } = await admin.client.from("app_settings").update({ extract_model: "x; drop" }).eq("id", true);
    expect(error).not.toBeNull();
  });

  it("usuário não se promove a admin pelo user_metadata", async () => {
    await user.client.auth.updateUser({ data: { role: "admin" } });
    await user.client.auth.refreshSession();
    const { error } = await user.client.rpc("admin_users");
    expect(error?.code).toBe("42501");
  });

  it("admin lista usuários com gasto; usuário comum não", async () => {
    const { data, error } = await admin.client.rpc("admin_users");
    expect(error).toBeNull();
    expect(data?.some((u) => u.user_id === user.id)).toBe(true);
    const { error: denied } = await user.client.rpc("admin_user_runs", { uid: admin.id });
    expect(denied?.code).toBe("42501");
  });
});

describe("limites e gasto por usuário", () => {
  it("só o admin cria exceções", async () => {
    const { error } = await user.client.from("user_limits").insert({ user_id: user.id, unlimited_budget: true });
    expect(error).not.toBeNull();
    const { error: ok } = await admin.client.from("user_limits").upsert({ user_id: user.id, articles_per_day: 1 });
    expect(ok).toBeNull();
  });

  it("limite diário vem da exceção do usuário", async () => {
    const first = await insertArticle("a");
    expect(first.error).toBeNull();
    const second = await insertArticle("b");
    expect(second.error?.message).toMatch(/Limite de 1 artigos por dia/);
  });

  it("gasto é registrado por usuário (mesmo sem o worker informar) e entra no uso do mês", async () => {
    const { data: art } = await service.from("articles").select("id").eq("project_id", projectId).limit(1).single();
    await service.from("llm_runs").insert({ article_id: art!.id, stage: "extract", model: "openai/gpt-5-mini", cost_usd: 0.02 });
    const { data: runs } = await user.client.from("llm_runs").select("user_id, cost_usd");
    expect(runs).toEqual([{ user_id: user.id, cost_usd: 0.02 }]);
    const { data: usage } = await user.client.rpc("my_usage");
    expect(Number((usage as { month_cost: number }).month_cost)).toBeCloseTo(0.02);
  });

  it("teto mensal atingido bloqueia envio e worker; bloqueio também", async () => {
    await admin.client.from("user_limits").upsert({ user_id: user.id, articles_per_day: 100, monthly_budget_usd: 0.01 });
    const over = await insertArticle("c");
    expect(over.error?.message).toMatch(/Limite mensal de gasto/);
    const { data: art } = await service.from("articles").select("id").eq("project_id", projectId).limit(1).single();
    const { data: reason } = await service.rpc("llm_block_reason_for_article", { article: art!.id });
    expect(reason).toMatch(/Limite mensal de gasto/);

    await admin.client.from("user_limits").upsert({ user_id: user.id, unlimited_budget: true, blocked: true });
    const blocked = await insertArticle("d");
    expect(blocked.error?.message).toMatch(/bloqueada/);

    await admin.client.from("user_limits").upsert({ user_id: user.id, unlimited_budget: true, blocked: false });
    const free = await insertArticle("e");
    expect(free.error).toBeNull();
  });

  it("gasto continua no mês depois de excluir o artigo", async () => {
    await user.client.from("projects").delete().eq("id", projectId);
    const { data: usage } = await user.client.rpc("my_usage");
    expect(Number((usage as { month_cost: number }).month_cost)).toBeCloseTo(0.02);
  });
});
