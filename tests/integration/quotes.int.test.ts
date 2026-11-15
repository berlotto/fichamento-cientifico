/**
 * Spec 002 (citações marcadas à mão) contra o Supabase local: RLS, colunas que
 * não mudam depois de gravadas, limites e independência da reextração.
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
  const email = `quote-${tag}-${run}@example.test`;
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
let quoteId: string;

beforeAll(async () => {
  [A, B] = await Promise.all([userClient("a"), userClient("b")]);
  const { data: p } = await A.client.from("projects").insert({ name: "Citações" }).select("id").single();
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
});

describe("citações marcadas à mão", () => {
  it("o dono guarda e lê; outro usuário não vê, não grava, não altera", async () => {
    const ins = await A.client
      .from("quotes")
      .insert({ article_id: articleId, text: "a amostra foi pequena", pdf_page: 3, printed_page: "16" })
      .select("id")
      .single();
    expect(ins.error).toBeNull();
    quoteId = ins.data!.id;

    const theirs = await B.client.from("quotes").select("id").eq("article_id", articleId);
    expect(theirs.data).toEqual([]);

    const write = await B.client.from("quotes").insert({ article_id: articleId, text: "invasão", pdf_page: 1 });
    expect(write.error).not.toBeNull();

    const edit = await B.client.from("quotes").update({ comment: "invadido" }).eq("id", quoteId).select("id");
    expect(edit.data).toEqual([]);

    const del = await B.client.from("quotes").delete().eq("id", quoteId).select("id");
    expect(del.data).toEqual([]);
  });

  it("só o comentário pode mudar; trecho e página ficam como foram conferidos", async () => {
    const ok = await A.client.from("quotes").update({ comment: "limitação" }).eq("id", quoteId).select("comment");
    expect(ok.data).toEqual([{ comment: "limitação" }]);

    const text = await A.client.from("quotes").update({ text: "outro texto qualquer" }).eq("id", quoteId);
    expect(text.error).not.toBeNull();
    const page = await A.client.from("quotes").update({ pdf_page: 9 }).eq("id", quoteId);
    expect(page.error).not.toBeNull();
  });

  it("recusa trecho vazio ou longo demais e comentário longo demais", async () => {
    const empty = await A.client.from("quotes").insert({ article_id: articleId, text: "  ", pdf_page: 1 });
    expect(empty.error).not.toBeNull();
    const long = await A.client.from("quotes").insert({ article_id: articleId, text: "x".repeat(2001), pdf_page: 1 });
    expect(long.error).not.toBeNull();
    const comment = await A.client
      .from("quotes")
      .insert({ article_id: articleId, text: "ok ok ok", pdf_page: 1, comment: "x".repeat(2001) });
    expect(comment.error).not.toBeNull();
  });

  it("limite de 200 citações por artigo", async () => {
    const { count } = await admin.from("quotes").select("*", { count: "exact", head: true }).eq("article_id", articleId);
    const missing = 200 - (count ?? 0);
    const rows = Array.from({ length: missing }, (_, i) => ({ article_id: articleId, text: `trecho ${i}`, pdf_page: 1 }));
    const fill = await A.client.from("quotes").insert(rows);
    expect(fill.error).toBeNull();
    const over = await A.client.from("quotes").insert({ article_id: articleId, text: "a mais", pdf_page: 1 });
    expect(over.error?.code).toBe("23514");
    await admin.from("quotes").delete().eq("article_id", articleId).like("text", "trecho %");
  });

  it("a citação sobrevive quando a reextração regrava páginas e campos", async () => {
    await admin.from("article_pages").delete().eq("article_id", articleId);
    await admin.from("article_fields").delete().eq("article_id", articleId);
    const { data } = await A.client.from("quotes").select("text, comment").eq("id", quoteId);
    expect(data).toEqual([{ text: "a amostra foi pequena", comment: "limitação" }]);
  });

  it("excluir o artigo apaga as citações", async () => {
    await A.client.from("articles").delete().eq("id", articleId);
    const { count } = await admin.from("quotes").select("*", { count: "exact", head: true }).eq("article_id", articleId);
    expect(count).toBe(0);
  });
});
