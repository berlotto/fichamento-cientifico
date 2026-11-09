/**
 * Texto ilegível na camada de texto do PDF.
 *
 * Alguns PDFs (ex.: eLife, gerados com fontes sem tabela ToUnicode) entregam os
 * caracteres deslocados de um valor fixo: "3DJHRI $EVWUDFW" em vez de
 * "Page of Abstract" (deslocamento 29). O texto parece cheio, mas o LLM recebe
 * lixo. Aqui detectamos página ilegível e, quando é esse deslocamento,
 * consertamos.
 */

// Só vogais minúsculas: o texto deslocado vira quase todo maiúsculo ("EVWUDFW"),
// enquanto a prosa normal tem vogal minúscula em quase toda palavra.
const VOWEL = /[aeiouyáàâãéêíóôõúü]/;

/** Fração das palavras de 3+ letras com vogal minúscula. Prosa normal fica acima de 0,8. */
export function readability(text: string): number {
  const words = text.match(/\p{L}{3,}/gu) ?? [];
  if (words.length < 20) return 1; // pouco texto: não dá para julgar
  return words.filter((w) => VOWEL.test(w)).length / words.length;
}

export const GARBLED_BELOW = 0.6;

/** Desloca os caracteres de "!" a "`" em +29 ("3"→"P", "D"→"a", "$"→"A"). */
export function unshift29(text: string): string {
  return text.replace(/[!-`]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 29));
}

/**
 * Página com texto ilegível: tenta o deslocamento 29; se o resultado for legível,
 * usa. Senão devolve o texto original e `garbled: true` (vai para OCR).
 */
export function repairPageText(text: string): { text: string; garbled: boolean } {
  if (readability(text) >= GARBLED_BELOW) return { text, garbled: false };
  const fixed = unshift29(text);
  if (readability(fixed) >= 0.85) return { text: fixed, garbled: false };
  return { text, garbled: true };
}
