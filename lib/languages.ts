/** Idiomas em que a ficha pode ser escrita (configurável por projeto). */

export type OutputLanguage = { code: string; label: string; prompt: string };

export const OUTPUT_LANGUAGES: OutputLanguage[] = [
  { code: "pt-BR", label: "Português (Brasil)", prompt: "português do Brasil" },
  { code: "pt-PT", label: "Português (Portugal)", prompt: "português europeu" },
  { code: "en", label: "Inglês", prompt: "inglês" },
  { code: "es", label: "Espanhol", prompt: "espanhol" },
  { code: "fr", label: "Francês", prompt: "francês" },
  { code: "de", label: "Alemão", prompt: "alemão" },
  { code: "it", label: "Italiano", prompt: "italiano" },
];

export const DEFAULT_LANGUAGE = "pt-BR";

export const languageByCode = (code: string | null | undefined) =>
  OUTPUT_LANGUAGES.find((l) => l.code === code) ?? OUTPUT_LANGUAGES[0];

export const validLanguage = (code: unknown) =>
  typeof code === "string" && OUTPUT_LANGUAGES.some((l) => l.code === code) ? code : DEFAULT_LANGUAGE;

/** "en" do artigo e "en" da ficha: mesmo idioma (pt-BR e pt-PT contam como português). */
export const sameLanguage = (articleLang: string | null | undefined, outputCode: string) =>
  !!articleLang && articleLang.toLowerCase().slice(0, 2) === outputCode.toLowerCase().slice(0, 2);
