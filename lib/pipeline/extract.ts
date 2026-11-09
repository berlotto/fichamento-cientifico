/**
 * Estágio extract, parte pura: transforma a saída do LLM + Crossref em linhas
 * para gravar, conferindo cada trecho no texto do PDF (verify.ts).
 */
import type { ExtractedField, Extraction, FieldKey } from "@/lib/llm/extract";
import type { BiblioMetadata } from "./metadata";
import { normalizeDoi } from "./metadata";
import { locateQuote, numbersInQuote, resolvePage, type PageText } from "./verify";

export type PageRow = PageText & { printed_page: string | null };

export type FieldRow = {
  key: FieldKey;
  value: string;
  quote: string | null;
  pdf_page: number | null;
  printed_page: string | null;
  verified: boolean;
  source: "author" | "llm";
  llm_value: string;
  llm_quote: string | null;
  /** Trecho traduzido para o idioma da ficha (null se o artigo já está nele). */
  quote_translated: string | null;
  /** Resumo do autor no idioma original, quando value é a tradução. */
  source_value: string | null;
  language: string;
};

const blank = (s: string | null | undefined) => {
  const t = s?.trim();
  return t ? t : null;
};

export function llmMetadata(e: Extraction): BiblioMetadata {
  const m = e.metadata;
  const doi = blank(m.doi);
  return {
    title: blank(m.title),
    subtitle: blank(m.subtitle),
    authors: m.authors.flatMap((a) => {
      const family = blank(a.family);
      const given = blank(a.given);
      return family ? [{ family, ...(given ? { given } : {}) }] : [];
    }),
    year: m.year && m.year > 1000 && m.year < 3000 ? m.year : null,
    venue: blank(m.venue),
    volume: blank(m.volume),
    issue: blank(m.issue),
    pages: blank(m.pages),
    doi: doi && /^10\.\d{4,9}\//.test(normalizeDoi(doi)) ? normalizeDoi(doi) : null,
    language: blank(m.language)?.toLowerCase().slice(0, 2) ?? null,
  };
}

/**
 * Um campo é "verificado" quando o trecho existe no texto do PDF e todo número
 * do valor aparece no trecho. O resumo do autor é cópia longa: basta o trecho existir.
 */
export function buildFieldRows(e: Extraction, pages: PageRow[], language = "pt-BR"): FieldRow[] {
  const printed = new Map(pages.map((p) => [p.pdf_page, p.printed_page]));
  const rows: FieldRow[] = [];

  for (const [key, f] of Object.entries(e.fields) as [FieldKey, ExtractedField][]) {
    const value = blank(f.value);
    if (!value) continue;

    const fromAuthor = key === "abstract" && e.abstract_from_author;
    // Resumo do autor traduzido: o original fica guardado e é ele que se confere no PDF.
    const original = fromAuthor ? blank(e.abstract_original) : null;
    // Resumo do autor sem trecho: o início do resumo (original) serve de trecho.
    const quote = blank(f.quote) ?? (fromAuthor ? (original ?? value).slice(0, 300) : null);
    const translated = blank(f.quote_translated);

    const found = quote ? locateQuote(quote, pages) : [];
    const page = resolvePage(found, f.pdf_page);
    const verified = page != null && (fromAuthor || numbersInQuote(value, quote ?? ""));

    rows.push({
      key,
      value,
      quote,
      pdf_page: page ?? (f.pdf_page && printed.has(f.pdf_page) ? f.pdf_page : null),
      printed_page: page != null ? (printed.get(page) ?? null) : null,
      verified,
      source: fromAuthor ? "author" : "llm",
      llm_value: value,
      llm_quote: quote,
      quote_translated: translated && translated !== quote ? translated : null,
      source_value: original && original !== value ? original : null,
      language,
    });
  }
  return rows;
}

/**
 * Status depois da extração. `reviewed` = campos que o usuário já revisou e que a
 * reextração preserva. Tudo revisado: verified; senão extracted se os trechos novos
 * conferem, needs_review se algum não confere.
 */
export function statusAfterExtract(
  rows: FieldRow[],
  reviewed = 0,
): "extracted" | "needs_review" | "verified" {
  if (rows.length === 0) return reviewed > 0 ? "verified" : "needs_review";
  return rows.every((r) => r.verified) ? "extracted" : "needs_review";
}
