"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { templateById, planTemplate } from "@/lib/field-templates";
import { BUILTIN_FIELDS, enabledOptional, fieldKey, OPTIONAL_KEYS } from "@/lib/fields";
import { validLanguage } from "@/lib/languages";
import { AUDIT_RATES, projectDefaultsFrom } from "@/lib/project-defaults";
import { removeUnreferencedPdfs } from "@/lib/storage-cleanup";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CreateProjectState = { error?: string };

export async function createProject(
  _: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe um nome." };

  const supabase = await createClient();
  // Idioma e verificação: os padrões escolhidos nas configurações.
  const { data: user } = await supabase.auth.getUser();
  const meta = user.user?.user_metadata ?? {};
  const output_language = validLanguage(meta.default_output_language);
  const d = projectDefaultsFrom(meta);
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name,
      output_language,
      cross_check: d.crossCheck,
      auto_approve: d.autoApprove,
      critical_fields: d.critical,
      audit_rate: d.auditRate,
    })
    .select("id")
    .single();
  if (error?.code === "P0001") return { error: error.message };
  if (error || !data) return { error: "Não foi possível criar o projeto." };

  // Modelo de campos escolhido na criação (spec 007). Falha aqui não desfaz o projeto.
  const template = String(formData.get("template") ?? "");
  if (template && templateById(template)) await applyFieldTemplate(data.id, template);

  redirect(`/projects/${data.id}`);
}

export type ProjectActionState = { ok?: boolean; error?: string };

export async function renameProject(_: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  const id = String(formData.get("projectId") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  if (!name) return { error: "Informe um nome." };
  const supabase = await createClient();
  const { error } = await supabase.from("projects").update({ name }).eq("id", id);
  if (error) return { error: "Não foi possível renomear." };
  revalidatePath("/projects", "layout");
  return { ok: true };
}

/** Exclui o projeto, seus artigos e os PDFs que nenhum outro projeto usa (A11). */
export async function deleteProject(projectId: string): Promise<ProjectActionState> {
  await requireUser();
  const supabase = await createClient();
  const { data: articles } = await supabase.from("articles").select("storage_path").eq("project_id", projectId);
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) return { error: "Não foi possível excluir o projeto." };
  await removeUnreferencedPdfs(supabase, (articles ?? []).map((a) => a.storage_path));
  revalidatePath("/projects", "layout");
  redirect("/projects");
}

/** Novo campo personalizado. Vale para as próximas extrações (e para "Extrair de novo"). */
export async function addProjectField(_: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  const projectId = String(formData.get("projectId") ?? "");
  const label = String(formData.get("label") ?? "").trim().slice(0, 80);
  const instructions = String(formData.get("instructions") ?? "").trim().slice(0, 1000) || null;
  if (!label) return { error: "Dê um nome ao campo." };
  const key = fieldKey(label);
  if (BUILTIN_FIELDS.some((f) => f.key === key) || OPTIONAL_KEYS.includes(key)) {
    return { error: "Esse campo já existe na ficha (ou nos campos opcionais)." };
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("project_fields")
    .select("key", { count: "exact", head: true })
    .eq("project_id", projectId);
  const { error } = await supabase
    .from("project_fields")
    .insert({ project_id: projectId, key, label, instructions, position: count ?? 0 });
  if (error?.code === "23505") return { error: "Já existe um campo com esse nome." };
  if (error?.code === "P0001") return { error: error.message };
  if (error) return { error: "Não foi possível criar o campo." };
  revalidatePath("/projects", "layout");
  return { ok: true };
}

export async function removeProjectField(projectId: string, key: string): Promise<ProjectActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("project_fields").delete().eq("project_id", projectId).eq("key", key);
  if (error) return { error: "Não foi possível remover o campo." };
  revalidatePath("/projects", "layout");
  return { ok: true };
}

