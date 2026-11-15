import { describe, expect, it } from "vitest";
import { cleanTagName, sameTagName, tagFamily, tagPath, tagTree, type Tag } from "./tags";

const tags: Tag[] = [
  { id: "a", name: "Método", parent_id: null, color: "green" },
  { id: "b", name: "Amostra", parent_id: null, color: "blue" },
  { id: "c", name: "tamanho", parent_id: "b", color: "gray" },
  { id: "d", name: "Aleatorização", parent_id: "b", color: "red" },
];

describe("tags", () => {
  it("limpa e compara nomes sem diferenciar maiúsculas e espaços", () => {
    expect(cleanTagName("  limitação   amostral ")).toBe("limitação amostral");
    expect(sameTagName("Limitação  Amostral", "limitação amostral")).toBe(true);
    expect(cleanTagName("x".repeat(80))).toHaveLength(60);
  });
  it("caminho tema › subtema", () => {
    expect(tagPath(tags[2], tags)).toBe("Amostra › tamanho");
    expect(tagPath(tags[0], tags)).toBe("Método");
  });
  it("família do tema inclui os subtemas", () => {
    expect([...tagFamily("b", tags)].sort()).toEqual(["b", "c", "d"]);
    expect([...tagFamily("c", tags)]).toEqual(["c"]);
  });
  it("árvore em ordem alfabética, subtemas depois do tema", () => {
    expect(tagTree(tags).map((t) => `${t.depth}:${t.tag.name}`)).toEqual([
      "0:Amostra",
      "1:Aleatorização",
      "1:tamanho",
      "0:Método",
    ]);
  });
});
