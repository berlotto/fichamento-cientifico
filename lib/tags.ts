/** Tags e temas (spec 003): tipos e regras puras, usados no cliente e no servidor. */

export const TAG_COLORS = ["green", "blue", "amber", "red", "violet", "gray"] as const;
export type TagColor = (typeof TAG_COLORS)[number];

/** Cor do marcador da tag; legível nos temas claro e escuro. */
export const TAG_HEX: Record<TagColor, string> = {
  green: "#1f9e83",
  blue: "#3b7dd8",
  amber: "#d08a16",
  red: "#d0503f",
  violet: "#8a63d2",
  gray: "#8a8f98",
};

export const TAG_COLOR_LABEL: Record<TagColor, string> = {
  green: "Verde",
  blue: "Azul",
  amber: "Âmbar",
  red: "Vermelho",
  violet: "Violeta",
  gray: "Cinza",
};

export const MAX_TAGS_PER_PROJECT = 300;
export const MAX_TAG_NAME = 60;

export type Tag = { id: string; name: string; parent_id: string | null; color: string };

export const tagHex = (color: string) => TAG_HEX[(TAG_COLORS as readonly string[]).includes(color) ? (color as TagColor) : "gray"];

/** Nome limpo: espaços colapsados, sem bordas, até 60 caracteres. */
export const cleanTagName = (name: string) => name.replace(/\s+/g, " ").trim().slice(0, MAX_TAG_NAME);

/** Mesma tag ignorando maiúsculas e espaços (o banco tem índice único igual). */
export const sameTagName = (a: string, b: string) =>
  cleanTagName(a).toLocaleLowerCase("pt-BR") === cleanTagName(b).toLocaleLowerCase("pt-BR");

/** "Tema › Subtema" para exibir. */
export function tagPath(tag: Tag, all: Tag[]): string {
  const parent = tag.parent_id ? all.find((t) => t.id === tag.parent_id) : undefined;
  return parent ? `${parent.name} › ${tag.name}` : tag.name;
}

/** A tag e seus subtemas: filtrar por um tema inclui o que foi marcado nos subtemas. */
export function tagFamily(tagId: string, all: Tag[]): Set<string> {
  return new Set([tagId, ...all.filter((t) => t.parent_id === tagId).map((t) => t.id)]);
}

/** Temas em ordem alfabética, cada um seguido dos seus subtemas. */
export function tagTree(all: Tag[]): { tag: Tag; depth: 0 | 1 }[] {
  const byName = (a: Tag, b: Tag) => a.name.localeCompare(b.name, "pt-BR");
  const ids = new Set(all.map((t) => t.id));
  const roots = all.filter((t) => !t.parent_id || !ids.has(t.parent_id)).sort(byName);
  return roots.flatMap((r) => [
    { tag: r, depth: 0 as const },
    ...all
      .filter((t) => t.parent_id === r.id)
      .sort(byName)
      .map((t) => ({ tag: t, depth: 1 as const })),
  ]);
}
