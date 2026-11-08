/** Partes puras da importação por URL (testáveis sem rede). */

/** IPs que não podem ser alvo de download: privados, loopback, link-local, CGNAT, multicast etc. */
export function isPrivateAddress(ip: string): boolean {
  const v4mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (v4mapped) return isPrivateAddress(v4mapped[1]);

  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }

  const v6 = ip.toLowerCase();
  return (
    v6 === "::" ||
    v6 === "::1" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    /^fe[89ab]/.test(v6) ||
    v6.startsWith("ff")
  );
}

const attr = (tag: string, name: string) =>
  new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i").exec(tag)?.slice(2, 4).find(Boolean);

/** URL do PDF numa página de artigo: <meta name="citation_pdf_url">, senão <link type="application/pdf">. */
export function findPdfLink(html: string, base: URL): URL | null {
  const candidates: string[] = [];
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (/^citation_pdf_url$/i.test(attr(tag, "name") ?? attr(tag, "property") ?? "")) {
      const c = attr(tag, "content");
      if (c) candidates.push(c);
    }
  }
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (/application\/pdf/i.test(attr(tag, "type") ?? "")) {
      const h = attr(tag, "href");
      if (h) candidates.push(h);
    }
  }
  for (const c of candidates) {
    try {
      const u = new URL(c.replace(/&amp;/g, "&"), base);
      if (u.protocol === "http:" || u.protocol === "https:") return u;
    } catch {
      // candidato inválido: tenta o próximo
    }
  }
  return null;
}

/** Nome do arquivo: Content-Disposition, senão o fim do caminho; sempre termina em .pdf. */
export function pdfFilename(disposition: string | null, url: URL): string {
  let name: string | undefined;
  const star = /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i.exec(disposition ?? "");
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(disposition ?? "");
  try {
    name = star ? decodeURIComponent(star[1].trim().replace(/^"|"$/g, "")) : plain?.[1].trim();
  } catch {
    name = plain?.[1].trim();
  }
  if (!name) {
    const last = url.pathname.split("/").filter(Boolean).pop();
    try {
      name = last ? decodeURIComponent(last) : undefined;
    } catch {
      name = last;
    }
  }
  name = (name || url.hostname).normalize("NFC").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_").slice(0, 150);
  return /\.pdf$/i.test(name) ? name : `${name}.pdf`;
}
