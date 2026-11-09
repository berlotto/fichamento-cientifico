/**
 * Heurística de página impressa (a ABNT cita a página impressa, não o índice do PDF).
 *
 * 1. Em cada página, pega números isolados nas linhas mais altas e mais baixas
 *    (cabeçalho/rodapé).
 * 2. Cada candidato vota num deslocamento `impressa - pdf_page`.
 * 3. O deslocamento vencedor vale se tiver votos suficientes; a página impressa é
 *    atribuída só dentro do intervalo de páginas que confirmaram o deslocamento
 *    (capa e anexos sem numeração ficam null).
 */

export type MarginItem = { str: string; y: number };

const MARGIN_LINES = 2;
const NUMBER_ONLY = /^\d{1,4}$/;
// "Page 2 of 9" (BMC, Springer), "Página 3 de 10", "p. 4".
const PAGE_LABEL = /\b(?:page|página|pág\.?|p\.)\s*(\d{1,4})(?:\s+(?:of|de)\s+\d{1,4})?\b/i;

/** Números de página nas MARGIN_LINES linhas do topo e da base: isolados ou em "Page X of Y". */
export function marginNumbers(items: MarginItem[]): number[] {
  const withText = items.filter((it) => it.str.trim().length > 0);
  if (withText.length === 0) return [];

  const ys = [...new Set(withText.map((it) => Math.round(it.y)))].sort((a, b) => b - a);
  const marginYs = [...new Set([...ys.slice(0, MARGIN_LINES), ...ys.slice(-MARGIN_LINES)])];

  const numbers: number[] = [];
  for (const y of marginYs) {
    const line = withText.filter((it) => Math.round(it.y) === y);
    for (const it of line) if (NUMBER_ONLY.test(it.str.trim())) numbers.push(Number(it.str.trim()));
    const label = PAGE_LABEL.exec(line.map((it) => it.str.trim()).join(" "));
    if (label) numbers.push(Number(label[1]));
  }
  return numbers;
}

export type PageCandidates = { pdf_page: number; numbers: number[] };

/** Mapa pdf_page -> página impressa (string), ou null quando não há confiança. */
export function inferPrintedPages(
  pages: PageCandidates[],
  { minVotes = 2, minShare = 0.3 } = {},
): Map<number, string | null> {
  const result = new Map<number, string | null>(pages.map((p) => [p.pdf_page, null]));
  if (pages.length === 0) return result;

  const votes = new Map<number, number[]>();
  for (const p of pages) {
    for (const offset of new Set(p.numbers.map((n) => n - p.pdf_page))) {
      if (!votes.has(offset)) votes.set(offset, []);
      votes.get(offset)!.push(p.pdf_page);
    }
  }

  let best: { offset: number; pages: number[] } | null = null;
  for (const [offset, voters] of votes) {
    if (!best || voters.length > best.pages.length) best = { offset, pages: voters };
  }
  if (!best) return result;
  if (best.pages.length < minVotes || best.pages.length / pages.length < minShare) return result;

  const first = Math.min(...best.pages);
  const last = Math.max(...best.pages);
  for (const p of pages) {
    const printed = p.pdf_page + best.offset;
    if (p.pdf_page >= first && p.pdf_page <= last && printed >= 1) {
      result.set(p.pdf_page, String(printed));
    }
  }
  return result;
}
