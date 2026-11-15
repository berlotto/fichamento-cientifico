/**
 * Specs 003 (tags e temas) e 004 (situação de leitura) contra o Supabase local:
 * grants por coluna, RLS, regras dos triggers, juntar tags e cascatas.
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
  const email = `tags-${tag}-${run}@example.test`;
  const password = "senha-de-teste-123";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = createClient<Database>(url, anonKey, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password });
  return { client, id: data.user.id };
}

type User = Awaited<ReturnType<typeof userClient>>;

async function newArticle(user: User, projectId: string, salt: string) {
  const pdf = sampleArticlePdf();
  const sha = await sha256Hex(pdf);
  const path = pdfStoragePath(user.id, `${sha.slice(0, 50)}${salt}`);
  await user.client.storage.from("pdfs").upload(path, pdf, { contentType: "application/pdf" });
  const { data, error } = await user.client
    .from("articles")
    .insert({ project_id: projectId, sha256: `${sha.slice(0, 60)}${salt}`, storage_path: path })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

let A: User;
let B: User;
let projectA: string;
let projectA2: string;
let articleA: string;
let articleA2: string;

beforeAll(async () => {
  [A, B] = await Promise.all([userClient("a"), userClient("b")]);
  const { data: p } = await A.client.from("projects").insert({ name: "Tags" }).select("id").single();
  const { data: p2 } = await A.client.from("projects").insert({ name: "Outro" }).select("id").single();
  projectA = p!.id;
  projectA2 = p2!.id;
  articleA = await newArticle(A, projectA, "0001");
  articleA2 = await newArticle(A, projectA2, "0002");
});

describe("situação de leitura (spec 004)", () => {
  it("começa como 'a ler', sem relevância e sem estrela", async () => {
    const { data } = await A.client.from("articles").select("reading_status, relevance, starred").eq("id", articleA).single();
    expect(data).toEqual({ reading_status: "to_read", relevance: null, starred: false });
  });

  it("o dono muda situação, relevância e estrela sem tocar no status do pipeline", async () => {
    const before = await admin.from("articles").select("status").eq("id", articleA).single();
    const r = await A.client
      .from("articles")
      .update({ reading_status: "noted", relevance: "central", starred: true })
      .eq("id", articleA)
      .select("reading_status, relevance, starred, status");
    expect(r.data).toEqual([{ reading_status: "noted", relevance: "central", starred: true, status: before.data!.status }]);
  });

  it("o usuário não altera o status do pipeline (grant por coluna)", async () => {
    const r = await A.client.from("articles").update({ status: "verified" }).eq("id", articleA);
    expect(r.error).not.toBeNull();
  });

  it("recusa valores fora da lista; outro usuário não altera", async () => {
    const bad = await A.client.from("articles").update({ reading_status: "lixo" }).eq("id", articleA);
    expect(bad.error).not.toBeNull();
    const theirs = await B.client.from("articles").update({ starred: false }).eq("id", articleA).select("id");
    expect(theirs.data).toEqual([]);
  });

  it("project_stats conta por situação, relevância e estrela", async () => {
    const { data } = await A.client.rpc("project_stats", { p_project: projectA });
    const stats = data as { reading: Record<string, number>; relevance: Record<string, number>; starred: number };
    expect(stats.reading).toEqual({ noted: 1 });
    expect(stats.relevance).toEqual({ central: 1 });
    expect(stats.starred).toBe(1);
  });
});

describe("tags e marcações (spec 003)", () => {
  let tema: string;
  let sub: string;
  let outra: string;

  it("cria tema e subtema; nome repetido (sem diferenciar maiúsculas) é recusado", async () => {
    const t = await A.client.from("tags").insert({ project_id: projectA, name: "Amostra" }).select("id").single();
    tema = t.data!.id;
    const s = await A.client.from("tags").insert({ project_id: projectA, name: "Tamanho", parent_id: tema }).select("id").single();
    expect(s.error).toBeNull();
    sub = s.data!.id;
    const dup = await A.client.from("tags").insert({ project_id: projectA, name: "  amostra " });
    expect(dup.error?.code).toBe("23505");
    const o = await A.client.from("tags").insert({ project_id: projectA, name: "Viés" }).select("id").single();
    outra = o.data!.id;
  });

  it("só um nível: subtema de subtema é recusado; tema de outro projeto também", async () => {
    const neto = await A.client.from("tags").insert({ project_id: projectA, name: "Neto", parent_id: sub });
    expect(neto.error).not.toBeNull();
    const cross = await A.client.from("tags").insert({ project_id: projectA2, name: "X", parent_id: tema });
    expect(cross.error).not.toBeNull();
  });

  it("marca artigo, campo e citação; tag de outro projeto não marca", async () => {
    const { data: q } = await A.client
      .from("quotes")
      .insert({ article_id: articleA, text: "amostra de 40 pacientes", pdf_page: 1 })
      .select("id")
      .single();
    const rows = [
      { tag_id: tema, article_id: articleA },
      { tag_id: sub, article_id: articleA, field_key: "method" },
      { tag_id: outra, article_id: articleA, quote_id: q!.id },
      { tag_id: tema, article_id: articleA, quote_id: q!.id },
    ];
    const ins = await A.client.from("taggings").insert(rows);
    expect(ins.error).toBeNull();

    const again = await A.client.from("taggings").insert({ tag_id: tema, article_id: articleA });
    expect(again.error?.code).toBe("23505");

    const cross = await A.client.from("taggings").insert({ tag_id: tema, article_id: articleA2 });
    expect(cross.error).not.toBeNull();

    const both = await A.client.from("taggings").insert({ tag_id: outra, article_id: articleA, field_key: "method", quote_id: q!.id });
    expect(both.error).not.toBeNull();
  });

  it("outro usuário não vê nem cria tags e marcações do projeto", async () => {
    const t = await B.client.from("tags").select("id").eq("project_id", projectA);
    expect(t.data).toEqual([]);
    const m = await B.client.from("taggings").select("id").eq("article_id", articleA);
    expect(m.data).toEqual([]);
    const ins = await B.client.from("tags").insert({ project_id: projectA, name: "Invasão" });
    expect(ins.error).not.toBeNull();
  });

  it("juntar 'Viés' em 'Amostra' move as marcações sem duplicar e apaga 'Viés'", async () => {
    const r = await A.client.rpc("merge_tags", { src: outra, dst: tema });
    expect(r.error).toBeNull();
    const gone = await A.client.from("tags").select("id").eq("id", outra);
    expect(gone.data).toEqual([]);
    const { data } = await A.client.from("taggings").select("tag_id, field_key, quote_id").eq("article_id", articleA);
    // Artigo inteiro + citação (já marcada com Amostra: não duplica) + campo no subtema.
    expect(data!.filter((t) => t.tag_id === tema)).toHaveLength(2);
    expect(data!.filter((t) => t.tag_id === sub)).toHaveLength(1);
  });

  it("excluir o tema solta o subtema e apaga as marcações do tema", async () => {
    await A.client.from("tags").delete().eq("id", tema);
    const { data: s } = await A.client.from("tags").select("parent_id").eq("id", sub).single();
    expect(s!.parent_id).toBeNull();
    const { data } = await A.client.from("taggings").select("tag_id").eq("article_id", articleA);
    expect(data).toEqual([{ tag_id: sub }]);
  });

  it("limite de 300 tags por projeto", async () => {
    const { count } = await admin.from("tags").select("*", { count: "exact", head: true }).eq("project_id", projectA);
    const rows = Array.from({ length: 300 - (count ?? 0) }, (_, i) => ({ project_id: projectA, name: `t${i}` }));
    expect((await A.client.from("tags").insert(rows)).error).toBeNull();
    const over = await A.client.from("tags").insert({ project_id: projectA, name: "a mais" });
    expect(over.error?.code).toBe("23514");
  });

  it("excluir o artigo apaga as marcações dele", async () => {
    await A.client.from("articles").delete().eq("id", articleA);
    const { count } = await admin.from("taggings").select("*", { count: "exact", head: true }).eq("article_id", articleA);
    expect(count).toBe(0);
  });
});
