import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { buildCsv, buildXlsx, colName } from "./xlsx";

describe("xlsx", () => {
  it("colName", () => {
    expect([0, 25, 26, 27, 701, 702].map(colName)).toEqual(["A", "Z", "AA", "AB", "ZZ", "AAA"]);
  });

  it("gera um zip com as partes do SpreadsheetML e escapa o texto", () => {
    const bytes = buildXlsx("Projeto: <teste>", [
      ["Título", "Ano"],
      ['Ozônio & "glaucoma" <b>', 2021],
      [null, "linha\ncom quebra\u0007"],
    ]);
    const files = unzipSync(bytes);
    expect(Object.keys(files).sort()).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/workbook.xml",
      "xl/worksheets/sheet1.xml",
    ]);
    const sheet = strFromU8(files["xl/worksheets/sheet1.xml"]);
    expect(sheet).toContain("Ozônio &amp; &quot;glaucoma&quot; &lt;b&gt;");
    expect(sheet).toContain('<c r="B2" s="2"><v>2021</v></c>');
    expect(sheet).not.toContain("\u0007");
    // Nome da aba sem caracteres proibidos pelo Excel (: / \ ? * [ ]).
    expect(strFromU8(files["xl/workbook.xml"])).toContain('name="Projeto  &lt;teste&gt;"');
  });
});

describe("csv", () => {
  it("BOM, ponto e vírgula, aspas e fórmulas neutralizadas", () => {
    const csv = buildCsv([
      ["a;b", 'diz "oi"', "=1+1"],
      [null, 3, "linha\nnova"],
    ]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe('"a;b";"diz ""oi""";\'=1+1\r\n;3;"linha\nnova"\r\n');
  });
});
