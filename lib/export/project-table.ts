import "server-only";

import {
  abntReference,
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
};

export type ProjectTable = { name: string; defs: FieldDef[]; articles: TableArticle[] };

/** Projeto com artigos e campos (sem os rejeitados). RLS: só o que é do usuário. */
export async function loadProjectTable(supabase: Client, projectId: string): Promise<ProjectTable | null> {
  const [{ data: project }, { data: custom }, { data: articles }, { data: fields }] = await Promise.all([
    supabase.from("projects").select("name").eq("id", projectId).maybeSingle(),
    supabase.from("project_fields").select("key, label").eq("project_id", projectId).order("position"),
    supabase
      .from("articles")
      .select(
        "id, title, subtitle, original_filename, authors, year, venue, volume, issue, pages, doi, language, citekey, status, created_at",
      )
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("article_fields")
      .select("article_id, key, value, quote, pdf_page, printed_page, verified, status, articles!inner(project_id)")
      .eq("articles.project_id", projectId)
      .neq("status", "rejected"),
  ]);
  if (!project) return null;

  const byArticle = new Map<string, Record<string, TableField>>();
  for (const f of fields ?? []) {
    const rec = byArticle.get(f.article_id) ?? {};
    rec[f.key] = f;
    byArticle.set(f.article_id, rec);
  }

  const list = (articles ?? []).map((a) => ({ ...a, fields: byArticle.get(a.id) ?? {} }));
  // Ordem de bibliografia: autor, ano.
  list.sort((x, y) => (shortCite(x) ?? x.title ?? "").localeCompare(shortCite(y) ?? y.title ?? "", "pt-BR"));
  return { name: project.name, defs: fieldDefs(custom ?? []), articles: list };
}

/** "p. 215" (página impressa) ou "PDF p. 3" quando o artigo não tem numeração. */
export const pageLabel = (f: TableField) =>
  f.printed_page ? `p. ${f.printed_page}` : f.pdf_page ? `PDF p. ${f.pdf_page}` : "";

const STATUS: Record<string, string> = { accepted: "revisado", pending: "a revisar" };

/** Linhas da planilha: metadados + (valor, trecho, página, status) de cada campo. */
export function tableRows(t: ProjectTable): { rows: Cell[][]; widths: number[] } {
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
    header.push(d.label, `${d.label}: trecho`, `${d.label}: página`, `${d.label}: revisão`);
    widths.push(60, 50, 10, 12);
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
      row.push(f?.value ?? "", f?.quote ?? "", f ? pageLabel(f) : "", f ? (STATUS[f.status] ?? f.status) : "");
    }
    rows.push(row);
  }
  return { rows, widths };
}

/** Lista de referências ABNT em ordem alfabética (como na seção de referências). */
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
