/**
 * Specs 005 (campos opcionais) e 006 (glossário) contra o Supabase local:
 * campos opcionais por projeto, RLS e limites de conceitos e definições, e a
 * busca de definições que vai para a fila.
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
  const email = `gloss-${tag}-${run}@example.test`;
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
  const sha = `${(await sha256Hex(pdf)).slice(0, 60)}${salt}`;
  const path = pdfStoragePath(user.id, sha);
  await user.client.storage.from("pdfs").upload(path, pdf, { contentType: "application/pdf" });
  const { data, error } = await user.client
    .from("articles")
    .insert({ project_id: projectId, sha256: sha, storage_path: path })
    .select("id")
    .single();
  if (error) throw error;
  await admin.from("article_pages").insert({ article_id: data.id, pdf_page: 1, text: "Resilience is defined as adaptation." });
  return data.id;
}

let A: User;
let B: User;
let project: string;
let other: string;
let article: string;
let otherArticle: string;
let concept: string;

beforeAll(async () => {
  [A, B] = await Promise.all([userClient("a"), userClient("b")]);
  const p = await A.client.from("projects").insert({ name: "Glossário" }).select("id").single();
  const o = await A.client.from("projects").insert({ name: "Outro" }).select("id").single();
  project = p.data!.id;
  other = o.data!.id;
  article = await newArticle(A, project, "0011");
  otherArticle = await newArticle(A, other, "0012");
});

describe("campos opcionais (spec 005)", () => {
  it("projeto novo começa com limitações e trabalhos futuros", async () => {
    const { data } = await A.client.from("projects").select("optional_fields").eq("id", project).single();
    expect(data!.optional_fields).toEqual(["limitations", "future_work"]);
  });

  it("aceita só as chaves conhecidas", async () => {
    const ok = await A.client.from("projects").update({ optional_fields: ["gaps"] }).eq("id", project);
    expect(ok.error).toBeNull();
    const bad = await A.client.from("projects").update({ optional_fields: ["inventado"] }).eq("id", project);
    expect(bad.error).not.toBeNull();
  });
});

describe("glossário (spec 006)", () => {
  it("conceito: nome único por projeto; outro usuário não vê nem cria", async () => {
    const c = await A.client.from("concepts").insert({ project_id: project, name: "Resiliência" }).select("id").single();
    expect(c.error).toBeNull();
    concept = c.data!.id;
    const dup = await A.client.from("concepts").insert({ project_id: project, name: " resiliência" });
    expect(dup.error?.code).toBe("23505");
    expect((await B.client.from("concepts").select("id").eq("project_id", project)).data).toEqual([]);
    expect((await B.client.from("concepts").insert({ project_id: project, name: "X" })).error).not.toBeNull();
  });

  it("definição: conceito e artigo do mesmo projeto; só status, origem e tipo mudam", async () => {
    const d = await A.client
      .from("definitions")
      .insert({ concept_id: concept, article_id: article, text: "Resilience is defined as adaptation.", source: "manual" })
      .select("id")
      .single();
    expect(d.error).toBeNull();

    const cross = await A.client
      .from("definitions")
      .insert({ concept_id: concept, article_id: otherArticle, text: "outro projeto" });
    expect(cross.error).not.toBeNull();

    const ok = await A.client.from("definitions").update({ status: "accepted", kind: "operationalization" }).eq("id", d.data!.id);
    expect(ok.error).toBeNull();
    const text = await A.client.from("definitions").update({ text: "mudado" }).eq("id", d.data!.id);
    expect(text.error).not.toBeNull();

    const theirs = await B.client.from("definitions").select("id").eq("article_id", article);
    expect(theirs.data).toEqual([]);
  });

  it("buscar definições põe um estágio 'definitions' por artigo na fila", async () => {
    const r = await A.client.rpc("request_definitions", { p_project: project });
    expect(r.error).toBeNull();
    expect(r.data).toBe(1);
    const theirs = await B.client.rpc("request_definitions", { p_project: project });
    expect(theirs.error).not.toBeNull();
    const empty = await A.client.rpc("request_definitions", { p_project: other });
    expect(empty.error?.message).toContain("conceito");
  });

  it("limite de 30 conceitos por projeto", async () => {
    const rows = Array.from({ length: 29 }, (_, i) => ({ project_id: project, name: `conceito ${i}` }));
    expect((await A.client.from("concepts").insert(rows)).error).toBeNull();
    const over = await A.client.from("concepts").insert({ project_id: project, name: "a mais" });
    expect(over.error?.code).toBe("23514");
  });

  it("remover o conceito apaga as definições dele", async () => {
    await A.client.from("concepts").delete().eq("id", concept);
    const { count } = await admin.from("definitions").select("*", { count: "exact", head: true }).eq("concept_id", concept);
    expect(count).toBe(0);
  });
});
