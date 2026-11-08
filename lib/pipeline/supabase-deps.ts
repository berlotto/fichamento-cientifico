import "server-only";

import type { AdminClient } from "@/lib/supabase/admin";
import { parsePdf } from "./parse";
import type { PipelineMessage, Queue, QueueMessage, WorkerDeps } from "./worker";

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

/** Estágio parse: baixa o PDF, extrai texto por página, grava article_pages. Idempotente. */
async function parseStage(db: AdminClient, { article_id }: PipelineMessage) {
  const { data: article, error } = await db
    .from("articles")
    .select("id, storage_path")
    .eq("id", article_id)
    .single();
  if (error || !article) throw new Error(`artigo não encontrado: ${error?.message ?? article_id}`);

  const { data: blob, error: dlError } = await db.storage.from("pdfs").download(article.storage_path);
  if (dlError || !blob) throw new Error(`download: ${dlError?.message}`);

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
}

export function supabaseWorkerDeps(db: AdminClient): WorkerDeps {
  return {
    queue: supabaseQueue(db),
    handlers: { parse: (m) => parseStage(db, m) },
    async markFailed(articleId, error) {
      await db.from("articles").update({ status: "failed", error }).eq("id", articleId);
    },
    async recordError(articleId, error) {
      await db.from("articles").update({ error }).eq("id", articleId);
    },
    log: (m) => console.error(`[worker] ${m}`),
  };
}
