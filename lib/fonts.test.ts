import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FONT_OPTIONS, fontCss, validFont } from "./fonts";

describe("fontes", () => {
  it("ids únicos e cada variável existe em app/fonts.ts (as duas listas não divergem)", () => {
    const ids = FONT_OPTIONS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    const loaders = readFileSync("app/fonts.ts", "utf8");
    for (const f of FONT_OPTIONS.filter((o) => o.cssVar)) {
      expect(loaders, f.id).toContain(`variable: "${f.cssVar}"`);
    }
  });

  it("validFont aceita só fontes do papel certo", () => {
    expect(validFont("inter", "ui")).toBe("inter");
    expect(validFont("source-serif", "ui")).toBe("padrao"); // só para artigo
    expect(validFont("dm-sans", "article")).toBe("padrao"); // só para interface
    expect(validFont("<script>", "ui")).toBe("padrao");
    expect(validFont(null, "article")).toBe("padrao");
  });

  it("CSS gerado liga data-font-* às variáveis do tema; manuscrita ajusta o tamanho", () => {
    const css = fontCss();
    expect(css).toContain('html[data-font-ui="inter"]{--fx-font-ui:var(--font-inter), system-ui, sans-serif;');
    expect(css).toContain('html[data-font-article="lora"]{--fx-font-article:var(--font-lora), Georgia, serif;--fx-article-adjust:none}');
    expect(css).toContain('html[data-font-article="caveat"]{--fx-font-article:var(--font-caveat), system-ui, sans-serif;--fx-article-adjust:0.54}');
    expect(css).not.toContain("padrao");
  });

  it("tem as manuscritas pedidas", () => {
    expect(FONT_OPTIONS.filter((f) => f.category === "manuscrita").length).toBeGreaterThanOrEqual(4);
  });
});
