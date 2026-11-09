"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { parseAuthorLines } from "@/lib/citation";
import { normalizeDoi } from "@/lib/pipeline/metadata";
import { locateQuote, numbersInQuote, resolvePage } from "@/lib/pipeline/verify";
import { removeUnreferencedPdfs } from "@/lib/storage-cleanup";
import { createClient } from "@/lib/supabase/server";

const MAX_NOTES = 20_000;
const MAX_VALUE = 20_000;
const MAX_QUOTE = 5_000;

/** Grava "Minhas notas". RLS garante que o artigo é do usuário. */
export async function saveNotes(articleId: string, notes: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("articles")
    .update({ notes: notes.slice(0, MAX_NOTES) || null })
    .eq("id", articleId);
  return { ok: !error };
}

export type ActionResult = { ok: boolean; error?: string };

/** Aceitar, rejeitar ou voltar a pendente um campo da ficha. */
export async function reviewField(
  articleId: string,
  key: string,
  status: "accepted" | "rejected" | "pending",
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("article_fields")
    .update({
      status,
      reviewed_by: status === "pending" ? null : user.id,
      reviewed_at: status === "pending" ? null : new Date().toISOString(),
    })
    .eq("article_id", articleId)
    .eq("key", key);
  if (error) return { ok: false, error: "Não foi possível salvar a revisão." };
  revalidatePath("/projects", "layout");
  return { ok: true };
}

/**
 * Editar valor e trecho. O trecho é conferido de novo no texto do PDF, do mesmo
 * jeito que na extração: página onde está e se os números do valor estão nele.
 */
export async function editField(
  articleId: string,
  key: string,
  value: string,
  quote: string,
): Promise<ActionResult & { verified?: boolean }> {
  const user = await requireUser();
  const v = value.trim().slice(0, MAX_VALUE);
  const q = quote.trim().slice(0, MAX_QUOTE) || null;
  if (!v) return { ok: false, error: "O valor não pode ficar vazio. Para descartar o campo, use Rejeitar." };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("article_fields")
    .select("quote")
    .eq("article_id", articleId)
    .eq("key", key)
    .maybeSingle();
  const { data: pages } = await supabase
    .from("article_pages")
    .select("pdf_page, printed_page, text")
    .eq("article_id", articleId);
  const found = q && pages ? locateQuote(q, pages) : [];
  const page = resolvePage(found, null);
  const verified = page != null && numbersInQuote(v, q ?? "");

  const { error } = await supabase
    .from("article_fields")
    .update({
      value: v,
      quote: q,
      pdf_page: page,
      printed_page: page != null ? (pages?.find((p) => p.pdf_page === page)?.printed_page ?? null) : null,
      verified,
      // Trecho original trocado: a tradução antiga deixa de valer.
      ...(current?.quote !== q ? { quote_translated: null } : {}),
      edited: true,
      status: "accepted",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("article_id", articleId)
    .eq("key", key);
  if (error) return { ok: false, error: "Não foi possível salvar." };
  revalidatePath("/projects", "layout");
  return { ok: true, verified };
}

export type MetadataState = { ok?: boolean; error?: string };

const text = (fd: FormData, k: string, max: number) => {
  const v = String(fd.get(k) ?? "").trim().slice(0, max);
  return v || null;
};

/** Correção manual dos metadados; marca a fonte como "manual" (a reextração não sobrescreve). */
export async function saveMetadata(_: MetadataState, fd: FormData): Promise<MetadataState> {
  await requireUser();
  const articleId = String(fd.get("articleId") ?? "");
  const title = text(fd, "title", 1000);
  if (!title) return { error: "Informe o título." };

  const yearRaw = text(fd, "year", 4);
  const year = yearRaw ? Number(yearRaw) : null;
  if (year != null && (!Number.isInteger(year) || year < 1000 || year > 2999)) {
    return { error: "Ano inválido." };
  }
  const doiRaw = text(fd, "doi", 300);
  const doi = doiRaw ? normalizeDoi(doiRaw) : null;
  if (doi && !/^10\.\d{4,9}\/\S+$/.test(doi)) return { error: "DOI inválido (deve começar com 10.)." };
  const language = text(fd, "language", 10)?.toLowerCase() ?? null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("articles")
    .update({
      title,
      subtitle: text(fd, "subtitle", 1000),
      authors: parseAuthorLines(String(fd.get("authors") ?? "")),
      year,
      venue: text(fd, "venue", 500),
      volume: text(fd, "volume", 50),
      issue: text(fd, "issue", 50),
      pages: text(fd, "pages", 50),
      doi,
      language,
      metadata_source: "manual",
    })
    .eq("id", articleId);
  if (error) return { error: "Não foi possível salvar." };
  revalidatePath("/projects", "layout");
  return { ok: true };
}

/** Pede nova extração (ex.: depois de criar campos no projeto). Campos já revisados são mantidos. */
export async function reextract(articleId: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_extract", { article: articleId });
  if (error) {
    return { ok: false, error: error.code === "P0001" ? error.message : "Não foi possível pedir a extração." };
  }
  revalidatePath("/projects", "layout");
  return { ok: true };
}

/** Exclui o artigo e, se nenhum outro artigo usa o mesmo PDF, o arquivo do Storage (A11). */
export async function deleteArticle(projectId: string, articleId: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { data: article } = await supabase
    .from("articles")
    .select("storage_path")
    .eq("id", articleId)
    .maybeSingle();
  if (!article) return { ok: false, error: "Artigo não encontrado." };

  const { error } = await supabase.from("articles").delete().eq("id", articleId);
  if (error) return { ok: false, error: "Não foi possível excluir." };
  await removeUnreferencedPdfs(supabase, [article.storage_path]);

  revalidatePath("/projects", "layout");
  redirect(`/projects/${projectId}`);
}
