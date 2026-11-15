import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { BackIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-controls";
import { articleStatus, TONE_CLASS } from "@/lib/article-status";
import { requireUser } from "@/lib/auth";
import { findQuoteRange } from "@/lib/pipeline/verify";
import { createClient } from "@/lib/supabase/server";
import { SelectableText } from "./selectable-text";

type Props = PageProps<"/viewer/[articleId]">;

type Mark = { range: [number, number]; target: boolean };

/**
 * Texto da página com destaques: o trecho aberto pelo link (campo da ficha ou
 * citação, com id="trecho") e, mais leves, as citações já guardadas na página.
 */
function highlighted(text: string, marks: Mark[]) {
  const sorted = [...marks].sort((a, b) => a.range[0] - b.range[0] || Number(b.target) - Number(a.target));
  const nodes: ReactNode[] = [];
  let pos = 0;
  let targetDone = false;
  for (const { range, target } of sorted) {
    if (range[0] < pos) continue; // sobreposto a um destaque anterior
    nodes.push(text.slice(pos, range[0]));
    const isTarget = target && !targetDone;
    if (isTarget) targetDone = true;
    nodes.push(
      <mark
        key={range[0]}
        id={isTarget ? "trecho" : undefined}
        className={
          isTarget
            ? "rounded-sm bg-tint px-0.5 text-ink ring-1 ring-accent"
            : "rounded-sm bg-tint/60 text-ink underline decoration-accent decoration-1 underline-offset-2"
        }
      >
        {text.slice(range[0], range[1])}
      </mark>,
    );
    pos = range[1];
  }
  nodes.push(text.slice(pos));
  return nodes;
}

/**
 * PDF ao lado do texto extraído da página (F0.9). O PDF usa o visualizador do
 * navegador; o PDF.js com destaque da citação entra na F1.7 (revisão).
 */
async function ArticleView({ params, searchParams }: Props) {
  const { articleId } = await params;
  const { p, q, c } = await searchParams;
  const quote = (Array.isArray(q) ? q[0] : q)?.slice(0, 300) ?? null;
  const quoteId = Array.isArray(c) ? c[0] : c;
  await requireUser();
  const supabase = await createClient();

  const { data: article } = await supabase
    .from("articles")
    .select("id, project_id, title, original_filename, storage_path, status, page_count, error")
    .eq("id", articleId)
    .maybeSingle();
  if (!article) notFound();

  const pageCount = article.page_count ?? 0;
  const requested = Number(Array.isArray(p) ? p[0] : p);
  const page = Number.isInteger(requested) && requested >= 1 && requested <= pageCount ? requested : 1;

  const [{ data: signed }, { data: pageRow }, { data: saved }] = await Promise.all([
    supabase.storage.from("pdfs").createSignedUrl(article.storage_path, 60 * 60),
    supabase
      .from("article_pages")
      .select("pdf_page, printed_page, text")
      .eq("article_id", articleId)
      .eq("pdf_page", page)
      .maybeSingle(),
    supabase.from("quotes").select("id, text").eq("article_id", articleId).eq("pdf_page", page),
  ]);

  const text = pageRow?.text ?? "";
  const marks: Mark[] = [];
  const fieldRange = quote && text ? findQuoteRange(text, quote) : null;
  if (fieldRange) marks.push({ range: fieldRange, target: true });
  for (const sq of saved ?? []) {
    const range = text ? findQuoteRange(text, sq.text) : null;
    if (range) marks.push({ range, target: sq.id === quoteId });
  }
  const fichaHref = `/projects/${article.project_id}/articles/${article.id}`;

  const base = `/viewer/${articleId}`;
  const status = articleStatus(article.status);
  const navLink = "btn min-h-9 px-3 text-[13px]";
  const navOff = `${navLink} pointer-events-none opacity-50`;

  return (
    <main className="flex min-h-dvh flex-1 flex-col gap-3 bg-page p-4">
      <header className="flex flex-wrap items-center gap-2">
        <Link
          href={fichaHref}
          className="icon-btn -ml-2"
          aria-label="Voltar à ficha"
        >
          <BackIcon />
        </Link>
        <h1 className="m-0 min-w-0 flex-1 font-article text-xl leading-tight font-normal">
          {article.title ?? article.original_filename}
        </h1>
        <span className={`text-xs font-medium ${TONE_CLASS[status.tone]}`}>{status.label}</span>
        <ThemeToggle />
      </header>

      {pageCount > 0 && (
        <nav className="flex flex-wrap items-center gap-3 text-sm" aria-label="Páginas">
          {page > 1 ? (
            <Link href={`${base}?p=${page - 1}`} className={navLink}>
              ← anterior
            </Link>
          ) : (
            <span className={navOff}>← anterior</span>
          )}
          <span>
            PDF {page}/{pageCount}
            <span className="text-muted"> · página impressa: {pageRow?.printed_page ?? "não identificada"}</span>
          </span>
          {page < pageCount ? (
            <Link href={`${base}?p=${page + 1}`} className={navLink}>
              próxima →
            </Link>
          ) : (
            <span className={navOff}>próxima →</span>
          )}
          {text && (
            <span className="text-xs text-muted max-lg:basis-full lg:ml-auto">
              Selecione um trecho do texto extraído para guardar como citação.
            </span>
          )}
        </nav>
      )}

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        {signed?.signedUrl ? (
          <iframe
            key={page}
            src={`${signed.signedUrl}#page=${page}`}
            title="PDF"
            className="min-h-[75vh] w-full rounded-lg border border-line bg-surface"
          />
        ) : (
          <p className="text-warn">Não foi possível abrir o PDF.</p>
        )}
        {text ? (
          <SelectableText articleId={article.id} page={page} fichaHref={fichaHref}>
            {highlighted(text, marks)}
          </SelectableText>
        ) : (
          <pre className="min-h-[75vh] overflow-auto rounded-lg border border-line bg-surface p-4 font-mono text-xs whitespace-pre-wrap">
            {pageCount ? "Página sem texto." : "Texto ainda não extraído."}
          </pre>
        )}
      </div>
    </main>
  );
}

export default function ViewerPage(props: Props) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Carregando…</p>}>
      <ArticleView params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
