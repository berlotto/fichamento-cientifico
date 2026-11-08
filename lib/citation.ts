/**
 * Citação curta e referências (ABNT, APA, Vancouver, BibTeX) a partir dos
 * metadados do artigo. Montadas por código, nunca pelo LLM: cada norma tem
 * regra fixa de ordem, pontuação e abreviação.
 *
 * Formato de `authors` (jsonb): [{ family, given? }], como vem do Crossref.
 */

export type Author = { family: string; given?: string };

export type CitableArticle = {
  title?: string | null;
  subtitle?: string | null;
  authors?: unknown;
  year?: number | null;
  venue?: string | null;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  doi?: string | null;
  citekey?: string | null;
};

/** Trecho de referência: texto simples, negrito (ABNT) ou itálico (APA). */
export type RefPart = string | { b: string } | { i: string };

export const refText = (parts: RefPart[]) =>
  parts.map((p) => (typeof p === "string" ? p : "b" in p ? p.b : p.i)).join("");

export function parseAuthors(raw: unknown): Author[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((a) => {
    if (!a || typeof a !== "object") return [];
    const { family, given } = a as Record<string, unknown>;
    if (typeof family !== "string" || !family.trim()) return [];
    return [{ family: family.trim(), given: typeof given === "string" && given.trim() ? given.trim() : undefined }];
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

/** "Ana Moraes" quando há prenome; senão só o sobrenome. */
export const fullName = (a: Author) => (a.given ? `${a.given} ${a.family}` : a.family);

const nameParts = (given: string) => given.split(/[\s-]+/).filter((p) => /^\p{L}/u.test(p));

/** "J. P." */
const initialsDotted = (given: string) =>
  nameParts(given)
    .map((p) => `${p[0].toUpperCase()}.`)
    .join(" ");

/** "JP" (Vancouver) */
const initialsPlain = (given: string) =>
  nameParts(given)
    .map((p) => p[0].toUpperCase())
    .join("");

const stripEndDot = (s: string) => s.trim().replace(/[.\s]+$/, "");

/** "Título: subtítulo" (sem ponto final). */
export function fullTitle(article: CitableArticle): string | null {
  const title = article.title?.trim();
  if (!title) return null;
  const sub = article.subtitle?.trim();
  if (!sub || title.toLowerCase().endsWith(sub.toLowerCase())) return stripEndDot(title);
  return `${stripEndDot(title).replace(/:$/, "")}: ${stripEndDot(sub)}`;
}

const doiUrl = (doi: string) => `https://doi.org/${doi}`;

/** Periódicos sem paginação (Frontiers, PLOS) usam número do artigo: "1112296", "e0123456". */
export const isArticleNumber = (p: string) => /^e?\d{5,}$/i.test(p.trim());

/** "123-145" com hífen simples; aceita en dash e espaços. */
const normPages = (p: string) => p.trim().replace(/\s*[–—-]\s*/g, "-");

/** Vancouver abrevia a página final: 123-145 → 123-45; 1234-1240 → 1234-40. */
export function vancouverPages(p: string): string {
  const m = /^(\d+)-(\d+)$/.exec(normPages(p));
  if (!m) return normPages(p);
  const [, a, b] = m;
  if (a.length !== b.length) return `${a}-${b}`;
  let i = 0;
  while (i < a.length - 1 && a[i] === b[i]) i++;
  return `${a}-${b.slice(i)}`;
}

function cleanDoi(doi?: string | null): string | null {
  const d = doi?.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  return d || null;
}

/**
 * ABNT NBR 6023:2018, artigo de periódico:
 * SOBRENOME, I.; SOBRENOME, I. Título: subtítulo. **Periódico**, v. X, n. Y, p. a-b, ano. DOI: https://doi.org/...
 * Até três autores por extenso; mais que isso, o primeiro seguido de "et al." (permitido pela norma).
 */
export function abntParts(article: CitableArticle): RefPart[] | null {
  const authors = parseAuthors(article.authors);
  const title = fullTitle(article);
  if (authors.length === 0 || !title || !article.year) return null;

  const fmt = (a: Author) => (a.given ? `${a.family.toUpperCase()}, ${initialsDotted(a.given)}` : a.family.toUpperCase());
  const who = authors.length > 3 ? `${fmt(authors[0])} et al.` : authors.map(fmt).join("; ");
  const parts: RefPart[] = [`${stripEndDot(who)}. ${title}.`];

  const tail: string[] = [];
  if (article.volume) tail.push(`v. ${article.volume}`);
  if (article.issue) tail.push(`n. ${article.issue}`);
  if (article.pages) tail.push(isArticleNumber(article.pages) ? article.pages.trim() : `p. ${normPages(article.pages)}`);
  tail.push(String(article.year));

  if (article.venue?.trim()) {
    parts.push(" ", { b: article.venue.trim() }, `, ${tail.join(", ")}.`);
  } else {
    parts.push(` ${tail.join(", ")}.`);
  }
  const doi = cleanDoi(article.doi);
  if (doi) parts.push(` DOI: ${doiUrl(doi)}.`);
  return parts;
}

export function abntReference(article: CitableArticle): string | null {
  const p = abntParts(article);
  return p && refText(p);
}

/**
 * APA 7, artigo de periódico:
 * Sobrenome, I. I., & Sobrenome, I. (Ano). Título: Subtítulo. *Periódico*, *vol*(n), a–b. https://doi.org/...
 * Até 20 autores; com 21 ou mais, os 19 primeiros, reticências e o último.
 */
export function apaParts(article: CitableArticle): RefPart[] | null {
  const authors = parseAuthors(article.authors);
  const title = fullTitle(article);
  if (authors.length === 0 || !title || !article.year) return null;

  const fmt = (a: Author) => (a.given ? `${a.family}, ${initialsDotted(a.given)}` : a.family);
  let who: string;
  if (authors.length === 1) who = fmt(authors[0]);
  else if (authors.length <= 20)
    who = `${authors.slice(0, -1).map(fmt).join(", ")}, & ${fmt(authors[authors.length - 1])}`;
  else who = `${authors.slice(0, 19).map(fmt).join(", ")}, . . . ${fmt(authors[authors.length - 1])}`;

  const parts: RefPart[] = [`${stripEndDot(who)}. (${article.year}). ${title}.`];
  if (article.venue?.trim()) {
    parts.push(" ", { i: article.venue.trim() });
    if (article.volume) {
      parts.push(", ", { i: article.volume });
      if (article.issue) parts.push(`(${article.issue})`);
    }
    if (article.pages) {
      parts.push(
        isArticleNumber(article.pages)
          ? `, Article ${article.pages.trim()}`
          : `, ${normPages(article.pages).replace("-", "–")}`,
      );
    }
    parts.push(".");
  }
  const doi = cleanDoi(article.doi);
  if (doi) parts.push(` ${doiUrl(doi)}`);
  return parts;
}

/**
 * Vancouver (ICMJE/NLM):
 * Sobrenome AB, Sobrenome C. Título: subtítulo. Periódico. Ano;vol(n):a-b. doi:...
 * Até seis autores; mais que isso, os seis primeiros e "et al."
 */
export function vancouverParts(article: CitableArticle): RefPart[] | null {
  const authors = parseAuthors(article.authors);
  const title = fullTitle(article);
  if (authors.length === 0 || !title || !article.year) return null;

  const fmt = (a: Author) => (a.given ? `${a.family} ${initialsPlain(a.given)}` : a.family);
  const listed = authors.slice(0, 6).map(fmt).join(", ");
  const who = authors.length > 6 ? `${listed}, et al` : listed;

  let where = `${article.year}`;
  if (article.volume) where += `;${article.volume}`;
  if (article.issue) where += `(${article.issue})`;
  if (article.pages) where += `:${vancouverPages(article.pages)}`;

  const venue = article.venue?.trim() ? ` ${stripEndDot(article.venue)}.` : "";
  const doi = cleanDoi(article.doi);
  return [`${who}. ${title}.${venue} ${where}.${doi ? ` doi:${doi}` : ""}`];
}

const bibEscape = (s: string) => s.replace(/([{}&%$#_])/g, "\\$1");

/** Chave BibTeX: citekey gravado, senão sobrenome + ano + primeira palavra significativa do título. */
export function bibKey(article: CitableArticle): string {
  if (article.citekey?.trim()) return article.citekey.trim();
  const ascii = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^A-Za-z0-9]/g, "");
  const family = ascii(parseAuthors(article.authors)[0]?.family ?? "artigo").toLowerCase();
  const word =
    (article.title ?? "")
      .split(/\s+/)
      .map(ascii)
      .find((w) => w.length > 3) ?? "";
  return `${family}${article.year ?? ""}${word.toLowerCase()}`;
}

export function bibtex(article: CitableArticle): string | null {
  const authors = parseAuthors(article.authors);
  const title = fullTitle(article);
  if (authors.length === 0 || !title || !article.year) return null;

  const fields: [string, string | null | undefined][] = [
    ["author", authors.map((a) => (a.given ? `${a.family}, ${a.given}` : a.family)).join(" and ")],
    ["title", title],
    ["journal", article.venue?.trim()],
    ["year", String(article.year)],
    ["volume", article.volume],
    ["number", article.issue],
    ["pages", article.pages && normPages(article.pages).replace("-", "--")],
    ["doi", cleanDoi(article.doi)],
  ];
  const body = fields
    .filter(([, v]) => v)
    .map(([k, v]) => `  ${k} = {${bibEscape(v as string)}}`)
    .join(",\n");
  return `@article{${bibKey(article)},\n${body}\n}`;
}

export type CitationStyle = "abnt" | "apa" | "vancouver" | "bibtex";

/** Todas as referências do artigo; null quando faltam autor, título ou ano. */
export function allReferences(article: CitableArticle): Record<CitationStyle, RefPart[]> | null {
  const abnt = abntParts(article);
  const apa = apaParts(article);
  const vancouver = vancouverParts(article);
  const bib = bibtex(article);
  if (!abnt || !apa || !vancouver || !bib) return null;
  return { abnt, apa, vancouver, bibtex: [bib] };
}

/** Iniciais para o avatar: nome completo, senão e-mail. */
export function initialsOf(name: string | null | undefined, email?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter((p) => /^\p{L}/u.test(p));
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (email ?? "?").slice(0, 2).toUpperCase();
}
