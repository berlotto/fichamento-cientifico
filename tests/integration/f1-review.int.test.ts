/**
 * Revisão, reextração e limpeza de PDFs contra o Supabase local.
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
  const email = `rev-${tag}-${run}@example.test`;
  const password = "senha-de-teste-123";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = createClient<Database>(url, anonKey, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password });
  return { client, id: data.user.id };
}

let A: Awaited<ReturnType<typeof userClient>>;
let B: Awaited<ReturnType<typeof userClient>>;
let projectId: string;
let articleId: string;
let path: string;

beforeAll(async () => {
  [A, B] = await Promise.all([userClient("a"), userClient("b")]);
  const { data: p } = await A.client.from("projects").insert({ name: "Revisão" }).select("id").single();
  projectId = p!.id;

  const pdf = sampleArticlePdf();
  const sha = await sha256Hex(pdf);
  path = pdfStoragePath(A.id, sha);
  await A.client.storage.from("pdfs").upload(path, pdf, { contentType: "application/pdf" });
  const { data: a } = await A.client
    .from("articles")
    .insert({ project_id: projectId, sha256: sha, storage_path: path })
    .select("id")
    .single();
  articleId = a!.id;

  // Simula a extração (o worker grava com o service role).
  await admin.from("articles").update({ status: "needs_review" }).eq("id", articleId);
  await admin.from("article_fields").insert([
    { article_id: articleId, key: "objective", value: "Objetivo X", verified: true, source: "llm", llm_value: "Objetivo X" },
    { article_id: articleId, key: "method", value: "Método Y", verified: false, source: "llm", llm_value: "Método Y" },
  ]);
});

const status = async () =>
  (await A.client.from("articles").select("status").eq("id", articleId).single()).data?.status;

describe("revisão", () => {
  it("aceitar e rejeitar todos os campos deixa o artigo verified; desfazer volta", async () => {
    await A.client.from("article_fields").update({ status: "accepted" }).eq("article_id", articleId).eq("key", "objective");
    expect(await status()).toBe("needs_review");

    await A.client.from("article_fields").update({ status: "rejected" }).eq("article_id", articleId).eq("key", "method");
    expect(await status()).toBe("verified");

    await A.client.from("article_fields").update({ status: "pending" }).eq("article_id", articleId).eq("key", "method");
    expect(await status()).toBe("needs_review");
  });

  it("usuário não altera o valor original do LLM nem campos de outro usuário", async () => {
    const own = await A.client.from("article_fields").update({ llm_value: "x" }).eq("article_id", articleId);
    expect(own.error).not.toBeNull();

    const other = await B.client
      .from("article_fields")
      .update({ value: "invadido" })
      .eq("article_id", articleId)
      .select("key");
    expect(other.data).toEqual([]);
  });

  it("request_extract: dono enfileira; outro usuário não", async () => {
    const theirs = await B.client.rpc("request_extract", { article: articleId });
    expect(theirs.error?.message).toMatch(/não encontrado/);

    const mine = await A.client.rpc("request_extract", { article: articleId });
    expect(mine.error).toBeNull();
    expect(await status()).toBe("parsed");
  });

  it("campos personalizados: só o dono do projeto vê e cria", async () => {
    const ok = await A.client.from("project_fields").insert({ project_id: projectId, key: "amostra", label: "Amostra" });
    expect(ok.error).toBeNull();
    const bad = await B.client.from("project_fields").insert({ project_id: projectId, key: "x_y", label: "X" });
    expect(bad.error).not.toBeNull();
    const { data } = await B.client.from("project_fields").select("key").eq("project_id", projectId);
    expect(data).toEqual([]);
  });
});

describe("limpeza de PDFs (A11)", () => {
  it("outro usuário não apaga o PDF; o dono apaga", async () => {
    const theirs = await B.client.storage.from("pdfs").remove([path]);
    expect(theirs.data ?? []).toEqual([]);
    const still = await admin.storage.from("pdfs").list(A.id);
    expect(still.data?.some((f) => path.endsWith(f.name))).toBe(true);

    const mine = await A.client.storage.from("pdfs").remove([path]);
    expect(mine.data).toHaveLength(1);
  });
});
