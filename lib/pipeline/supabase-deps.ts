import "server-only";

import { languageByCode } from "@/lib/languages";
import { extractWithLlm, PROMPT_VERSION } from "@/lib/llm/extract";
import type { AdminClient } from "@/lib/supabase/admin";
import { buildFieldRows, llmMetadata, statusAfterExtract } from "./extract";
import { crossrefByDoi, crossrefByTitle, findDoi, mergeMetadata, sameTitle, type BiblioMetadata } from "./metadata";
import { parsePdf } from "./parse";
import { PermanentError, type PipelineMessage, type Queue, type QueueMessage, type WorkerDeps } from "./worker";

export function supabaseQueue(db: AdminClient): Queue {
  return {
    async read(qty, vtSeconds) {
      const { data, error } = await db.rpc("queue_read", { qty, vt_seconds: vtSeconds });
      if (error) throw new Error(`queue_read: ${error.message}`);
      return (data ?? []) as QueueMessage[];
    },
    async send(msg, delaySeconds = 0) {
      const { error } = await db.rpc("queue_send", { msg, delay_seconds: delaySeconds });
      if (error) throw new Error(`queue_send: ${error.message}`);
    },
    async archive(msgId) {
      const { error } = await db.rpc("queue_archive", { msg_id: msgId });
      if (error) throw new Error(`queue_archive: ${error.message}`);
    },
  };
}

/** Estágio parse: baixa o PDF, extrai texto por página, grava article_pages e enfileira extract. Idempotente. */
async function parseStage(db: AdminClient, queue: Queue, { article_id }: PipelineMessage) {
  const { data: article, error } = await db
    .from("articles")
    .select("id, storage_path")
    .eq("id", article_id)
    .maybeSingle();
  if (error) throw new Error(`ler artigo: ${error.message}`);
  if (!article) return; // excluído enquanto estava na fila

  const { data: blob, error: dlError } = await db.storage.from("pdfs").download(article.storage_path);
  if (dlError || !blob) {
    const missing = /not found/i.test(dlError?.message ?? "");
    if (missing) throw new PermanentError("PDF não encontrado no armazenamento.");
    throw new Error(`download: ${dlError?.message}`);
  }

  const { pages, needsOcr } = await parsePdf(new Uint8Array(await blob.arrayBuffer()));

  const { error: delError } = await db.from("article_pages").delete().eq("article_id", article_id);
  if (delError) throw new Error(`limpar páginas: ${delError.message}`);

  // Lotes para não estourar o tamanho de requisição do PostgREST em PDFs longos.
  for (let i = 0; i < pages.length; i += 50) {
    const chunk = pages.slice(i, i + 50).map((p) => ({ article_id, ...p }));
    const { error: insError } = await db.from("article_pages").insert(chunk);
    if (insError) throw new Error(`gravar páginas: ${insError.message}`);
  }

  const { error: updError } = await db
    .from("articles")
    .update({ status: needsOcr ? "needs_ocr" : "parsed", page_count: pages.length, error: null })
    .eq("id", article_id);
  if (updError) throw new Error(`atualizar artigo: ${updError.message}`);

  // Sem texto (PDF escaneado) não há o que extrair até existir OCR.
  if (!needsOcr) await queue.send({ article_id, stage: "extract" });
}

