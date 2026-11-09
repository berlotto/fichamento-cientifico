"use server";

import { gateway, generateText } from "ai";
import { requireAdmin } from "@/lib/auth";
import { MODEL_ID, resolveModels, type ModelSettings } from "@/lib/llm/models";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ModelOption = {
  id: string;
  name: string;
  provider: string;
  /** USD por 1 milhão de tokens. */
  input: number | null;
  output: number | null;
};

export type AiSettings = {
  extract_model: string | null;
  cross_model: string | null;
  judge_model: string | null;
  monthly_budget_usd: number | null;
};

export type AiPanel = {
  settings: AiSettings;
  effective: ModelSettings;
  /** O que vale quando nada está escolhido aqui (variável de ambiente ou padrão). */
  fallback: ModelSettings;
  models: ModelOption[] | null;
  modelsError?: string;
  credits: { balance: number; used: number } | null;
  monthCost: number;
  byModel: { model: string; runs: number; cost: number }[];
};

const perMillion = (v: string | undefined) => {
  const n = Number(v);
  return v != null && Number.isFinite(n) ? n * 1_000_000 : null;
};

/** Modelos de texto disponíveis no AI Gateway, com preço. */
async function gatewayModels(): Promise<ModelOption[]> {
  const { models } = await gateway.getAvailableModels();
  return models
    .filter((m) => (m.modelType ?? "language") === "language")
    .map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.id.split("/")[0],
      input: perMillion(m.pricing?.input),
      output: perMillion(m.pricing?.output),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function loadAiPanel(): Promise<AiPanel> {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: row, error }, byModel, models, credits] = await Promise.all([
    supabase.from("app_settings").select("extract_model, cross_model, judge_model, monthly_budget_usd").single(),
    supabase.rpc("admin_month_by_model"),
    gatewayModels().then(
      (m) => ({ m, err: undefined as string | undefined }),
      (e: unknown) => ({ m: null, err: e instanceof Error ? e.message : String(e) }),
    ),
    gateway.getCredits().then(
      (c) => ({ balance: Number(c.balance), used: Number(c.totalUsed) }),
      () => null,
    ),
  ]);
  if (error || !row) throw new Error("Não foi possível ler as configurações.");
  const rows = (byModel.data ?? []).map((r) => ({ model: r.model, runs: Number(r.runs), cost: Number(r.cost_usd) }));
  return {
    settings: { ...row, monthly_budget_usd: row.monthly_budget_usd == null ? null : Number(row.monthly_budget_usd) },
    effective: resolveModels(row),
    fallback: resolveModels(null),
    models: models.m,
    modelsError: models.err ? "Não foi possível listar os modelos do AI Gateway." : undefined,
    credits,
    monthCost: rows.reduce((s, r) => s + r.cost, 0),
    byModel: rows,
  };
}

export type ActionResult = { ok?: boolean; error?: string };

const cleanModel = (v: string | null) => {
  const m = v?.trim() || null;
  if (m && !MODEL_ID.test(m)) throw new Error(`Modelo inválido: ${m}`);
  return m;
};

const cleanMoney = (v: number | null) => {
  if (v == null || Number.isNaN(v)) return null;
  if (v < 0 || v > 1_000_000) throw new Error("Valor fora do intervalo.");
  return Math.round(v * 100) / 100;
};

