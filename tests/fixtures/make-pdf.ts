/**
 * Gera um PDF simples (Helvetica, uma coluna) para testes, sem dependências.
 * Cada página tem cabeçalho, corpo e número impresso no rodapé.
 */
export type FakePage = { header?: string; lines: string[]; footer?: string };

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

function content(page: FakePage): string {
  const ops: string[] = ["BT", "/F1 10 Tf"];
  if (page.header) ops.push(`1 0 0 1 72 770 Tm (${esc(page.header)}) Tj`);
  page.lines.forEach((line, i) => ops.push(`1 0 0 1 72 ${720 - i * 14} Tm (${esc(line)}) Tj`));
  if (page.footer) ops.push(`1 0 0 1 300 40 Tm (${esc(page.footer)}) Tj`);
  ops.push("ET");
  return ops.join("\n");
}

export function makePdf(pages: FakePage[]): Uint8Array {
  const objects: string[] = [];
  const add = (body: string) => objects.push(body) - 1 + 1; // número do objeto (1-based)

  const catalog = add(""); // preenchido depois
  const pagesObj = add("");
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  const kids: number[] = [];
  for (const p of pages) {
    const stream = content(p);
    const contentObj = add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
    kids.push(
      add(
        `<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 612 792] ` +
          `/Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${contentObj} 0 R >>`,
      ),
    );
  }
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objects[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(out, "latin1"));
}

/** Artigo de 5 páginas: capa sem número + 4 páginas numeradas 215–218. */
export function sampleArticlePdf(): Uint8Array {
  const body = (n: number) =>
    Array.from({ length: 30 }, (_, i) => `Body text line ${i + 1} of section ${n}. We enrolled 120 participants.`);
  return makePdf([
    { lines: ["Downloaded from the institutional repository", "Cover page", ...body(0)] },
    { header: "Journal of Ocular Research 12 (2026)", lines: ["Introduction", ...body(1)], footer: "215" },
    { header: "Journal of Ocular Research 12 (2026)", lines: ["Methods", ...body(2)], footer: "216" },
    {
      header: "Journal of Ocular Research 12 (2026)",
      lines: ["Results: the incidence was 12.4 per 1000 person-years among exposed workers.", ...body(3)],
      footer: "217",
    },
    { header: "Journal of Ocular Research 12 (2026)", lines: ["Discussion", ...body(4)], footer: "218" },
  ]);
}
