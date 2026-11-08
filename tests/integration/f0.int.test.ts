/**
 * Critérios de F0 contra o Supabase local:
 * - RLS: usuário B não vê nem altera nada do usuário A (F0.2)
 * - usuário não altera colunas do pipeline (status)
 * - upload + insert enfileiram o parse; worker grava páginas (F0.5, F0.6, F0.8)
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { supabaseWorkerDeps } from "@/lib/pipeline/supabase-deps";
import { runWorker } from "@/lib/pipeline/worker";
import { pdfStoragePath, sha256Hex } from "@/lib/sha256";
import { sampleArticlePdf } from "@/tests/fixtures/make-pdf";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const admin = createAdminClient();
const run = Date.now();

async function userClient(tag: string) {
  const email = `f0-${tag}-${run}@example.test`;
  const password = "senha-de-teste-123";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = createClient<Database>(url, anonKey, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { client, id: data.user.id };
}

let A: { client: SupabaseClient<Database>; id: string };
let B: { client: SupabaseClient<Database>; id: string };
let projectId: string;
let articleId: string;
let storagePath: string;

beforeAll(async () => {
  A = await userClient("a");
  B = await userClient("b");
});

afterAll(async () => {
  if (storagePath) await admin.storage.from("pdfs").remove([storagePath]);
  for (const u of [A, B]) if (u) await admin.auth.admin.deleteUser(u.id);
});

describe("F0", () => {
  it("A cria projeto, sobe PDF e cadastra artigo", async () => {
    const { data: project, error } = await A.client
      .from("projects")
      .insert({ name: "Projeto de teste" })
      .select("id")
      .single();
    expect(error).toBeNull();
    projectId = project!.id;

    const pdf = sampleArticlePdf();
    const sha256 = await sha256Hex(pdf);
    storagePath = pdfStoragePath(A.id, sha256);

    const up = await A.client.storage
      .from("pdfs")
      .upload(storagePath, pdf, { contentType: "application/pdf", upsert: true });
    expect(up.error).toBeNull();

    const { data: article, error: insError } = await A.client
      .from("articles")
      .insert({ project_id: projectId, sha256, storage_path: storagePath, original_filename: "teste.pdf" })
      .select("id, status")
      .single();
    expect(insError).toBeNull();
    expect(article!.status).toBe("uploaded");
    articleId = article!.id;
  });

  it("o mesmo PDF no mesmo projeto é recusado", async () => {
    const sha256 = await sha256Hex(sampleArticlePdf());
    const { error } = await A.client
      .from("articles")
      .insert({ project_id: projectId, sha256, storage_path: storagePath });
    expect(error?.code).toBe("23505");
  });

  it("A não consegue mudar o status do artigo", async () => {
    const { error } = await A.client.from("articles").update({ status: "verified" }).eq("id", articleId);
    expect(error).not.toBeNull();
  });

  it("A não grava PDF na pasta de outro usuário nem artigo apontando para ela", async () => {
    const up = await A.client.storage
      .from("pdfs")
      .upload(`${B.id}/${"0".repeat(64)}.pdf`, sampleArticlePdf(), { contentType: "application/pdf" });
    expect(up.error).not.toBeNull();

    const { error } = await A.client
      .from("articles")
      .insert({ project_id: projectId, sha256: "1".repeat(64), storage_path: `${B.id}/x.pdf` });
    expect(error).not.toBeNull();
  });

  it("o worker processa o parse enfileirado pelo trigger e enfileira a extração", async () => {
    // A extração chama o LLM (AI Gateway): aqui só verificamos que o parse a enfileirou.
    const deps = supabaseWorkerDeps(admin);
    const extracted: string[] = [];
    deps.handlers.extract = async (m) => {
      extracted.push(m.article_id);
    };
    const result = await runWorker(deps, 30_000);
    expect(result.processed).toBeGreaterThanOrEqual(2);
    expect(extracted).toContain(articleId);

    const { data: article } = await A.client
      .from("articles")
      .select("status, page_count, error")
      .eq("id", articleId)
      .single();
    expect(article).toMatchObject({ status: "parsed", page_count: 5, error: null });

    const { data: pages } = await A.client
      .from("article_pages")
      .select("pdf_page, printed_page, text")
      .eq("article_id", articleId)
      .order("pdf_page");
    expect(pages?.map((p) => p.printed_page)).toEqual([null, "215", "216", "217", "218"]);
    expect(pages?.[3].text).toContain("12.4 per 1000");
  });

  it("B não vê projeto, artigo, páginas nem PDF de A", async () => {
    const projects = await B.client.from("projects").select("id").eq("id", projectId);
    const articles = await B.client.from("articles").select("id").eq("id", articleId);
    const pages = await B.client.from("article_pages").select("pdf_page").eq("article_id", articleId);
    const file = await B.client.storage.from("pdfs").download(storagePath);
    expect(projects.data).toEqual([]);
    expect(articles.data).toEqual([]);
    expect(pages.data).toEqual([]);
    expect(file.error).not.toBeNull();
  });

  it("B não insere artigo no projeto de A", async () => {
    const { error } = await B.client
      .from("articles")
      .insert({ project_id: projectId, sha256: "2".repeat(64), storage_path: `${B.id}/y.pdf` });
    expect(error).not.toBeNull();
  });

  it("cliente logado não acessa a fila", async () => {
    const { error } = await A.client.rpc("queue_read", { qty: 1, vt_seconds: 1 });
    expect(error).not.toBeNull();
  });
});
