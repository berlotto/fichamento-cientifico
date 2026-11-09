import { extractText, extractTextItems, getDocumentProxy } from "unpdf";
import { inferPrintedPages, marginNumbers } from "./printed-page";
import { repairPageText } from "./text-quality";

export type ParsedPage = { pdf_page: number; printed_page: string | null; text: string };
export type ParseResult = { pages: ParsedPage[]; needsOcr: boolean };

/** Média de caracteres por página abaixo disso indica PDF escaneado sem camada de texto. */
export const OCR_CHARS_PER_PAGE = 200;

export function needsOcr(texts: string[]): boolean {
  if (texts.length === 0) return true;
  const total = texts.reduce((acc, t) => acc + t.replace(/\s+/g, "").length, 0);
  return total / texts.length < OCR_CHARS_PER_PAGE;
}

export async function parsePdf(data: Uint8Array): Promise<ParseResult> {
  const pdf = await getDocumentProxy(data);
  try {
    const { text } = await extractText(pdf, { mergePages: false });
    const { items } = await extractTextItems(pdf);

    const printed = inferPrintedPages(
      items.map((pageItems, i) => ({ pdf_page: i + 1, numbers: marginNumbers(pageItems) })),
    );

    // Postgres não aceita NUL em text.
    const repaired = text.map((t) => repairPageText(t.replaceAll("\u0000", "")));
    const pages = repaired.map((r, i) => ({
      pdf_page: i + 1,
      printed_page: printed.get(i + 1) ?? null,
      text: r.text,
    }));

    // Ilegível na maioria das páginas: trata como escaneado (precisa de OCR).
    const garbled = repaired.filter((r) => r.garbled).length > repaired.length / 2;
    return { pages, needsOcr: garbled || needsOcr(text) };
  } finally {
    await pdf.loadingTask.destroy();
  }
}
