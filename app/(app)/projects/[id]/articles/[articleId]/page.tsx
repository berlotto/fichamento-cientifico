import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { STATUS_LABEL } from "@/lib/article-status";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Props = PageProps<"/projects/[id]/articles/[articleId]">;

/**
 * F0.9: PDF ao lado do texto extraído da página. O PDF usa o visualizador do
 * navegador; o PDF.js com destaque da citação entra na F1.7 (revisão).
 */
async function ArticleView({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const { id, articleId } = await params;
  const { p } = await searchParams;
  await requireUser();
  const supabase = await createClient();

  const { data: article } = await supabase
    .from("articles")
    .select("id, project_id, title, original_filename, storage_path, status, page_count, error")
    .eq("id", articleId)
    .eq("project_id", id)
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

  const base = `/projects/${id}/articles/${articleId}`;

  return (
    <div className="flex flex-1 flex-col gap-3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Link href={`/projects/${id}`} className="text-sm text-zinc-500 underline">
            ← Projeto
          </Link>
          <h1 className="text-lg font-semibold">{article.title ?? article.original_filename}</h1>
        </div>
        <span className="text-sm text-zinc-500">
          {STATUS_LABEL[article.status] ?? article.status}
          {article.error ? `: ${article.error}` : ""}
        </span>
      </div>

      {pageCount > 0 && (
        <nav className="flex items-center gap-3 text-sm">
          {page > 1 ? <Link href={`${base}?p=${page - 1}`} className="underline">← anterior</Link> : <span className="text-zinc-400">← anterior</span>}
          <span>
            PDF {page}/{pageCount}
            {" · "}
            página impressa: {pageRow?.printed_page ?? "não identificada"}
          </span>
          {page < pageCount ? <Link href={`${base}?p=${page + 1}`} className="underline">próxima →</Link> : <span className="text-zinc-400">próxima →</span>}
        </nav>
      )}

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        {signed?.signedUrl ? (
          <iframe
            key={page}
            src={`${signed.signedUrl}#page=${page}`}
            title="PDF"
            className="min-h-[75vh] w-full rounded border border-zinc-200 dark:border-zinc-800"
          />
        ) : (
          <p className="text-red-600">Não foi possível abrir o PDF.</p>
        )}
        <pre className="min-h-[75vh] overflow-auto whitespace-pre-wrap rounded border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-950">
          {pageRow?.text ?? (pageCount ? "Página sem texto." : "Texto ainda não extraído.")}
        </pre>
      </div>
    </div>
  );
}

export default function ArticlePage(props: Props) {
  return (
    <Suspense fallback={<p className="p-6 text-zinc-500">Carregando…</p>}>
      <ArticleView params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
