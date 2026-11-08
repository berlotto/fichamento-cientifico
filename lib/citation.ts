/**
 * Citação curta e referência ABNT a partir dos metadados do artigo.
 * Formato de `authors` (jsonb): [{ family, given? }], como vem do Crossref (F1.2).
 */

export type Author = { family: string; given?: string };

export type CitableArticle = {
  title?: string | null;
  authors?: unknown;
  year?: number | null;
  venue?: string | null;
};

export function parseAuthors(raw: unknown): Author[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((a) => {
    if (!a || typeof a !== "object") return [];
    const { family, given } = a as Record<string, unknown>;
    if (typeof family !== "string" || !family.trim()) return [];
    return [{ family: family.trim(), given: typeof given === "string" ? given.trim() : undefined }];
  });
}

/** "Moraes et al., 2022" · "Lima; Prado, 2020" · "Carvalho, 2018". Null sem autor e ano. */
export function shortCite(article: CitableArticle, upper = false): string | null {
  const authors = parseAuthors(article.authors);
  if (authors.length === 0 || !article.year) return null;
  const name = (a: Author) => (upper ? a.family.toUpperCase() : a.family);
  const who =
    authors.length === 1
      ? name(authors[0])
      : authors.length === 2
        ? `${name(authors[0])}; ${name(authors[1])}`
        : `${name(authors[0])} et al.`;
  return `${who}, ${article.year}`;
}

/** "Moraes, Tavares e Ribeiro" para a linha de metadados. */
export function authorLine(article: CitableArticle): string | null {
  const names = parseAuthors(article.authors).map((a) => a.family);
  if (names.length === 0) return null;
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

const initials = (given: string) =>
  given
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((p) => `${p[0].toUpperCase()}.`)
    .join(" ");

/**
 * Referência ABNT (NBR 6023) do que se sabe: SOBRENOME, I.; ... Título. Periódico, ano.
 * Até três autores por extenso; mais que isso, o primeiro seguido de "et al.".
 * Volume, número e páginas entram quando o Crossref (F1.2) passar a gravá-los.
 */
export function abntReference(article: CitableArticle): string | null {
  const authors = parseAuthors(article.authors);
  if (authors.length === 0 || !article.title || !article.year) return null;

  const fmt = (a: Author) => (a.given ? `${a.family.toUpperCase()}, ${initials(a.given)}` : a.family.toUpperCase());
  const who = authors.length > 3 ? `${fmt(authors[0])} et al.` : authors.map(fmt).join("; ");
  const title = article.title.trim().replace(/\.$/, "");
  const venue = article.venue?.trim() ? ` ${article.venue.trim()},` : "";
  return `${who} ${title}.${venue} ${article.year}.`;
}

/** Iniciais para o avatar: nome completo, senão e-mail. */
export function initialsOf(name: string | null | undefined, email?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter((p) => /^\p{L}/u.test(p));
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (email ?? "?").slice(0, 2).toUpperCase();
}
