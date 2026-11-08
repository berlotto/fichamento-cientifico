import { describe, expect, it } from "vitest";
import { findPdfLink, isPrivateAddress, pdfFilename } from "./fetch-pdf-utils";

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.0.10", "169.254.169.254",
    "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1",
  ])("%s é bloqueado", (ip) => expect(isPrivateAddress(ip)).toBe(true));

  it.each(["8.8.8.8", "172.32.0.1", "200.147.67.142", "2606:4700::1111"])("%s é público", (ip) =>
    expect(isPrivateAddress(ip)).toBe(false),
  );
});

describe("findPdfLink", () => {
  const base = new URL("https://www.scielo.br/j/rbof/a/abc/?lang=pt");
  it("citation_pdf_url relativo, em qualquer ordem de atributos", () => {
    const html = `<head><meta content="/j/rbof/a/abc/?format=pdf&amp;lang=pt" name="citation_pdf_url"></head>`;
    expect(findPdfLink(html, base)?.toString()).toBe("https://www.scielo.br/j/rbof/a/abc/?format=pdf&lang=pt");
  });
  it("link alternate do tipo PDF", () => {
    const html = `<link rel="alternate" type="application/pdf" href='https://x.org/a.pdf'>`;
    expect(findPdfLink(html, base)?.toString()).toBe("https://x.org/a.pdf");
  });
  it("sem link: null; ignora javascript:", () => {
    expect(findPdfLink(`<meta name="citation_pdf_url" content="javascript:alert(1)">`, base)).toBeNull();
    expect(findPdfLink("<html></html>", base)).toBeNull();
  });
});

describe("pdfFilename", () => {
  const url = new URL("https://x.org/files/artigo%20final?download=1");
  it("Content-Disposition, inclusive filename*", () => {
    expect(pdfFilename('attachment; filename="estudo.pdf"', url)).toBe("estudo.pdf");
    expect(pdfFilename("attachment; filename*=UTF-8''ozo%CC%82nio.pdf", url)).toBe("ozônio.pdf");
  });
  it("sem cabeçalho: fim do caminho, com .pdf", () => {
    expect(pdfFilename(null, url)).toBe("artigo final.pdf");
    expect(pdfFilename(null, new URL("https://x.org/"))).toBe("x.org.pdf");
  });
});