/** Pede a extração de todos os artigos do projeto (ex.: depois de criar campos). */
export async function reextractProject(projectId: string): Promise<ProjectActionState & { queued?: number }> {
  await requireUser();
  const supabase = await createClient();
  const { data: articles } = await supabase
    .from("articles")
    .select("id")
    .eq("project_id", projectId)
    .in("status", ["extracted", "needs_review", "verified", "failed"]);
  let queued = 0;
  for (const a of articles ?? []) {
    const { error } = await supabase.rpc("request_extract", { article: a.id });
    if (error) {
      revalidatePath("/projects", "layout");
      return { queued, error: error.code === "P0001" ? error.message : "Não foi possível pedir a extração." };
    }
    queued++;
  }
  revalidatePath("/projects", "layout");
  return { ok: true, queued };
}

/** Idioma em que as fichas do projeto são escritas (vale para as próximas extrações). */
export async function setProjectLanguage(projectId: string, code: string): Promise<ProjectActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ output_language: validLanguage(code) })
    .eq("id", projectId);
  if (error) return { error: "Não foi possível salvar o idioma." };
  revalidatePath("/projects", "layout");
  return { ok: true };
}

export type VerificationSettings = {
  crossCheck: boolean;
  autoApprove: boolean;
  critical: string[];
  auditRate: number;
};

/** Verificação automática do projeto (segundo extrator + juiz, aprovação automática, campos críticos). */
export async function saveVerification(projectId: string, v: VerificationSettings): Promise<ProjectActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      cross_check: v.crossCheck,
      // Sem verificação não há base para aprovar sozinho.
      auto_approve: v.crossCheck && v.autoApprove,
      critical_fields: [...new Set(v.critical.filter((k) => /^[a-z][a-z0-9_]{1,39}$/.test(k)))].slice(0, 40),
      audit_rate: (AUDIT_RATES as readonly number[]).includes(v.auditRate) ? v.auditRate : 0.1,
    })
    .eq("id", projectId);
  if (error) return { error: "Não foi possível salvar." };
  revalidatePath("/projects", "layout");
  return { ok: true };
}

/** Limite de campos personalizados por projeto (configuração do serviço; o usuário não lê a tabela). */
async function fieldsLimit(): Promise<number> {
  const { data } = await createAdminClient().from("app_settings").select("max_fields_per_project").maybeSingle();
  return data?.max_fields_per_project ?? 20;
}

/**
 * Aplica um modelo de campos (spec 007): cria os campos que o projeto ainda não
 * tem, depois dos que já existem. Nada é apagado; se não couber no limite,
 * avisa e não cria nenhum.
 */
export async function applyFieldTemplate(
  projectId: string,
  templateId: string,
): Promise<ProjectActionState & { added?: number; skipped?: number }> {
  await requireUser();
  const template = templateById(templateId);
  if (!template) return { error: "Modelo desconhecido." };
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).maybeSingle();
  if (!project) return { error: "Projeto não encontrado." };

  const { data: existing } = await supabase.from("project_fields").select("key").eq("project_id", projectId);
  const keys = (existing ?? []).map((f) => f.key);
  const plan = planTemplate(template, keys, await fieldsLimit());
  if (plan.add.length === 0) return { ok: true, added: 0, skipped: plan.skipped };
  if (!plan.fits) {
    return {
      error: `O modelo ${template.name} precisa de ${plan.add.length} campos novos e só cabem mais ${plan.room} neste projeto. Remova campos ou peça um limite maior.`,
    };
  }
  const { error } = await supabase.from("project_fields").insert(
    plan.add.map((f, i) => ({
      project_id: projectId,
      key: f.key,
      label: f.label,
      instructions: f.instructions,
      position: keys.length + i,
    })),
  );
  if (error?.code === "P0001") return { error: error.message };
  if (error) return { error: "Não foi possível aplicar o modelo." };
  revalidatePath("/projects", "layout");
  return { ok: true, added: plan.add.length, skipped: plan.skipped };
}

/** Campos opcionais da extração (spec 005): limitações, trabalhos futuros, lacunas. */
export async function setOptionalFields(projectId: string, keys: string[]): Promise<ProjectActionState> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ optional_fields: enabledOptional(keys) })
    .eq("id", projectId);
  if (error) return { error: "Não foi possível salvar." };
  revalidatePath("/projects", "layout");
  return { ok: true };
}
