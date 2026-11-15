/**
 * Glossário do projeto (spec 006): definições agrupadas por conceito, com a
 * chamada pronta. Funções puras: a tela, o Markdown e a planilha usam as mesmas.
 */
import { shortCite, type CitableArticle } from "@/lib/citation";
import { citePage, itemCite } from "./tag-export";
import type { Cell } from "./xlsx";

export type GlossaryDefinition = {
  id: string;
  text: string;
  text_translated: string | null;
  pdf_page: number | null;
  printed_page: string | null;
  origin: "own" | "cited";
  cited_ref: string | null;
  kind: "definition" | "operationalization";
  verified: boolean;
  status: "pending" | "accepted" | "rejected";
  source: "llm" | "manual";
  article: CitableArticle & { id: string; displayTitle: string };
};

export type GlossaryConcept = { id: string; name: string; notes: string | null; definitions: GlossaryDefinition[] };

export const KIND_LABEL = { definition: "Definição", operationalization: "Operacionalização" } as const;
export const ORIGIN_LABEL = { own: "Dos autores", cited: "Citada" } as const;

/** Chamada da definição: "(Silva, 2023, p. 4)"; citada: "(Masten, 2001 apud Silva, 2023, p. 4)". */
export function definitionCite(d: GlossaryDefinition): string {
  const cite = itemCite(d.article, citePage(d.printed_page, d.pdf_page));
  if (d.origin !== "cited" || !d.cited_ref || !cite.startsWith("(")) return cite;
  return `(${d.cited_ref} apud ${cite.slice(1)}`;
}

/** Só as que contam: não rejeitadas. */
const usable = (c: GlossaryConcept) => c.definitions.filter((d) => d.status !== "rejected");

const one = (s: string) => s.replace(/\s+/g, " ").trim();

export function glossaryMarkdown(projectName: string, concepts: GlossaryConcept[]): string {
  const out = [`# Glossário: ${projectName}`, ""];
  for (const c of concepts) {
    const defs = usable(c);
    out.push(`## ${c.name}`, "");
    if (c.notes) out.push(c.notes, "");
    if (defs.length === 0) {
      out.push("_Nenhuma definição encontrada._", "");
      continue;
    }
    for (const d of defs) {
      const tags = [KIND_LABEL[d.kind], d.origin === "cited" ? "citada" : null, d.status === "pending" ? "a revisar" : null]
        .filter(Boolean)
        .join(", ");
      out.push(`- > “${one(d.text)}” ${definitionCite(d)}`);
      if (d.text_translated) out.push(`  Tradução: ${one(d.text_translated)}`);
      out.push(`  _${tags}_ · ${d.article.displayTitle}`);
    }
    out.push("");
  }
  return out.join("\n");
}

export function glossaryRows(concepts: GlossaryConcept[]): { rows: Cell[][]; widths: number[] } {
  const header: Cell[] = [
    "Conceito",
    "Tipo",
    "Origem",
    "Referência citada",
    "Definição (original)",
    "Tradução",
    "Página",
    "Chamada",
    "Artigo",
    "Citação",
    "Trecho conferido",
    "Revisão",
  ];
  const widths = [22, 16, 12, 24, 70, 60, 8, 30, 50, 22, 10, 12];
  const rows: Cell[][] = [header];
  for (const c of concepts) {
    for (const d of usable(c)) {
      rows.push([
        c.name,
        KIND_LABEL[d.kind],
        ORIGIN_LABEL[d.origin],
        d.cited_ref ?? "",
        d.text,
        d.text_translated ?? "",
        citePage(d.printed_page, d.pdf_page) ?? "",
        definitionCite(d),
        d.article.displayTitle,
        shortCite(d.article) ?? "",
        d.verified ? "sim" : "não",
        d.status === "accepted" ? "aceita" : "a revisar",
      ]);
    }
  }
  return { rows, widths };
}
