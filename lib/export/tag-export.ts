/**
 * Conteúdo de uma tag (spec 003): trechos agrupados por artigo, com a chamada
 * pronta. Funções puras: a tela, o Markdown e a planilha usam as mesmas.
 */
import { inTextCite, shortCite, type CitableArticle } from "@/lib/citation";
import type { Cell } from "./xlsx";

export type TagItem =
  | { kind: "article"; taggedTag: string }
  | {
      kind: "field";
      taggedTag: string;
      fieldKey: string;
      label: string;
      value: string | null;
      quote: string | null;
      pdfPage: number | null;
      printedPage: string | null;
    }
  | {
      kind: "quote";
      taggedTag: string;
      quoteId: string;
      text: string;
      pdfPage: number;
      printedPage: string | null;
      comment: string | null;
    };

export type TagArticle = CitableArticle & { id: string; displayTitle: string; items: TagItem[] };

export type TagContent = {
  tag: { id: string; name: string; description: string | null };
  articles: TagArticle[];
};

/** Página para citar: a impressa; sem ela, a do PDF. */
export const citePage = (printed: string | null, pdf: number | null) => printed ?? (pdf != null ? String(pdf) : null);

/** "(Silva, 2023, p. 45)" ou, sem página, "(Silva, 2023)". */
export function itemCite(article: CitableArticle, page: string | null): string {
  if (page) return inTextCite(article, page, "abnt") ?? `(s.a., p. ${page})`;
  const short = shortCite(article);
  return short ? `(${short})` : "";
}

export function countItems(content: TagContent): number {
  return content.articles.reduce((n, a) => n + a.items.length, 0);
}

const one = (s: string) => s.replace(/\s+/g, " ").trim();

/** Markdown pronto para colar num editor: um título por artigo, trechos como citação. */
export function tagMarkdown(content: TagContent): string {
  const out: string[] = [`# ${content.tag.name}`, ""];
  if (content.tag.description) out.push(content.tag.description, "");
  out.push(`${countItems(content)} trechos de ${content.articles.length} artigos.`, "");
  for (const a of content.articles) {
    const short = shortCite(a);
    out.push(`## ${a.displayTitle}${short ? ` (${short})` : ""}`, "");
    for (const it of a.items) {
      const via = it.taggedTag !== content.tag.name ? ` _(${it.taggedTag})_` : "";
      if (it.kind === "article") {
        out.push(`- Artigo inteiro${via}`);
      } else if (it.kind === "field") {
        out.push(`- **${it.label}**${via}: ${one(it.value ?? "(campo fora da ficha)")}`);
        if (it.quote) out.push(`  > “${one(it.quote)}” ${itemCite(a, citePage(it.printedPage, it.pdfPage))}`);
      } else {
        out.push(`- > “${one(it.text)}” ${itemCite(a, citePage(it.printedPage, it.pdfPage))}${via}`);
        if (it.comment) out.push(`  Comentário: ${one(it.comment)}`);
      }
    }
    out.push("");
  }
  return out.join("\n");
}

/** Planilha: uma linha por trecho marcado. */
export function tagRows(content: TagContent): { rows: Cell[][]; widths: number[] } {
  const header: Cell[] = ["Tema", "Citação", "Título", "Marcado em", "Valor do campo", "Trecho", "Página", "Chamada ABNT", "Comentário"];
  const widths = [24, 22, 50, 22, 60, 60, 10, 28, 40];
  const rows: Cell[][] = [header];
  for (const a of content.articles) {
    const short = shortCite(a) ?? "";
    for (const it of a.items) {
      if (it.kind === "article") {
        rows.push([it.taggedTag, short, a.displayTitle, "Artigo inteiro", "", "", "", "", ""]);
      } else if (it.kind === "field") {
        const page = citePage(it.printedPage, it.pdfPage);
        rows.push([
          it.taggedTag,
          short,
          a.displayTitle,
          `Campo: ${it.label}`,
          it.value ?? "",
          it.quote ?? "",
          page ?? "",
          it.quote ? itemCite(a, page) : "",
          "",
        ]);
      } else {
        const page = citePage(it.printedPage, it.pdfPage);
        rows.push([it.taggedTag, short, a.displayTitle, "Minha citação", "", it.text, page ?? "", itemCite(a, page), it.comment ?? ""]);
      }
    }
  }
  return { rows, widths };
}
