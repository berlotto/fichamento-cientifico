/**
 * Estágio definitions (spec 006), parte pura: casa o conceito devolvido pelo
 * LLM com a lista do projeto, confere o trecho no texto do PDF e descarta
 * repetidos.
 */
import type { LlmDefinition } from "@/lib/llm/definitions";
import { compact, locateQuote, resolvePage } from "./verify";
import type { PageRow } from "./extract";

export type Concept = { id: string; name: string };

export type DefinitionRow = {
  concept_id: string;
  text: string;
  text_translated: string | null;
  pdf_page: number | null;
  printed_page: string | null;
  origin: "own" | "cited";
  cited_ref: string | null;
  kind: "definition" | "operationalization";
  verified: boolean;
};

const norm = (s: string) => s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Conceito da lista com o mesmo nome (sem diferenciar maiúsculas e acentos). */
export function matchConcept(name: string, concepts: Concept[]): Concept | undefined {
  const n = norm(name);
  return concepts.find((c) => norm(c.name) === n);
}

/**
 * Linhas para gravar. `keep` são os trechos já revisados (por conceito) que a
 * nova busca não deve repetir. Conceito fora da lista é ignorado.
 */
export function buildDefinitionRows(
  found: LlmDefinition[],
  concepts: Concept[],
  pages: PageRow[],
  keep: { concept_id: string; text: string }[] = [],
): DefinitionRow[] {
  const printed = new Map(pages.map((p) => [p.pdf_page, p.printed_page]));
  const seen = new Set(keep.map((k) => `${k.concept_id}:${compact(k.text)}`));
  const rows: DefinitionRow[] = [];
  for (const d of found) {
    const concept = matchConcept(d.concept, concepts);
    const text = d.quote?.trim();
    if (!concept || !text) continue;
    const key = `${concept.id}:${compact(text)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const page = resolvePage(locateQuote(text, pages, 15), d.pdf_page);
    const translated = d.quote_translated?.trim() || null;
    rows.push({
      concept_id: concept.id,
      text: text.slice(0, 3000),
      text_translated: translated && translated !== text ? translated.slice(0, 3000) : null,
      pdf_page: page,
      printed_page: page != null ? (printed.get(page) ?? null) : null,
      origin: d.origin === "cited" ? "cited" : "own",
      cited_ref: d.origin === "cited" ? d.cited_ref?.trim().slice(0, 500) || null : null,
      kind: d.kind === "operationalization" ? "operationalization" : "definition",
      verified: page != null,
    });
  }
  return rows;
}
