/**
 * Verificação automática (F2) contra o Supabase local: o que o usuário pode e
 * não pode gravar nas colunas novas.
 */
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const admin = createAdminClient();
const run = Date.now();

async function userClient(tag: string) {
  const email = `f2-${tag}-${run}@example.test`;
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

beforeAll(async () => {
  [A, B] = await Promise.all([userClient("a"), userClient("b")]);
  const { data: p } = await A.client.from("projects").insert({ name: "F2" }).select("id").single();
  projectId = p!.id;
  const { data: a } = await admin
    .from("articles")
    .insert({ project_id: projectId, sha256: "e".repeat(64), storage_path: `${A.id}/f2.pdf`, status: "extracted" })
    .select("id")
    .single();
  articleId = a!.id;
  await admin.from("article_fields").insert({
    article_id: articleId,
    key: "objective",
    value: "Objetivo",
    verified: true,
    source: "llm",
    status: "accepted",
    auto_approved: true,
    audit_pending: true,
    agrees: true,
    supported: true,
    from_study: true,
  });
});

describe("verificação automática", () => {
  it("dono configura a verificação do projeto; outro usuário não", async () => {
    const mine = await A.client
      .from("projects")
      .update({ auto_approve: true, critical_fields: ["results", "method"] })
      .eq("id", projectId)
      .select("auto_approve, critical_fields");
    expect(mine.data).toEqual([{ auto_approve: true, critical_fields: ["results", "method"] }]);

    const theirs = await B.client.from("projects").update({ auto_approve: false }).eq("id", projectId).select("id");
    expect(theirs.data).toEqual([]);
  });

  it("usuário não grava veredictos do juiz nem o valor do segundo modelo", async () => {
    for (const patch of [{ agrees: false }, { value_b: "x" }, { supported: false }, { judge_note: "x" }]) {
      const { error } = await A.client.from("article_fields").update(patch).eq("article_id", articleId);
      expect(error, JSON.stringify(patch)).not.toBeNull();
    }
  });

  it("auditoria: dono grava o resultado; incorreto volta para revisão e o artigo sai de validado", async () => {
    const { error } = await A.client
      .from("article_fields")
      .update({ audit_pending: false, audit_result: "incorrect", status: "pending", auto_approved: false })
      .eq("article_id", articleId)
      .eq("key", "objective");
    expect(error).toBeNull();
    const { data } = await A.client.from("articles").select("status").eq("id", articleId).single();
    expect(data?.status).toBe("extracted");
  });
});