export async function saveAiSettings(s: AiSettings): Promise<ActionResult> {
  const admin = await requireAdmin();
  let patch;
  try {
    patch = {
      extract_model: cleanModel(s.extract_model),
      cross_model: cleanModel(s.cross_model),
      judge_model: cleanModel(s.judge_model),
      monthly_budget_usd: cleanMoney(s.monthly_budget_usd),
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
  // Só aceita modelos que o Gateway oferece (quando a lista está disponível).
  const available = await gatewayModels().catch(() => null);
  if (available) {
    const ids = new Set(available.map((m) => m.id));
    const unknown = [patch.extract_model, patch.cross_model, patch.judge_model].find((m) => m && !ids.has(m));
    if (unknown) return { error: `O AI Gateway não oferece o modelo ${unknown}.` };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .update({ ...patch, updated_at: new Date().toISOString(), updated_by: admin.id })
    .eq("id", true)
    .select("id");
  if (error || !data?.length) return { error: "Não foi possível salvar." };
  return { ok: true };
}

export type TestResult = { ok: boolean; latencyMs?: number; costUsd?: number | null; error?: string };

/** Chamada mínima ao modelo: confirma que a conta do Gateway tem acesso a ele. */
export async function testModel(model: string): Promise<TestResult> {
  const admin = await requireAdmin();
  if (!MODEL_ID.test(model)) return { ok: false, error: "Modelo inválido." };
  const started = Date.now();
  try {
    const { text, usage, providerMetadata } = await generateText({
      model,
      prompt: "Responda apenas com a palavra: ok",
      timeout: 45_000,
      maxRetries: 0,
    });
    const latencyMs = Date.now() - started;
    const cost = Number((providerMetadata?.gateway as { cost?: unknown } | undefined)?.cost);
    const costUsd = Number.isFinite(cost) ? cost : null;
    await createAdminClient().from("llm_runs").insert({
      user_id: admin.id,
      stage: "test",
      model,
      input_tokens: usage.inputTokens ?? null,
      output_tokens: usage.outputTokens ?? null,
      cost_usd: costUsd,
      latency_ms: latencyMs,
    });
    if (!text.trim()) return { ok: false, latencyMs, costUsd, error: "O modelo respondeu vazio." };
    return { ok: true, latencyMs, costUsd };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: /free|credit|plan|tier|payment/i.test(msg)
        ? "Sem acesso: o plano/créditos do AI Gateway não liberam este modelo."
        : msg.slice(0, 300),
    };
  }
}

// ---------------------------------------------------------------------------
// Usuários, limites e gastos
// ---------------------------------------------------------------------------

export type Limits = {
  user_monthly_budget_usd: number | null;
  articles_per_day: number;
  extractions_per_day: number;
  max_pdfs: number;
  max_projects: number;
  max_fields_per_project: number;
};

export type UserOverride = {
  monthly_budget_usd: number | null;
  unlimited_budget: boolean;
  articles_per_day: number | null;
  extractions_per_day: number | null;
  max_pdfs: number | null;
  max_projects: number | null;
  blocked: boolean;
  note: string | null;
};

export type AdminUser = {
  id: string;
  email: string;
  fullName: string | null;
  isAdmin: boolean;
  createdAt: string;
  lastSignIn: string | null;
  projects: number;
  articles: number;
  monthCost: number;
  totalCost: number;
  monthRuns: number;
  override: UserOverride | null;
};

export type UsersPanel = { defaults: Limits; users: AdminUser[] };

export async function loadUsersPanel(): Promise<UsersPanel> {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: s, error }, { data: users, error: uError }, { data: overrides }] = await Promise.all([
    supabase
      .from("app_settings")
      .select("user_monthly_budget_usd, articles_per_day, extractions_per_day, max_pdfs, max_projects, max_fields_per_project")
      .single(),
    supabase.rpc("admin_users"),
    supabase.from("user_limits").select("*"),
  ]);
  if (error || !s || uError) throw new Error("Não foi possível ler os usuários.");
  const byUser = new Map((overrides ?? []).map((o) => [o.user_id, o]));
  return {
    defaults: { ...s, user_monthly_budget_usd: s.user_monthly_budget_usd == null ? null : Number(s.user_monthly_budget_usd) },
    users: (users ?? []).map((u) => {
      const o = byUser.get(u.user_id);
      return {
        id: u.user_id,
        email: u.email,
        fullName: u.full_name,
        isAdmin: u.is_admin,
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at,
        projects: Number(u.projects),
        articles: Number(u.articles),
        monthCost: Number(u.month_cost),
        totalCost: Number(u.total_cost),
        monthRuns: Number(u.month_runs),
        override: o
          ? {
              monthly_budget_usd: o.monthly_budget_usd == null ? null : Number(o.monthly_budget_usd),
              unlimited_budget: o.unlimited_budget,
              articles_per_day: o.articles_per_day,
              extractions_per_day: o.extractions_per_day,
              max_pdfs: o.max_pdfs,
              max_projects: o.max_projects,
              blocked: o.blocked,
              note: o.note,
            }
          : null,
      };
    }),
  };
}

const cleanInt = (v: number | null, max = 1_000_000) => {
  if (v == null || Number.isNaN(v)) return null;
  if (!Number.isInteger(v) || v < 0 || v > max) throw new Error("Use números inteiros, de 0 em diante.");
  return v;
};

export async function saveDefaultLimits(l: Limits): Promise<ActionResult> {
  const admin = await requireAdmin();
  let patch;
  try {
    patch = {
      user_monthly_budget_usd: cleanMoney(l.user_monthly_budget_usd),
      articles_per_day: cleanInt(l.articles_per_day) ?? 0,
      extractions_per_day: cleanInt(l.extractions_per_day) ?? 0,
      max_pdfs: cleanInt(l.max_pdfs) ?? 0,
      max_projects: cleanInt(l.max_projects) ?? 0,
      max_fields_per_project: cleanInt(l.max_fields_per_project, 100) ?? 0,
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .update({ ...patch, updated_at: new Date().toISOString(), updated_by: admin.id })
    .eq("id", true)
    .select("id");
  if (error || !data?.length) return { error: "Não foi possível salvar." };
  return { ok: true };
}

/** Exceções de um usuário. Tudo vazio (e sem bloqueio) remove a exceção. */
export async function saveUserOverride(userId: string, o: UserOverride): Promise<ActionResult> {
  await requireAdmin();
  let row;
  try {
    row = {
      monthly_budget_usd: cleanMoney(o.monthly_budget_usd),
      unlimited_budget: !!o.unlimited_budget,
      articles_per_day: cleanInt(o.articles_per_day),
      extractions_per_day: cleanInt(o.extractions_per_day),
      max_pdfs: cleanInt(o.max_pdfs),
      max_projects: cleanInt(o.max_projects),
      blocked: !!o.blocked,
      note: o.note?.trim().slice(0, 500) || null,
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
  const supabase = await createClient();
  const empty = Object.entries(row).every(([, v]) => v == null || v === false);
  const { error } = empty
    ? await supabase.from("user_limits").delete().eq("user_id", userId)
    : await supabase
        .from("user_limits")
        .upsert({ user_id: userId, ...row, updated_at: new Date().toISOString() });
  if (error) return { error: "Não foi possível salvar." };
  return { ok: true };
}

export type RunRow = {
  id: number;
  createdAt: string;
  stage: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  latencyMs: number | null;
  article: string | null;
};

export async function loadUserRuns(userId: string): Promise<RunRow[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_user_runs", { uid: userId, max_rows: 200 });
  if (error) throw new Error("Não foi possível ler o registro de gastos.");
  return (data ?? []).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    stage: r.stage,
    model: r.model,
    inputTokens: r.input_tokens,
    outputTokens: r.output_tokens,
    costUsd: r.cost_usd == null ? null : Number(r.cost_usd),
    latencyMs: r.latency_ms,
    article: r.article_title,
  }));
}
