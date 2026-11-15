import "server-only";

import {
  abntParts,
  abntReference,
  apaParts,
  refText,
  vancouverParts,
  bibtex,
  fullName,
  fullTitle,
  parseAuthors,
  shortCite,
  type CitableArticle,
} from "@/lib/citation";
import { fieldDefs, type FieldDef } from "@/lib/fields";
import type { createClient } from "@/lib/supabase/server";
import type { Cell } from "./xlsx";

type Client = Awaited<ReturnType<typeof createClient>>;

export type TableField = {
  value: string;
  quote: string | null;
  quote_translated: string | null;
  pdf_page: number | null;
  printed_page: string | null;
  verified: boolean;
  status: string;
};

export type TableArticle = CitableArticle & {
  id: string;
  original_filename: string | null;
  language: string | null;
  status: string;
  fields: Record<string, TableField>;
  /** Comentários do pesquisador por campo (spec 001). */
  comments: Record<string, string>;
  crit_strengths: string | null;
  crit_weaknesses: string | null;
  crit_relevance: string | null;
  notes: string | null;
  /** Citações marcadas à mão (spec 002), em ordem de página. */
  quotes: TableQuote[];
};

export type TableQuote = { text: string; pdf_page: number; printed_page: string | null; comment: string | null };

export type ProjectTable = { name: string; defs: FieldDef[]; articles: TableArticle[] };

/** Projeto com artigos e campos (sem os rejeitados). RLS: só o que é do usuário. */
export async function loadProjectTable(supabase: Client, projectId: string): Promise<ProjectTable | null> {
  const [{ data: project }, { data: custom }, { data: articles }, { data: fields }, { data: comments }, { data: quotes }] =
    await Promise.all([
    supabase.from("projects").select("name").eq("id", projectId).maybeSingle(),
    supabase.from("project_fields").select("key, label").eq("project_id", projectId).order("position"),
    supabase
      .from("articles")
      .select(
        "id, title, subtitle, original_filename, authors, year, venue, volume, issue, pages, doi, language, citekey, status, created_at, crit_strengths, crit_weaknesses, crit_relevance, notes",
      )
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("article_fields")
      .select(
        "article_id, key, value, quote, quote_translated, pdf_page, printed_page, verified, status, articles!inner(project_id)",
      )
      .eq("articles.project_id", projectId)
      .neq("status", "rejected"),
    supabase
      .from("field_comments")
      .select("article_id, field_key, body, articles!inner(project_id)")
      .eq("articles.project_id", projectId),
    supabase
      .from("quotes")
      .select("article_id, text, pdf_page, printed_page, comment, articles!inner(project_id)")
      .eq("articles.project_id", projectId)
      .order("pdf_page")
      .order("created_at"),
  ]);
  if (!project) return null;

  const byArticle = new Map<string, Record<string, TableField>>();
  for (const f of fields ?? []) {
    const rec = byArticle.get(f.article_id) ?? {};
    rec[f.key] = f;
    byArticle.set(f.article_id, rec);
  }

  const commentsByArticle = new Map<string, Record<string, string>>();
  for (const c of comments ?? []) {
    const rec = commentsByArticle.get(c.article_id) ?? {};
    rec[c.field_key] = c.body;
    commentsByArticle.set(c.article_id, rec);
  }

  const quotesByArticle = new Map<string, TableQuote[]>();
  for (const q of quotes ?? []) {
    const list = quotesByArticle.get(q.article_id) ?? [];
    list.push({ text: q.text, pdf_page: q.pdf_page, printed_page: q.printed_page, comment: q.comment });
    quotesByArticle.set(q.article_id, list);
  }

  const list = (articles ?? []).map((a) => ({
    ...a,
    fields: byArticle.get(a.id) ?? {},
    comments: commentsByArticle.get(a.id) ?? {},
    quotes: quotesByArticle.get(a.id) ?? [],
  }));
  // Ordem de bibliografia: autor, ano.
  list.sort((x, y) => (shortCite(x) ?? x.title ?? "").localeCompare(shortCite(y) ?? y.title ?? "", "pt-BR"));
  return { name: project.name, defs: fieldDefs(custom ?? []), articles: list };
}

/** "p. 215" (página impressa) ou "PDF p. 3" quando o artigo não tem numeração. */
export const pageLabel = (f: TableField) =>
  f.printed_page ? `p. ${f.printed_page}` : f.pdf_page ? `PDF p. ${f.pdf_page}` : "";

const STATUS: Record<string, string> = { accepted: "revisado", pending: "a revisar" };

