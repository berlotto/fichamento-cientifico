/**
 * Citações marcadas à mão (spec 002): regras puras, usadas no visualizador e
 * nas ações de servidor.
 */
import { compact } from "@/lib/pipeline/verify";

export const MAX_QUOTE_CHARS = 2000;
export const MAX_QUOTES_PER_ARTICLE = 200;
export const MAX_QUOTE_COMMENT = 2000;
export const MIN_QUOTE_WORDS = 3;

/**
 * Texto selecionado no painel, contínuo: junta a palavra hifenizada na quebra
 * de linha ("exem-\nplo" → "exemplo") e troca quebras e espaços repetidos por
 * um espaço. Hífen antes de quebra só some entre letras minúsculas, para não
 * estragar "pós-\nGraduação" ou "COVID-\n19".
 */
export function normalizeSelection(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/(\p{Ll})[-­]\s*\r?\n\s*(\p{Ll})/gu, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

export type QuoteCheck = { ok: true; text: string } | { ok: false; error: string };

/**
 * Confere a seleção contra o texto da página: precisa estar lá (ignorando
 * espaços, hifenização e pontuação), ter ao menos três palavras e caber no
 * limite. Recusa seleções que pegaram rótulos da tela ou de outra página.
 */
export function checkQuote(raw: string, pageText: string): QuoteCheck {
  const text = normalizeSelection(raw);
  const words = text.match(/[\p{L}\p{N}]+/gu) ?? [];
  if (words.length < MIN_QUOTE_WORDS) return { ok: false, error: "Selecione ao menos três palavras." };
  if (text.length > MAX_QUOTE_CHARS) {
    return { ok: false, error: `O trecho passa de ${MAX_QUOTE_CHARS.toLocaleString("pt-BR")} caracteres.` };
  }
  if (!compact(pageText).includes(compact(text))) {
    return { ok: false, error: "O trecho não foi encontrado no texto desta página. Selecione só o texto do artigo." };
  }
  return { ok: true, text };
}
