/**
 * Spec 001 (comentário crítico) contra o Supabase local: RLS dos comentários
 * por campo e da análise crítica, limites de tamanho e independência da
 * reextração.
 */
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { pdfStoragePath, sha256Hex } from "@/lib/sha256";
import { sampleArticlePdf } from "@/tests/fixtures/make-pdf";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const admin = createAdminClient();
const run = Date.now();

async function userClient(tag: string) {
  const email = `crit-${tag}-${run}@example.test`;
  const password = "senha-de-teste-123";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = createClient<Database>(url, anonKey, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password });
  return { client, id: data.user.id };
}

let A: Awaited<ReturnType<typeof userClient>>;
let B: Awaited<ReturnType<typeof userClient>>;
let articleId: string;

beforeAll(async () => {
  [A, B] = await Promise.all([userClient("a"), userClient("b")]);
  const { data: p } = await A.client.from("projects").insert({ name: "Crítica" }).select("id").single();

  const pdf = sampleArticlePdf();
  const sha = await sha256Hex(pdf);
  const path = pdfStoragePath(A.id, sha);
  await A.client.storage.from("pdfs").upload(path, pdf, { contentType: "application/pdf" });
  const { data: a } = await A.client
    .from("articles")
    .insert({ project_id: p!.id, sha256: sha, storage_path: path })
    .select("id")
    .single();
  articleId = a!.id;

  await admin.from("article_fields").insert({
    article_id: articleId,
    key: "method",
    value: "Ensaio com 40 pacientes",
    verified: true,
    source: "llm",
    llm_value: "Ensaio com 40 pacientes",
  });
});

describe("comentário por campo", () => {
  it("o dono cria, edita e lê; outro usuário não vê nem altera", async () => {
    const ins = await A.client
      .from("field_comments")
      .upsert({ article_id: articleId, field_key: "method", body: "amostra pequena" });
    expect(ins.error).toBeNull();

    const upd = await A.client
      .from("field_comments")
      .upsert({ article_id: articleId, field_key: "method", body: "amostra pequena, um hospital só" });
    expect(upd.error).toBeNull();

    const mine = await A.client.from("field_comments").select("body").eq("article_id", articleId);
    expect(mine.data).toEqual([{ body: "amostra pequena, um hospital só" }]);

    const theirs = await B.client.from("field_comments").select("body").eq("article_id", articleId);
    expect(theirs.data).toEqual([]);

    const write = await B.client
      .from("field_comments")
      .insert({ article_id: articleId, field_key: "results", body: "invasão" });
    expect(write.error).not.toBeNull();

    const edit = await B.client
      .from("field_comments")
      .update({ body: "invadido" })
      .eq("article_id", articleId)
      .select("body");
    expect(edit.data).toEqual([]);

    const del = await B.client.from("field_comments").delete().eq("article_id", articleId).select("body");
    expect(del.data).toEqual([]);
  });

  it("recusa comentário vazio, longo demais ou chave inválida", async () => {
    const empty = await A.client.from("field_comments").insert({ article_id: articleId, field_key: "results", body: "   " });
    expect(empty.error).not.toBeNull();
    const long = await A.client
      .from("field_comments")
      .insert({ article_id: articleId, field_key: "results", body: "x".repeat(5001) });
    expect(long.error).not.toBeNull();
    const key = await A.client.from("field_comments").insert({ article_id: articleId, field_key: "Bad Key", body: "ok" });
    expect(key.error).not.toBeNull();
  });

  it("o comentário sobrevive quando a reextração apaga e regrava o campo", async () => {
    await admin.from("article_fields").delete().eq("article_id", articleId).eq("key", "method");
    await admin.from("article_fields").insert({
      article_id: articleId,
      key: "method",
      value: "Ensaio randomizado com 40 pacientes",
      verified: true,
      source: "llm",
      llm_value: "Ensaio randomizado com 40 pacientes",
    });
    const { data } = await A.client.from("field_comments").select("body").eq("article_id", articleId).eq("field_key", "method");
    expect(data).toEqual([{ body: "amostra pequena, um hospital só" }]);
  });
});

describe("análise crítica do artigo", () => {
  it("o dono grava as quatro partes; outro usuário não", async () => {
    const own = await A.client
      .from("articles")
      .update({
        crit_strengths: "desenho claro",
        crit_weaknesses: "sem grupo controle",
        crit_relevance: "capítulo 2",
        notes: "ver Silva 2020",
      })
      .eq("id", articleId)
      .select("crit_strengths, crit_weaknesses, crit_relevance, notes");
    expect(own.data).toEqual([
      { crit_strengths: "desenho claro", crit_weaknesses: "sem grupo controle", crit_relevance: "capítulo 2", notes: "ver Silva 2020" },
    ]);

    const theirs = await B.client
      .from("articles")
      .update({ crit_strengths: "invadido" })
      .eq("id", articleId)
      .select("id");
    expect(theirs.data).toEqual([]);
  });

  it("recusa texto acima do limite", async () => {
    const r = await A.client.from("articles").update({ crit_weaknesses: "x".repeat(10001) }).eq("id", articleId);
    expect(r.error).not.toBeNull();
  });

  it("excluir o artigo apaga os comentários", async () => {
    await A.client.from("articles").delete().eq("id", articleId);
    const { count } = await admin
      .from("field_comments")
      .select("*", { count: "exact", head: true })
      .eq("article_id", articleId);
    expect(count).toBe(0);
  });
});