async function safe<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    // Crossref fora do ar não impede a ficha: fica o que o LLM leu do PDF.
    console.error(`[worker] ${label}: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

/**
 * Estágio extract: LLM lê o artigo (metadados + campos da ficha), o Crossref
 * confirma os metadados e cada trecho citado é conferido no texto do PDF.
 * Idempotente: regrava os campos pendentes; campos já revisados pelo usuário
 * (aceitos, editados ou rejeitados) são preservados.
 */
async function extractStage(db: AdminClient, { article_id }: PipelineMessage) {
  const { data: article, error } = await db
    .from("articles")
    .select("id, project_id, metadata_source")
    .eq("id", article_id)
    .maybeSingle();
  if (error) throw new Error(`ler artigo: ${error.message}`);
  if (!article) return; // excluído enquanto estava na fila

  const { data: pages, error: pgError } = await db
    .from("article_pages")
    .select("pdf_page, printed_page, text")
    .eq("article_id", article_id)
    .order("pdf_page");
  if (pgError) throw new Error(`ler páginas: ${pgError.message}`);
  if (!pages?.length) throw new PermanentError("O artigo não tem texto extraído.");

  const { data: project, error: prError } = await db
    .from("projects")
    .select("output_language")
    .eq("id", article.project_id)
    .single();
  if (prError) throw new Error(`ler projeto: ${prError.message}`);
  const language = languageByCode(project.output_language);

  const { data: custom, error: cfError } = await db
    .from("project_fields")
    .select("key, label, instructions")
    .eq("project_id", article.project_id)
    .order("position");
  if (cfError) throw new Error(`ler campos do projeto: ${cfError.message}`);

  const { extraction, model, inputTokens, outputTokens, costUsd, latencyMs } = await extractWithLlm(
    pages,
    custom ?? [],
    language.prompt,
  );
  const { error: runError } = await db.from("llm_runs").insert({
    article_id,
    stage: "extract",
    model,
    prompt_version: PROMPT_VERSION,
    input_tokens: inputTokens ?? null,
    output_tokens: outputTokens ?? null,
    cost_usd: costUsd,
    latency_ms: latencyMs,
  });
  if (runError) console.error(`[worker] llm_runs ${article_id}: ${runError.message}`);

  const fromLlm = llmMetadata(extraction);
  const doi = findDoi(pages) ?? fromLlm.doi;
  let crossref: BiblioMetadata | null = doi ? await safe("crossref doi", () => crossrefByDoi(doi)) : null;
  // DOI de outro trabalho (nota de rodapé, artigo citado): o título não bate, descarta.
  if (crossref && fromLlm.title && !sameTitle(crossref.title, fromLlm.title)
      && !sameTitle([crossref.title, crossref.subtitle].filter(Boolean).join(": "), fromLlm.title)) {
    crossref = null;
  }
  if (!crossref && fromLlm.title) {
    crossref = await safe("crossref título", () =>
      crossrefByTitle(fromLlm.title!, fromLlm.authors[0]?.family ?? null, fromLlm.year),
    );
  }
  const meta = mergeMetadata(crossref, fromLlm);

  const { data: reviewedRows, error: revError } = await db
    .from("article_fields")
    .select("key")
    .eq("article_id", article_id)
    .neq("status", "pending");
  if (revError) throw new Error(`ler campos revisados: ${revError.message}`);
  const reviewed = new Set((reviewedRows ?? []).map((r) => r.key));

  const rows = buildFieldRows(extraction, pages, language.code).filter((r) => !reviewed.has(r.key));
  const { error: delError } = await db
    .from("article_fields")
    .delete()
    .eq("article_id", article_id)
    .eq("status", "pending");
  if (delError) throw new Error(`limpar campos: ${delError.message}`);
  if (rows.length) {
    const { error: insError } = await db
      .from("article_fields")
      .insert(rows.map((r) => ({ article_id, model, ...r })));
    if (insError) throw new Error(`gravar campos: ${insError.message}`);
  }

  // Metadado corrigido à mão não é sobrescrito.
  const metadata =
    article.metadata_source === "manual"
      ? {}
      : {
          title: meta.title,
          subtitle: meta.subtitle,
          authors: meta.authors,
          year: meta.year,
          venue: meta.venue,
          volume: meta.volume,
          issue: meta.issue,
          pages: meta.pages,
          doi: meta.doi,
          language: meta.language,
          metadata_source: crossref ? "crossref" : "llm",
        };

  const { error: updError } = await db
    .from("articles")
    .update({ ...metadata, status: statusAfterExtract(rows, reviewed.size), error: null })
    .eq("id", article_id);
  if (updError) throw new Error(`atualizar artigo: ${updError.message}`);
}

export function supabaseWorkerDeps(db: AdminClient): WorkerDeps {
  const queue = supabaseQueue(db);
  return {
    queue,
    handlers: {
      parse: (m) => parseStage(db, queue, m),
      extract: (m) => extractStage(db, m),
    },
    async markFailed(articleId, error) {
      await db.from("articles").update({ status: "failed", error }).eq("id", articleId);
    },
    async recordError(articleId, error) {
      await db.from("articles").update({ error }).eq("id", articleId);
    },
    log: (m) => console.error(`[worker] ${m}`),
  };
}
