"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { checkQuote, MAX_QUOTE_COMMENT, MAX_QUOTES_PER_ARTICLE } from "@/lib/quotes";
import { createClient } from "@/lib/supabase/server";

export type SaveQuoteResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Guarda o trecho selecionado no painel de texto (spec 002). O trecho é
 * conferido no texto da página antes de gravar, então a citação já nasce
 * verificada; a página impressa vem da heurística gravada em article_pages.
 */
export async function saveQuote(
  articleId: string,
  pdfPage: number,
  selection: string,
  comment: string,
): Promise<SaveQuoteResult> {
  await requireUser();
  if (!Number.isInteger(pdfPage) || pdfPage < 1) return { ok: false, error: "Página inválida." };

  const supabase = await createClient();
  // RLS: só lê a página se o artigo for do usuário.
  const { data: page } = await supabase
    .from("article_pages")
    .select("text, printed_page")
    .eq("article_id", articleId)
    .eq("pdf_page", pdfPage)
    .maybeSingle();
  if (!page?.text) return { ok: false, error: "Esta página não tem texto extraído." };

  const check = checkQuote(selection, page.text);
  if (!check.ok) return check;

  // O mesmo trecho na mesma página já guardado: não duplica.
  const { data: existing } = await supabase
    .from("quotes")
    .select("id")
    .eq("article_id", articleId)
    .eq("pdf_page", pdfPage)
    .eq("text", check.text)
    .maybeSingle();
  if (existing) return { ok: true, id: existing.id };

  const note = comment.trim().slice(0, MAX_QUOTE_COMMENT) || null;
  const { data, error } = await supabase
    .from("quotes")
    .insert({ article_id: articleId, pdf_page: pdfPage, printed_page: page.printed_page, text: check.text, comment: note })
    .select("id")
    .single();
  if (error) {
    return {
      ok: false,
      error:
        error.code === "23514" && /limite/.test(error.message)
          ? `Este artigo já tem ${MAX_QUOTES_PER_ARTICLE} citações, o máximo.`
          : "Não foi possível guardar a citação.",
    };
  }
  revalidatePath("/projects", "layout");
  return { ok: true, id: data.id };
}