/** Citações à mão numa célula: "“trecho” (p. 45) — comentário", uma por parágrafo. */
export function quotesCell(quotes: TableQuote[]): string {
  return quotes
    .map((q) => {
      const page = q.printed_page ? `p. ${q.printed_page}` : `PDF p. ${q.pdf_page}`;
      return `“${q.text}” (${page})${q.comment ? ` — ${q.comment}` : ""}`;
    })
    .join("\n\n");
}

/** Colunas da análise crítica do artigo, na ordem da ficha. */
export const CRITIQUE_COLUMNS = [
  ["crit_strengths", "Pontos fortes"],
  ["crit_weaknesses", "Pontos fracos"],
  ["crit_relevance", "Relação com minha pesquisa"],
  ["notes", "Notas livres"],
] as const;

/**
 * Linhas da planilha: metadados + (valor, trecho, página, status) de cada campo.
 * Com `critique`, cada campo ganha a coluna "meu comentário" e o fim da linha
 * traz a análise crítica do artigo (spec 001) e as citações marcadas à mão (spec 002).
 */
export function tableRows(t: ProjectTable, opts: { critique?: boolean } = {}): { rows: Cell[][]; widths: number[] } {
  const header: Cell[] = [
    "Citação",
    "Título",
    "Autores",
    "Ano",
    "Periódico",
    "Volume",
    "Número",
    "Páginas",
    "DOI",
    "Língua",
    "Referência ABNT",
  ];
  const widths = [22, 50, 40, 8, 30, 8, 8, 10, 28, 8, 60];
  for (const d of t.defs) {
    header.push(d.label, `${d.label}: trecho original`, `${d.label}: trecho traduzido`, `${d.label}: página`, `${d.label}: revisão`);
    widths.push(60, 50, 50, 10, 12);
    if (opts.critique) {
      header.push(`${d.label}: meu comentário`);
      widths.push(50);
    }
  }
  if (opts.critique) {
    for (const [, label] of CRITIQUE_COLUMNS) {
      header.push(label);
      widths.push(50);
    }
    header.push("Minhas citações");
    widths.push(70);
  }

  const rows: Cell[][] = [header];
  for (const a of t.articles) {
    const row: Cell[] = [
      shortCite(a) ?? "",
      fullTitle(a) ?? a.original_filename ?? "",
      parseAuthors(a.authors).map(fullName).join("; "),
      a.year ?? null,
      a.venue ?? "",
      a.volume ?? "",
      a.issue ?? "",
      a.pages ?? "",
      a.doi ? `https://doi.org/${a.doi}` : "",
      a.language ?? "",
      abntReference(a) ?? "",
    ];
    for (const d of t.defs) {
      const f = a.fields[d.key];
      row.push(
        f?.value ?? "",
        f?.quote ?? "",
        f?.quote_translated ?? "",
        f ? pageLabel(f) : "",
        f ? (STATUS[f.status] ?? f.status) : "",
      );
      if (opts.critique) row.push(a.comments[d.key] ?? "");
    }
    if (opts.critique) {
      for (const [col] of CRITIQUE_COLUMNS) row.push(a[col] ?? "");
      row.push(quotesCell(a.quotes));
    }
    rows.push(row);
  }
  return { rows, widths };
}

/**
 * Lista de referências na norma escolhida. ABNT e APA em ordem alfabética;
 * Vancouver numerada na ordem dos artigos do projeto.
 */
export function referenceList(t: ProjectTable, style: "abnt" | "apa" | "vancouver"): string {
  const build = { abnt: abntParts, apa: apaParts, vancouver: vancouverParts }[style];
  const refs = t.articles.flatMap((a) => {
    const p = build(a);
    return p ? [refText(p)] : [];
  });
  if (style === "vancouver") return refs.map((r, i) => `${i + 1}. ${r}`).join("\n\n") + "\n";
  refs.sort((x, y) => x.localeCompare(y, "pt-BR"));
  return refs.join("\n\n") + "\n";
}

/** Lista ABNT em ordem alfabética (como na seção de referências). */
export function abntList(t: ProjectTable): string {
  const refs = t.articles.flatMap((a) => abntReference(a) ?? []);
  refs.sort((x, y) => x.localeCompare(y, "pt-BR"));
  return refs.join("\n\n") + "\n";
}

export function bibFile(t: ProjectTable): string {
  // Chaves repetidas (mesmo autor, ano e palavra) ganham sufixo a, b, c.
  const seen = new Map<string, number>();
  const entries = t.articles.flatMap((a) => {
    const b = bibtex(a);
    if (!b) return [];
    const key = /^@article\{([^,]+),/.exec(b)?.[1] ?? "";
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    return n === 0 ? [b] : [b.replace(`@article{${key},`, `@article{${key}${String.fromCharCode(97 + n)},`)];
  });
  return entries.join("\n\n") + "\n";
}
