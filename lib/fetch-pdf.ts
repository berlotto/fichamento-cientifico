import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { findPdfLink, isPrivateAddress, pdfFilename } from "./fetch-pdf-utils";

/**
 * Baixa um PDF de uma URL informada pelo usuário (importação por link).
 *
 * Proteções: só http(s); o host precisa resolver para IP público (sem rede
 * interna, localhost ou metadados de nuvem), checado a cada redirecionamento;
 * no máximo 50 MB e 30 s. Se a URL for a página do artigo, segue o
 * `citation_pdf_url` (meta tag que a maioria das editoras publica).
 */

export const MAX_PDF_BYTES = 50 * 1024 * 1024;
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 30_000;

export class FetchPdfError extends Error {}

async function assertPublicHost(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new FetchPdfError("Use um endereço http ou https.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new FetchPdfError("Endereço não encontrado.");
  if (addresses.some((a) => isPrivateAddress(a.address))) {
    throw new FetchPdfError("Endereço não permitido.");
  }
}

async function readLimited(res: Response, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  const declared = Number(res.headers.get("content-length"));
  if (declared > limit) throw new FetchPdfError("Arquivo maior que 50 MB.");
  const reader = res.body?.getReader();
  if (!reader) return new Uint8Array(new ArrayBuffer(0));
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new FetchPdfError("Arquivo maior que 50 MB.");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(new ArrayBuffer(size));
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/** GET seguindo redirecionamentos manualmente, checando o host em cada salto. */
async function safeGet(start: URL, signal: AbortSignal): Promise<{ res: Response; url: URL }> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; fichamento-cientifico/0.1)",
        Accept: "application/pdf,text/html;q=0.9,*/*;q=0.5",
      },
    });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel();
      url = new URL(location, url);
      continue;
    }
    if (!res.ok) throw new FetchPdfError(`O site respondeu ${res.status}.`);
    return { res, url };
  }
  throw new FetchPdfError("Redirecionamentos demais.");
}

const isPdf = (bytes: Uint8Array) =>
  bytes.length > 5 && String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-";

export type FetchedPdf = { bytes: Uint8Array<ArrayBuffer>; filename: string; finalUrl: string };

export async function fetchPdf(input: string): Promise<FetchedPdf> {
  let start: URL;
  try {
    start = new URL(input.trim());
  } catch {
    throw new FetchPdfError("Endereço inválido.");
  }
  const signal = AbortSignal.timeout(TIMEOUT_MS);

  try {
    let { res, url } = await safeGet(start, signal);
    let type = res.headers.get("content-type") ?? "";

    if (type.includes("html")) {
      const html = new TextDecoder().decode(await readLimited(res, MAX_HTML_BYTES));
      const link = findPdfLink(html, url);
      if (!link) {
        throw new FetchPdfError("A página não tem link para o PDF. Use o endereço direto do PDF.");
      }
      ({ res, url } = await safeGet(link, signal));
      type = res.headers.get("content-type") ?? "";
    }

    const bytes = await readLimited(res, MAX_PDF_BYTES);
    if (!isPdf(bytes)) {
      throw new FetchPdfError(
        type.includes("html")
          ? "O site devolveu uma página, não o PDF (pode exigir login ou bloquear downloads)."
          : "O arquivo não é um PDF.",
      );
    }
    return { bytes, filename: pdfFilename(res.headers.get("content-disposition"), url), finalUrl: url.toString() };
  } catch (e) {
    if (e instanceof FetchPdfError) throw e;
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
      throw new FetchPdfError("O site demorou demais para responder.");
    }
    throw new FetchPdfError("Não foi possível baixar o arquivo.");
  }
}
