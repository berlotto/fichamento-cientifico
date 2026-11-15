import "server-only";

import { displayTitle, shortCite } from "@/lib/citation";
import type { createClient } from "@/lib/supabase/server";
import type { GlossaryConcept, GlossaryDefinition } from "./glossary-export";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Conceitos do projeto com as definições encontradas, em ordem alfabética; as
 * definições de cada conceito em ordem de autor e ano. RLS: só o que é do usuário.
 */
export async function loadGlossary(
  supabase: Client,
  projectId: string,
): Promise<{ name: string; concepts: GlossaryConcept[] } | null> {
  const [{ data: project }, { data: concepts }, { data: defs }] = await Promise.all([
    supabase.from("projects").select("name").eq("id", projectId).maybeSingle(),
    supabase.from("concepts").select("id, name, notes").eq("project_id", projectId),
    supabase
      .from("definitions")
      .select(
        "id, concept_id, text, text_translated, pdf_page, printed_page, origin, cited_ref, kind, verified, status, source, concepts!inner(project_id), articles(id, title, subtitle, original_filename, authors, year)",
      )
      .eq("concepts.project_id", projectId),
  ]);
  if (!project) return null;

  const byConcept = new Map<string, GlossaryDefinition[]>();
  for (const d of defs ?? []) {
    if (!d.articles) continue;
    const list = byConcept.get(d.concept_id) ?? [];
    list.push({
      id: d.id,
      text: d.text,
      text_translated: d.text_translated,
      pdf_page: d.pdf_page,
      printed_page: d.printed_page,
      origin: d.origin as GlossaryDefinition["origin"],
      cited_ref: d.cited_ref,
      kind: d.kind as GlossaryDefinition["kind"],
      verified: d.verified,
      status: d.status as GlossaryDefinition["status"],
      source: d.source as GlossaryDefinition["source"],
      article: {
        ...d.articles,
        displayTitle: displayTitle(d.articles) ?? d.articles.original_filename ?? "Sem título",
      },
    });
    byConcept.set(d.concept_id, list);
  }

  const key = (d: GlossaryDefinition) => shortCite(d.article) ?? d.article.displayTitle;
  const list = (concepts ?? [])
    .map((c) => ({
      ...c,
      definitions: (byConcept.get(c.id) ?? []).sort(
        (a, b) => key(a).localeCompare(key(b), "pt-BR") || (a.pdf_page ?? 0) - (b.pdf_page ?? 0),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return { name: project.name, concepts: list };
}
