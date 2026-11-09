import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackIcon, DownloadIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-controls";
import { requireUser } from "@/lib/auth";
import { fullTitle, shortCite } from "@/lib/citation";
import { loadProjectTable, pageLabel } from "@/lib/export/project-table";
import { createClient } from "@/lib/supabase/server";

type Props = PageProps<"/matrix/[projectId]">;

/**
 * Matriz do projeto: um artigo por linha, um campo por coluna, cada célula com
 * o valor e a página do trecho. Por padrão só campos revisados; "a revisar"
 * aparece só quando pedido, com selo.
 */
async function Matrix({ params, searchParams }: Props) {
  const { projectId } = await params;
  const { todos } = await searchParams;
  const showPending = todos === "1";
  await requireUser();
  const supabase = await createClient();
  const table = await loadProjectTable(supabase, projectId);
  if (!table) notFound();

  const toggle = (on: boolean, label: string) => (
    <Link
      href={on ? `/matrix/${projectId}?todos=1` : `/matrix/${projectId}`}
      aria-pressed={showPending === on}
      className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${showPending === on ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,.12)]" : "text-muted"}`}
    >
      {label}
    </Link>
  );

  return (
    <main className="flex min-h-dvh flex-col gap-4 bg-page p-4">
      <header className="flex flex-wrap items-center gap-3">
        <Link href={`/projects/${projectId}`} className="icon-btn -ml-2" aria-label="Voltar ao projeto">
          <BackIcon />
        </Link>
        <h1 className="m-0 min-w-0 flex-1 font-serif text-2xl leading-tight font-normal">
          Matriz · {table.name}
        </h1>
        <div className="flex gap-1 rounded-lg bg-sunk p-1">
          {toggle(false, "Só revisados")}
          {toggle(true, "Incluir a revisar")}
        </div>
        <a href={`/api/export/${projectId}?format=xlsx`} className="btn min-h-9 px-3 text-[13px]" download>
          <DownloadIcon size={16} /> Excel
        </a>
        <ThemeToggle />
      </header>

      {table.articles.length === 0 ? (
        <p className="m-0 text-sm text-muted">Nenhum artigo neste projeto.</p>
      ) : (
        <div className="overflow-auto rounded-xl border border-line bg-surface">
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-20 min-w-[240px] border-r border-b border-line bg-surface p-3 text-left text-xs font-medium text-muted">
                  Artigo
                </th>
                {table.defs.map((d) => (
                  <th
                    key={d.key}
                    className="sticky top-0 z-10 min-w-[280px] border-b border-line bg-surface p-3 text-left text-xs font-medium text-muted"
                  >
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.articles.map((a) => (
                <tr key={a.id} className="align-top">
                  <th className="sticky left-0 z-10 border-r border-b border-line bg-surface p-3 text-left font-normal">
                    <Link href={`/projects/${projectId}/articles/${a.id}`} className="flex flex-col gap-1 hover:underline">
                      <span className="text-xs font-medium text-muted">{shortCite(a) ?? "sem autor/ano"}</span>
                      <span className="font-article leading-snug">{fullTitle(a) ?? a.original_filename ?? "Sem título"}</span>
                    </Link>
                  </th>
                  {table.defs.map((d) => {
                    const f = a.fields[d.key];
                    const hidden = !f || (f.status !== "accepted" && !showPending);
                    return (
                      <td key={d.key} className="border-b border-line p-3">
                        {hidden ? (
                          <span className="text-xs text-muted">{f ? "a revisar" : "—"}</span>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <p className="font-article m-0 line-clamp-6 leading-snug">{f.value}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              {f.pdf_page ? (
                                <Link
                                  href={`/viewer/${a.id}?p=${f.pdf_page}${f.quote ? `&q=${encodeURIComponent(f.quote.slice(0, 300))}#trecho` : ""}`}
                                  className="text-muted underline-offset-2 hover:underline"
                                >
                                  ({shortCite(a) ?? "s.a."}, {pageLabel(f)})
                                </Link>
                              ) : null}
                              {f.status !== "accepted" && (
                                <span className="rounded bg-page px-1.5 py-px font-medium text-warn">a revisar</span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default function MatrixPage(props: Props) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Carregando…</p>}>
      <Matrix params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
