import { describe, expect, it } from "vitest";
import { makePdf, sampleArticlePdf } from "@/tests/fixtures/make-pdf";
import { parsePdf } from "./parse";

describe("parsePdf", () => {
  it("extrai texto por página e infere a página impressa", async () => {
    const { pages, needsOcr } = await parsePdf(sampleArticlePdf());
    expect(pages).toHaveLength(5);
    expect(needsOcr).toBe(false);
    expect(pages[3].text).toContain("incidence was 12.4 per 1000");
    expect(pages.map((p) => p.printed_page)).toEqual([null, "215", "216", "217", "218"]);
  });

  it("marca needs_ocr quando quase não há texto", async () => {
    const { needsOcr } = await parsePdf(makePdf([{ lines: ["x"] }, { lines: [] }]));
    expect(needsOcr).toBe(true);
  });
});
