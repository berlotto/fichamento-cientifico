"use server";

import { redirect } from "next/navigation";
import { projectDefaultsFrom, validCitationStyle, type ProjectDefaults } from "@/lib/project-defaults";
import { validFont } from "@/lib/fonts";
import { validLanguage } from "@/lib/languages";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Guarda as fontes na conta (vale em outros aparelhos). */
export async function saveFonts(ui: string, article: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: { font_ui: validFont(ui, "ui"), font_article: validFont(article, "article") },
  });
  return { ok: !error };
}

/** Idioma padrão das fichas nos projetos novos. */
export async function saveDefaultLanguage(code: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { default_output_language: validLanguage(code) } });
  return { ok: !error };
}

export type PasswordState = { ok?: boolean; error?: string };

/**
 * Troca de senha. Confere a senha atual antes (entrando de novo com ela), para
 * que uma sessão esquecida aberta não baste para trocar a senha.
 */
export async function changePassword(current: string, next: string, confirm: string): Promise<PasswordState> {
  if (next.length < 8) return { error: "A nova senha precisa ter ao menos 8 caracteres." };
  if (next.length > 72) return { error: "A nova senha pode ter no máximo 72 caracteres." };
  if (next !== confirm) return { error: "A confirmação não confere com a nova senha." };
  if (next === current) return { error: "A nova senha precisa ser diferente da atual." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) return { error: "Sessão expirada. Entre de novo." };

  const { error: wrong } = await supabase.auth.signInWithPassword({ email, password: current });
  if (wrong) return { error: "Senha atual incorreta." };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    return {
      error: /pwned|leaked|weak/i.test(error.message)
        ? "Essa senha é fraca ou já apareceu em vazamentos. Escolha outra."
        : "Não foi possível trocar a senha.",
    };
  }
  return { ok: true };
}

/** Nome e instituição (versão para a modal de configurações). */
export async function saveAccount(fullName: string, institution: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: fullName.trim().slice(0, 200) || null,
      institution: institution.trim().slice(0, 200) || null,
    },
  });
  return { ok: !error };
}

/** Norma de referência que abre primeiro na ficha e no botão de exportar. */
export async function saveCitationStyle(style: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { citation_style: validCitationStyle(style) } });
  // A ficha lê a preferência do JWT: renova para valer já.
  if (!error) await supabase.auth.refreshSession();
  return { ok: !error };
}

/** Padrões de verificação dos projetos novos. */
export async function saveProjectDefaults(d: ProjectDefaults): Promise<{ ok: boolean }> {
  const clean = projectDefaultsFrom({
    default_cross_check: d.crossCheck,
    default_auto_approve: d.autoApprove,
    default_critical_fields: d.critical,
    default_audit_rate: d.auditRate,
  });
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: {
      default_cross_check: clean.crossCheck,
      default_auto_approve: clean.autoApprove,
      default_critical_fields: clean.critical,
      default_audit_rate: clean.auditRate,
    },
  });
  return { ok: !error };
}

/** Encerra a sessão nos outros aparelhos e navegadores (esta continua). */
export async function signOutOthers(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  return { ok: !error };
}

export type MyUsage = {
  monthCost: number;
  monthlyBudget: number | null;
  blocked: boolean;
  articlesToday: number;
  articlesPerDay: number;
  extractionsToday: number;
  extractionsPerDay: number;
  pdfs: number;
  maxPdfs: number;
  projects: number;
  maxProjects: number;
  monthArticles: number;
  runs: {
    id: number;
    createdAt: string;
    stage: string;
    model: string;
    costUsd: number | null;
    article: string | null;
  }[];
};

/** Uso e gasto do próprio usuário, com as últimas chamadas de IA. */
export async function loadMyUsage(): Promise<MyUsage> {
  const supabase = await createClient();
  const [{ data: u, error }, { data: runs }] = await Promise.all([
    supabase.rpc("my_usage"),
    supabase
      .from("llm_runs")
      .select("id, created_at, stage, model, cost_usd, articles(title, original_filename)")
      .order("id", { ascending: false })
      .limit(50),
  ]);
  if (error || !u) throw new Error("Não foi possível ler o uso.");
  const n = (v: unknown) => Number(v ?? 0);
  const x = u as Record<string, unknown>;
  return {
    monthCost: n(x.month_cost),
    monthlyBudget: x.monthly_budget == null ? null : n(x.monthly_budget),
    blocked: x.blocked === true,
    articlesToday: n(x.articles_today),
    articlesPerDay: n(x.articles_per_day),
    extractionsToday: n(x.extractions_today),
    extractionsPerDay: n(x.extractions_per_day),
    pdfs: n(x.pdfs),
    maxPdfs: n(x.max_pdfs),
    projects: n(x.projects),
    maxProjects: n(x.max_projects),
    monthArticles: n(x.month_articles),
    runs: (runs ?? []).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      stage: r.stage,
      model: r.model,
      costUsd: r.cost_usd == null ? null : Number(r.cost_usd),
      article: r.articles?.title ?? r.articles?.original_filename ?? null,
    })),
  };
}

/**
 * Exclui a conta: PDFs do armazenamento e o usuário (projetos, artigos e
 * fichas vão junto, em cascata). O registro de gasto fica, sem dono (contábil).
 */
export async function deleteAccount(password: string, confirmation: string): Promise<PasswordState> {
  if (confirmation.trim().toUpperCase() !== "EXCLUIR") return { error: 'Digite EXCLUIR para confirmar.' };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.email) return { error: "Sessão expirada. Entre de novo." };
  if (user.app_metadata?.role === "admin") {
    return { error: "A conta de administrador não pode ser excluída por aqui." };
  }
  const { error: wrong } = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (wrong) return { error: "Senha incorreta." };

  const admin = createAdminClient();
  // PDFs ficam em <user_id>/...; apaga em lotes.
  for (;;) {
    const { data: files, error } = await admin.storage.from("pdfs").list(user.id, { limit: 1000 });
    if (error) return { error: "Não foi possível apagar os arquivos. Nada foi excluído da conta." };
    if (!files?.length) break;
    const { error: rmError } = await admin.storage.from("pdfs").remove(files.map((f) => `${user.id}/${f.name}`));
    if (rmError) return { error: "Não foi possível apagar os arquivos. Tente de novo." };
    if (files.length < 1000) break;
  }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: "Não foi possível excluir a conta." };
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?conta=excluida");
}
