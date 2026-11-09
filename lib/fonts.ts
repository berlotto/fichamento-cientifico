/**
 * Fontes que o usuário pode escolher (perfil > Aparência).
 *
 * Duas escolhas independentes:
 * - interface: botões, menus, rótulos, títulos de tela;
 * - artigo: tudo o que é conteúdo do artigo (título, resumo, campos da ficha,
 *   trechos citados, matriz).
 *
 * Seleção baseada em https://www.alfdesigngroup.com/post/best-google-fonts-web-content
 * (as que o artigo indica para texto corrido; Playfair Display, DM Serif Display
 * e Space Grotesk ficaram de fora por serem de título) + algumas manuscritas.
 * O arquivo da fonte só é baixado quando ela está em uso (@font-face sem preload).
 */

export type FontCategory = "padrao" | "sem-serifa" | "serifa" | "manuscrita";
export type FontRole = "ui" | "article";

export type FontOption = {
  id: string;
  label: string;
  /** Variável CSS criada pelo next/font (app/fonts.ts). Vazia no "padrão". */
  cssVar: string;
  category: FontCategory;
  roles: FontRole[];
  note?: string;
};

export const FONT_OPTIONS: FontOption[] = [
  { id: "padrao", label: "Padrão do Fichamento", cssVar: "", category: "padrao", roles: ["ui", "article"] },

  // Sem serifa
  { id: "inter", label: "Inter", cssVar: "--font-inter", category: "sem-serifa", roles: ["ui", "article"], note: "Muito legível em tamanhos pequenos" },
  { id: "source-sans", label: "Source Sans 3", cssVar: "--font-source-sans", category: "sem-serifa", roles: ["ui", "article"], note: "Neutra, combina com tudo" },
  { id: "work-sans", label: "Work Sans", cssVar: "--font-work-sans", category: "sem-serifa", roles: ["ui", "article"], note: "Boa para leitura longa" },
  { id: "roboto", label: "Roboto", cssVar: "--font-roboto", category: "sem-serifa", roles: ["ui", "article"], note: "Familiar e sóbria" },
  { id: "noto-sans", label: "Noto Sans", cssVar: "--font-noto-sans", category: "sem-serifa", roles: ["ui", "article"], note: "Cobre muitos alfabetos" },
  { id: "dm-sans", label: "DM Sans", cssVar: "--font-dm-sans", category: "sem-serifa", roles: ["ui"], note: "Compacta, boa para telas densas" },
  { id: "plus-jakarta", label: "Plus Jakarta Sans", cssVar: "--font-plus-jakarta", category: "sem-serifa", roles: ["ui"], note: "Moderna, com personalidade" },
  { id: "nunito", label: "Nunito", cssVar: "--font-nunito", category: "sem-serifa", roles: ["ui", "article"], note: "Arredondada e acolhedora" },
  { id: "poppins", label: "Poppins", cssVar: "--font-poppins", category: "sem-serifa", roles: ["ui"], note: "Geométrica" },
  { id: "urbanist", label: "Urbanist", cssVar: "--font-urbanist", category: "sem-serifa", roles: ["ui"], note: "Elegante e limpa" },

  // Serifa
  { id: "lora", label: "Lora", cssVar: "--font-lora", category: "serifa", roles: ["ui", "article"], note: "Feita para leitura em tela" },
  { id: "merriweather", label: "Merriweather", cssVar: "--font-merriweather", category: "serifa", roles: ["ui", "article"], note: "Clássica para textos longos" },
  { id: "noto-serif", label: "Noto Serif", cssVar: "--font-noto-serif", category: "serifa", roles: ["ui", "article"], note: "Cobre muitos alfabetos" },
  { id: "source-serif", label: "Source Serif 4", cssVar: "--font-source-serif", category: "serifa", roles: ["article"], note: "Editorial, par da Source Sans" },

  // Manuscritas
  { id: "patrick-hand", label: "Patrick Hand", cssVar: "--font-patrick-hand", category: "manuscrita", roles: ["ui", "article"], note: "Letra de forma, a mais legível" },
  { id: "kalam", label: "Kalam", cssVar: "--font-kalam", category: "manuscrita", roles: ["ui", "article"], note: "Caneta, informal" },
  { id: "caveat", label: "Caveat", cssVar: "--font-caveat", category: "manuscrita", roles: ["ui", "article"], note: "Anotação rápida (fica menor)" },
  { id: "architects-daughter", label: "Architects Daughter", cssVar: "--font-architects-daughter", category: "manuscrita", roles: ["ui", "article"], note: "Letra de arquiteto" },
  { id: "indie-flower", label: "Indie Flower", cssVar: "--font-indie-flower", category: "manuscrita", roles: ["ui", "article"], note: "Caderno escolar" },
];

export const CATEGORY_LABEL: Record<FontCategory, string> = {
  padrao: "Padrão",
  "sem-serifa": "Sem serifa",
  serifa: "Serifa",
  manuscrita: "Manuscrita",
};

export const FONT_UI_KEY = "fichamento-font-ui";
export const FONT_ARTICLE_KEY = "fichamento-font-article";

export const fontById = (id: string | null | undefined) => FONT_OPTIONS.find((f) => f.id === id);

export function validFont(id: unknown, role: FontRole): string {
  const f = typeof id === "string" ? fontById(id) : undefined;
  return f && f.roles.includes(role) ? f.id : "padrao";
}

/**
 * CSS que liga data-font-ui / data-font-article no <html> às variáveis do tema
 * (app/globals.css): --fx-font-ui (texto da interface), --fx-font-ui-display
 * (títulos da interface) e --fx-font-article (conteúdo do artigo). Gerado daqui
 * para não haver duas listas. Manuscritas ganham font-size-adjust (letra pequena).
 */
export function fontCss(): string {
  return FONT_OPTIONS.filter((f) => f.cssVar)
    .map((f) => {
      const stack = `var(${f.cssVar}), ${f.category === "serifa" ? "Georgia, serif" : "system-ui, sans-serif"}`;
      const adjust = f.category === "manuscrita" ? "0.54" : "none";
      return (
        `html[data-font-ui="${f.id}"]{--fx-font-ui:${stack};--fx-font-ui-display:${stack};--fx-ui-adjust:${adjust}}` +
        `html[data-font-article="${f.id}"]{--fx-font-article:${stack};--fx-article-adjust:${adjust}}`
      );
    })
    .join("");
}

/** Roda no <head> antes da pintura (junto com o do tema): aplica as fontes salvas. */
export const fontInitScript = `try{var d=document.documentElement,u=localStorage.getItem("${FONT_UI_KEY}"),a=localStorage.getItem("${FONT_ARTICLE_KEY}");if(u)d.dataset.fontUi=u;if(a)d.dataset.fontArticle=a}catch(e){}`;
