/** Valores em dólar: centavos de dólar viram 4 casas (custos de IA por chamada). */
export const usd = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "USD",
    ...(n !== 0 && Math.abs(n) < 0.01 ? { minimumFractionDigits: 4, maximumFractionDigits: 4 } : {}),
  });

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export const STAGE_LABEL: Record<string, string> = {
  extract: "Extração",
  extract_b: "Segundo modelo",
  judge: "Juiz",
  test: "Teste de modelo",
};
