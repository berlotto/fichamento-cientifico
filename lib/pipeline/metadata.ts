/**
 * Metadados bibliográficos (F1.2): DOI encontrado no PDF → Crossref.
 * Sem DOI, procura no Crossref pelo título que o LLM leu e só aceita se o
 * título bater. O Crossref é a fonte oficial; o LLM só preenche o que faltar.
 */
import { compact } from "./verify";
import type { Author } from "@/lib/citation";

export type BiblioMetadata = {
  title: string | null;
  subtitle: string | null;
  authors: Author[];
  year: number | null;
  venue: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  language: string | null;
};

// DOI: 10.<registrante>/<sufixo>. O sufixo termina antes de espaço; pontuação final sai.
const DOI_RE = /\b(10\.\d{4,9}\/[^\s"<>]+)/gi;

export function normalizeDoi(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .replace(/[.,;:)\]}>'"]+$/, "")
    .toLowerCase();
}

/** Primeiro DOI do texto, priorizando as primeiras páginas (onde fica o do próprio artigo). */
export function findDoi(pages: { pdf_page: number; text: string }[]): string | null {
  const sorted = [...pages].sort((a, b) => a.pdf_page - b.pdf_page);
  // As referências citadas no fim também têm DOIs; só as duas primeiras páginas contam.
  for (const p of sorted.slice(0, 2)) {
    // Quebra de linha no meio do DOI é comum ("10.1016/j.\nophtha..."); junta hífen de fim de linha.
    const text = p.text.replace(/-\n/g, "-");
    const m = text.match(DOI_RE);
    if (m) return normalizeDoi(m[0]);
  }
  return null;
}

type CrossrefDate = { "date-parts"?: (number | null)[][] };
type CrossrefWork = {
  DOI?: string;
  title?: string[];
  subtitle?: string[];
  author?: { family?: string; given?: string; name?: string; sequence?: string }[];
  issued?: CrossrefDate;
  "published-print"?: CrossrefDate;
  "published-online"?: CrossrefDate;
  "container-title"?: string[];
  volume?: string;
  issue?: string;
  page?: string;
  /** Periódicos sem paginação (Frontiers, PLOS, eLife) usam número do artigo. */
  "article-number"?: string;
  language?: string;
};

const clean = (s: string | undefined | null) => {
  // Crossref às vezes manda marcação JATS (<i>, <sub>) nos títulos.
  const t = s?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return t || null;
};

const yearOf = (...dates: (CrossrefDate | undefined)[]) => {
  for (const d of dates) {
    const y = d?.["date-parts"]?.[0]?.[0];
    if (typeof y === "number" && y > 1000) return y;
  }
  return null;
};

export function mapCrossref(work: CrossrefWork): BiblioMetadata {
  return {
    title: clean(work.title?.[0]),
    subtitle: clean(work.subtitle?.[0]),
    authors: (work.author ?? []).flatMap((a) => {
      const family = clean(a.family) ?? clean(a.name);
      return family ? [{ family, ...(clean(a.given) ? { given: clean(a.given)! } : {}) }] : [];
    }),
    year: yearOf(work["published-print"], work.issued, work["published-online"]),
    venue: clean(work["container-title"]?.[0]),
    volume: clean(work.volume),
    issue: clean(work.issue),
    pages: clean(work.page) ?? clean(work["article-number"]),
    doi: work.DOI ? normalizeDoi(work.DOI) : null,
    language: clean(work.language),
  };
}

/** Mesmos títulos, ignorando caixa, acentuação de pontuação e espaços. */
export function sameTitle(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const ca = compact(a);
  const cb = compact(b);
  return ca.length >= 10 && (ca === cb || ca.startsWith(cb) || cb.startsWith(ca));
}

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

// Sem e-mail no User-Agent: identifica só a aplicação.
const HEADERS = { "User-Agent": "fichamento-cientifico/0.1 (https://fichamento-cientifico.vercel.app)" };

export async function crossrefByDoi(doi: string, fetcher: Fetcher = fetch): Promise<BiblioMetadata | null> {
  const res = await fetcher(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
    headers: HEADERS,
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Crossref ${res.status}`);
  const json = (await res.json()) as { message?: CrossrefWork };
  return json.message ? mapCrossref(json.message) : null;
}

/**
 * Busca por título quando o PDF não tem DOI. Título igual não basta (há
 * depósitos duplicados e reimpressões): o primeiro autor e o ano (±1) também
 * precisam bater quando o LLM os leu.
 */
export async function crossrefByTitle(
  title: string,
  firstAuthor: string | null,
  year: number | null,
  fetcher: Fetcher = fetch,
): Promise<BiblioMetadata | null> {
  const q = [title, firstAuthor].filter(Boolean).join(" ");
  const url = `https://api.crossref.org/works?rows=5&query.bibliographic=${encodeURIComponent(q)}`;
  const res = await fetcher(url, { headers: HEADERS, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Crossref ${res.status}`);
  const json = (await res.json()) as { message?: { items?: CrossrefWork[] } };
  for (const item of json.message?.items ?? []) {
    const m = mapCrossref(item);
    const full = [m.title, m.subtitle].filter(Boolean).join(": ");
    if (!sameTitle(m.title, title) && !sameTitle(full, title)) continue;
    if (firstAuthor && compact(m.authors[0]?.family ?? "") !== compact(firstAuthor)) continue;
    if (year && (!m.year || Math.abs(m.year - year) > 1)) continue;
    return m;
  }
  return null;
}

/** Título que já termina com o subtítulo ("X. Subtítulo", "X: Subtítulo"): tira a repetição. */
export function splitSubtitle(m: BiblioMetadata): BiblioMetadata {
  const { title, subtitle } = m;
  if (!title || !subtitle) return m;
  if (!title.toLowerCase().endsWith(subtitle.toLowerCase()) || title.length <= subtitle.length) return m;
  const head = title.slice(0, title.length - subtitle.length).replace(/[\s.:;,—–-]+$/, "");
  return head ? { ...m, title: head } : m;
}

/** Crossref manda; o LLM preenche só o que o Crossref não trouxe. */
export function mergeMetadata(crossref: BiblioMetadata | null, llm: BiblioMetadata): BiblioMetadata {
  return splitSubtitle(mergeRaw(crossref, llm));
}

function mergeRaw(crossref: BiblioMetadata | null, llm: BiblioMetadata): BiblioMetadata {
  if (!crossref) return llm;
  const pick = <K extends keyof BiblioMetadata>(k: K) =>
    (k === "authors" ? (crossref.authors.length ? crossref.authors : llm.authors) : (crossref[k] ?? llm[k])) as BiblioMetadata[K];
  return {
    title: pick("title"),
    subtitle: pick("subtitle"),
    authors: pick("authors"),
    year: pick("year"),
    venue: pick("venue"),
    volume: pick("volume"),
    issue: pick("issue"),
    pages: pick("pages"),
    doi: pick("doi"),
    // O Crossref raramente informa a língua; a do LLM vem do texto.
    language: llm.language ?? crossref.language,
  };
}
