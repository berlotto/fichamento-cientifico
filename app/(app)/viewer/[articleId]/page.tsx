import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-controls";
import { articleStatus, TONE_CLASS } from "@/lib/article-status";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Props = PageProps<"/viewer/[articleId]">;

/**
 * PDF ao lado do texto extraído da página (F0.9). O PDF usa o visualizador do
 * navegador; o PDF.js com destaque da citação entra na F1.7 (revisão).
 */
async function ArticleView({ params, searchParams }: Props) {
  const { articleId } = await params;
  const { p } = await searchParams;
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

  const [{ data: signed }, { data: pageRow }] = await Promise.all([
    supabase.storage.from("pdfs").createSignedUrl(article.storage_path, 60 * 60),
    supabase
      .from("article_pages")
      .select("pdf_page, printed_page, text")
      .eq("article_id", articleId)
      .eq("pdf_page", page)
      .maybeSingle(),
  ]);

  const base = `/viewer/${articleId}`;
  const status = articleStatus(article.status);
  const navLink = "btn min-h-9 px-3 text-[13px]";
  const navOff = `${navLink} pointer-events-none opacity-50`;

  return (
    <main className="flex min-h-dvh flex-1 flex-col gap-3 bg-page p-4">
      <header className="flex flex-wrap items-center gap-2">
        <Link
          href={`/projects/${article.project_id}/articles/${article.id}`}
          className="icon-btn -ml-2"
          aria-label="Voltar à ficha"
        >
          <BackIcon />
        </Link>
        <h1 className="m-0 min-w-0 flex-1 font-serif text-xl leading-tight font-normal">
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
        <pre className="min-h-[75vh] overflow-auto rounded-lg border border-line bg-surface p-4 font-mono text-xs whitespace-pre-wrap">
          {pageRow?.text ?? (pageCount ? "Página sem texto." : "Texto ainda não extraído.")}
        </pre>
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
