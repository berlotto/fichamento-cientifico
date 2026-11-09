/**
 * Verificação determinística de citações (arquitetura, seção 5).
 *
 * Ajustes do plano:
 * - A5: citação que atravessa a quebra de página é procurada na concatenação
 *   de páginas vizinhas.
 * - A6: números são comparados como números inteiros, com fronteira, e não
 *   na forma compacta (que fazia "1.5" casar com "15" e "15" com "150").
 */

export type PageText = { pdf_page: number; text: string };

/** Só letras e números, minúsculos: robusto a hifenização, aspas, travessões e espaços. */
export const compact = (s: string) =>
  s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

export const MIN_QUOTE_LEN = 25;

/**
 * Páginas (pdf_page) onde a citação começa. Vazio se não encontrada ou curta demais.
 * Primeiro procura em cada página; se não achar, procura em pares de páginas
 * vizinhas e devolve a página inicial do par.
 */
export function locateQuote(
  quote: string,
  pages: PageText[],
  minLen = MIN_QUOTE_LEN,
): number[] {
  const q = compact(quote);
  if (q.length < minLen) return [];

  const sorted = [...pages].sort((a, b) => a.pdf_page - b.pdf_page);
  const compacted = sorted.map((p) => compact(p.text));

  const single = sorted.filter((_, i) => compacted[i].includes(q)).map((p) => p.pdf_page);
  if (single.length > 0) return single;

  const spanning: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1].pdf_page !== sorted[i].pdf_page + 1) continue;
    if ((compacted[i] + compacted[i + 1]).includes(q)) spanning.push(sorted[i].pdf_page);
  }
  return spanning;
}

/**
 * Página a gravar: a informada pelo LLM se a citação está lá; senão a primeira
 * onde foi encontrada; null se não foi encontrada.
 */
export function resolvePage(found: number[], claimed: number | null | undefined): number | null {
  if (found.length === 0) return null;
  if (claimed != null && found.includes(claimed)) return claimed;
  return found[0];
}

// Separadores decimais aceitos: ponto, vírgula e ponto médio (estilo Lancet).
const NUMBER_RE = /\d+(?:[.,·]\d+)*/g;
const GROUPED_RE = /^\d{1,3}(?:[.,]\d{3})+$/;

/** Formas numéricas que um token pode representar (decimal e, se agrupado, inteiro sem separador). */
function numericForms(token: string): number[] {
  const forms = new Set<number>();
  const parts = token.split(/[.,·]/);
  if (parts.length <= 2) {
    const n = Number(token.replace(/[,·]/g, "."));
    if (Number.isFinite(n)) forms.add(n);
  }
  if (GROUPED_RE.test(token)) {
    const n = Number(token.replace(/[.,]/g, ""));
    if (Number.isFinite(n)) forms.add(n);
  }
  return [...forms];
}

function numbersIn(s: string): string[] {
  return s.normalize("NFKC").match(NUMBER_RE) ?? [];
}

/** Todo número presente no valor precisa aparecer na citação (como número, não como substring). */
export function numbersInQuote(value: unknown, quote: string): boolean {
  const quoteForms = new Set(numbersIn(quote).flatMap(numericForms));
  return numbersIn(String(value)).every((token) =>
    numericForms(token).some((n) => quoteForms.has(n)),
  );
}

/**
 * Posição do trecho no texto da página, para destacar no visualizador. Tolera
 * quebras de linha, hifenização e pontuação diferentes entre as palavras. Se o
 * trecho continua na página seguinte, destaca só o começo (primeiras palavras).
 */
export function findQuoteRange(text: string, quote: string): [number, number] | null {
  const words = quote.normalize("NFKC").match(/[\p{L}\p{N}]+/gu) ?? [];
  if (words.length < 3) return null;
  // As palavras só têm letras e números: não há o que escapar na regex.
  const source = text.normalize("NFKC");
  for (const n of [words.length, Math.min(words.length, 12), Math.min(words.length, 6)]) {
    const re = new RegExp(words.slice(0, n).join(String.raw`[^\p{L}\p{N}]+`), "iu");
    const m = re.exec(source);
    if (m) return [m.index, m.index + m[0].length];
  }
  return null;
}
