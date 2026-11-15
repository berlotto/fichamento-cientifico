"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type GlossaryResult = { ok: true } | { ok: false; error: string };

const clean = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max);

/** Conceito de interesse do projeto (spec 006). */
export async function addConcept(projectId: string, name: string, notes: string): Promise<GlossaryResult> {
  await requireUser();
  const n = clean(name, 80);
  if (!n) return { ok: false, error: "Digite o conceito." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("concepts")
    .insert({ project_id: projectId, name: n, notes: clean(notes, 500) || null });
  if (error?.code === "23505") return { ok: false, error: "Esse conceito já está na lista." };
  if (error?.code === "23514") return { ok: false, error: "O projeto já tem 30 conceitos, o máximo." };
  if (error) return { ok: false, error: "Não foi possível adicionar o conceito." };
  revalidatePath("/projects", "layout");
  return { ok: true };
}

/** Remove o conceito e as definições dele. */
export async function removeConcept(conceptId: string): Promise<GlossaryResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("concepts").delete().eq("id", conceptId);
  if (error) return { ok: false, error: "Não foi possível remover o conceito." };
  revalidatePath("/projects", "layout");
  return { ok: true };
}

/**
 * Procura as definições dos conceitos em todos os artigos do projeto (menos os
 * descartados), sem refazer as fichas. Uma chamada ao LLM por artigo.
 */
export async function requestDefinitions(projectId: string): Promise<{ ok: true; queued: number } | { ok: false; error: string }> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_definitions", { p_project: projectId });
  if (error) return { ok: false, error: error.code === "P0001" ? error.message : "Não foi possível pedir a busca." };
  revalidatePath("/projects", "layout");
  return { ok: true, queued: data ?? 0 };
}

export async function reviewDefinition(
  definitionId: string,
  status: "accepted" | "rejected" | "pending",
): Promise<GlossaryResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("definitions").update({ status }).eq("id", definitionId);
  if (error) return { ok: false, error: "Não foi possível salvar." };
  revalidatePath("/projects", "layout");
  return { ok: true };
}

export async function deleteDefinition(definitionId: string): Promise<GlossaryResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("definitions").delete().eq("id", definitionId);
  if (error) return { ok: false, error: "Não foi possível excluir." };
  revalidatePath("/projects", "layout");
  return { ok: true };
}

/**
 * Uma citação marcada à mão vira definição de um conceito (spec 006, R6). Já
 * nasce conferida (o trecho saiu do texto do PDF) e aceita (foi o pesquisador
 * quem escolheu).
 */
export async function definitionFromQuote(
  quoteId: string,
  conceptId: string,
  origin: "own" | "cited",
  kind: "definition" | "operationalization",
  citedRef: string,
): Promise<GlossaryResult> {
  await requireUser();
  const supabase = await createClient();
  const { data: q } = await supabase
    .from("quotes")
    .select("id, article_id, text, pdf_page, printed_page")
    .eq("id", quoteId)
    .maybeSingle();
  if (!q) return { ok: false, error: "Citação não encontrada." };
  const { error } = await supabase.from("definitions").insert({
    concept_id: conceptId,
    article_id: q.article_id,
    text: q.text,
    pdf_page: q.pdf_page,
    printed_page: q.printed_page,
    origin: origin === "cited" ? "cited" : "own",
    cited_ref: origin === "cited" ? clean(citedRef, 500) || null : null,
    kind: kind === "operationalization" ? "operationalization" : "definition",
    verified: true,
    status: "accepted",
    source: "manual",
    quote_id: q.id,
  });
  if (error) return { ok: false, error: "Não foi possível criar a definição." };
  revalidatePath("/projects", "layout");
  return { ok: true };
}
