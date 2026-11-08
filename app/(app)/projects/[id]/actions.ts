"use server";

import { requireUser } from "@/lib/auth";
import { FetchPdfError, fetchPdf } from "@/lib/fetch-pdf";
import { pdfStoragePath, sha256Hex } from "@/lib/sha256";
import { createClient } from "@/lib/supabase/server";

export type ImportUrlState = { ok?: boolean; error?: string; filename?: string };

/**
 * Importa um artigo a partir de um link (PDF direto ou página do artigo).
 * O servidor baixa o PDF e grava no Storage com a sessão do usuário (RLS vale);
 * o insert dispara o mesmo pipeline do upload.
 */
export async function importFromUrl(_: ImportUrlState, formData: FormData): Promise<ImportUrlState> {
  const projectId = String(formData.get("projectId") ?? "");
  const url = String(formData.get("url") ?? "").trim();
  if (!url) return { error: "Cole o endereço do artigo." };

  const user = await requireUser();
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).maybeSingle();
  if (!project) return { error: "Projeto não encontrado." };

  let pdf;
  try {
    pdf = await fetchPdf(url);
  } catch (e) {
    return { error: e instanceof FetchPdfError ? e.message : "Não foi possível baixar o arquivo." };
  }

  const sha256 = await sha256Hex(pdf.bytes);
  const path = pdfStoragePath(user.id, sha256);
  const up = await supabase.storage
    .from("pdfs")
    .upload(path, pdf.bytes, { contentType: "application/pdf", upsert: false });
  // Mesmo PDF já enviado antes (outro projeto): reaproveita o arquivo.
  if (up.error && !/already exists|duplicate/i.test(up.error.message)) {
    return { error: `Falha ao gravar o PDF: ${up.error.message}` };
  }

  const ins = await supabase.from("articles").insert({
    project_id: projectId,
    sha256,
    storage_path: path,
    original_filename: pdf.filename,
    source_url: url,
  });
  if (ins.error?.code === "23505") return { error: "Este artigo já está no projeto." };
  if (ins.error) return { error: `Falha ao registrar o artigo: ${ins.error.message}` };

  return { ok: true, filename: pdf.filename };
}
