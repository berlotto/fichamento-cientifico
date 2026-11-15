import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CopyButton } from "@/components/copy-button";
import { BackIcon, DownloadIcon } from "@/components/icons";
import { DetailSkeleton } from "@/components/skeletons";
import { requireUser } from "@/lib/auth";
import { shortCite } from "@/lib/citation";
import { citePage, countItems, itemCite, tagMarkdown } from "@/lib/export/tag-export";
import { loadTagContent } from "@/lib/export/tag-view";
import { createClient } from "@/lib/supabase/server";

type Props = PageProps<"/projects/[id]/temas/[tagId]">;

const viewer = (articleId: string, page: number | null, extra = "") =>
  page ? `/viewer/${articleId}?p=${page}${extra}#trecho` : `/viewer/${articleId}`;

/** Um tema: todos os trechos marcados, agrupados por artigo, com a chamada pronta. */
async function Tema({ params }: Pick<Props, "params">) {
  const { id, tagId } = await params;
  await requireUser();
  const supabase = await createClient();
  const content = await loadTagContent(supabase, id, tagId);
  if (!content) notFound();
  const total = countItems(content);

  return (
    <div data-pane="detail" className="mx-auto flex w-full max-w-[780px] flex-col gap-7 px-8 pt-5 pb-14 max-[860px]:px-5">
      <header className="flex flex-col gap-3">
        <div className="flex min-h-11 items-center">
          <Link href={`/projects/${id}/temas`} className="icon-btn fx-back -ml-3" aria-label="Voltar aos temas">
            <BackIcon />
          </Link>
        </div>
        <span className="eyebrow">Tema</span>
        <h1 className="m-0 font-article text-[30px] leading-tight font-normal">{content.tag.name}</h1>
        {content.tag.description && <p className="m-0 text-[15px] text-muted">{content.tag.description}</p>}
        <p className="m-0 text-sm text-muted">
          {total} {total === 1 ? "trecho" : "trechos"} de {content.articles.length}{" "}
          {content.articles.length === 1 ? "artigo" : "artigos"}
        </p>
        {total > 0 && (
          <div className="flex flex-wrap gap-2">
            <a href={`/api/export/${id}/tema/${tagId}?format=xlsx`} className="btn min-h-9 px-3 text-[13px]" download>
              <DownloadIcon size={16} /> Excel
            </a>
            <a href={`/api/export/${id}/tema/${tagId}?format=md`} className="btn min-h-9 px-3 text-[13px]" download>
              <DownloadIcon size={16} /> Markdown
            </a>
            <CopyButton text={tagMarkdown(content)} />
          </div>
        )}
      </header>

      {content.articles.length === 0 && (
        <p className="m-0 text-sm text-muted">
          Nada marcado com este tema ainda. Use “+ tag” na ficha de um artigo, num campo ou numa citação.
        </p>
      )}

      {content.articles.map((a) => (
        <section key={a.id} className="flex flex-col gap-3">
          <h2 className="m-0 flex flex-col gap-0.5">
            <Link href={`/projects/${id}/articles/${a.id}`} className="font-article text-lg leading-snug font-normal hover:underline">
              {a.displayTitle}
            </Link>
            <span className="text-xs font-medium text-muted">{shortCite(a) ?? "sem autor/ano"}</span>
          </h2>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {a.items.map((it, i) => {
              const via = it.taggedTag !== content.tag.name && (
                <span className="text-[11px] text-muted"> · {it.taggedTag}</span>
              );
              if (it.kind === "article") {
                return (
                  <li key={i} className="text-sm text-muted">
                    Artigo inteiro marcado{via}
                  </li>
                );
              }
              if (it.kind === "field") {
                const page = citePage(it.printedPage, it.pdfPage);
                return (
                  <li key={i} className="flex flex-col gap-1.5 rounded-xl border border-line p-4">
                    <span className="eyebrow">
                      {it.label}
                      {via}
                    </span>
                    <p className="m-0 font-article text-[16px] leading-normal">{it.value ?? "Campo rejeitado ou fora da ficha."}</p>
                    {it.quote && (
                      <blockquote className="m-0 border-l-2 border-line pl-3 font-article text-[15px] text-muted italic">
                        “{it.quote}”{" "}
                        <Link href={viewer(a.id, it.pdfPage, `&q=${encodeURIComponent(it.quote.slice(0, 300))}`)} className="text-ink not-italic hover:underline">
                          {itemCite(a, page)}
                        </Link>
                      </blockquote>
                    )}
                  </li>
                );
              }
              const page = citePage(it.printedPage, it.pdfPage);
              return (
                <li key={i} className="flex flex-col gap-1.5 border-l-2 border-accent pl-4">
                  <span className="text-xs font-medium text-accent">
                    Minha citação{via}
                  </span>
                  <blockquote className="m-0 font-article text-[16px] leading-normal">
                    “{it.text}”{" "}
                    <Link href={viewer(a.id, it.pdfPage, `&c=${it.quoteId}`)} className="text-accent hover:underline">
                      {itemCite(a, page)}
                    </Link>
                  </blockquote>
                  {it.comment && <p className="m-0 text-sm text-muted">{it.comment}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function TemaPage(props: Props) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Tema params={props.params} />
    </Suspense>
  );
}
