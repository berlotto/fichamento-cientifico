import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CopyButton } from "@/components/copy-button";
import { BackIcon, FileIcon } from "@/components/icons";
import { articleStatus, TONE_CLASS } from "@/lib/article-status";
import { requireUser } from "@/lib/auth";
import { abntReference, authorLine } from "@/lib/citation";
import { createClient } from "@/lib/supabase/server";
import { NotesField } from "./notes-field";

type Props = PageProps<"/projects/[id]/articles/[articleId]">;

async function Ficha({ params }: Pick<Props, "params">) {
  const { id, articleId } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: a } = await supabase
    .from("articles")
    .select("id, title, original_filename, authors, year, venue, status, page_count, error, notes")
    .eq("id", articleId)
    .eq("project_id", id)
    .maybeSingle();
  if (!a) notFound();

  const status = articleStatus(a.status);
  const meta = [authorLine(a), a.venue, a.year].filter(Boolean).join(" · ");
  const abnt = abntReference(a);

  return (
    <div data-pane="detail" className="mx-auto flex w-full max-w-[760px] flex-col gap-8 px-8 pt-5 pb-14 max-[860px]:px-5">
      <header className="flex flex-col gap-4">
        <div className="flex min-h-11 items-center justify-between">
          <Link href={`/projects/${id}`} className="icon-btn fx-back -ml-3" aria-label="Voltar aos artigos">
            <BackIcon />
          </Link>
          <span className={`ml-auto text-xs font-medium ${TONE_CLASS[status.tone]}`}>{status.label}</span>
        </div>
        <h1 className="m-0 font-serif text-[32px] leading-[1.18] font-normal tracking-[-0.01em] text-pretty">
          {a.title ?? a.original_filename ?? "Sem título"}
        </h1>
        <div className="text-sm text-muted">
          {meta || "Autores, periódico e ano aparecem quando os metadados forem identificados."}
        </div>
        {a.error && <p className="m-0 text-sm text-warn">{a.error}</p>}
      </header>

      <section className="flex flex-col gap-3 rounded-lg bg-page p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="eyebrow">Referência ABNT</h2>
          {abnt && <CopyButton text={abnt} />}
        </div>
        <p className={`m-0 text-sm leading-[1.55] ${abnt ? "" : "text-muted"}`}>
          {abnt ?? "A referência é montada quando autor, título e ano estiverem identificados."}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">Ficha</h2>
        <p className="m-0 font-serif text-lg leading-normal text-muted">
          Objetivo, método, resultados e conclusões aparecem aqui depois da extração, cada um com a
          citação e a página.
        </p>
        {a.page_count ? (
          <Link href={`/viewer/${a.id}`} className="btn w-fit">
            <FileIcon />
            Abrir PDF e texto extraído ({a.page_count} páginas)
          </Link>
        ) : null}
      </section>

      <NotesField articleId={a.id} initial={a.notes ?? ""} />
    </div>
  );
}

export default function ArticlePage(props: Props) {
  return (
    <Suspense fallback={<p data-pane="detail" className="m-0 p-8 text-sm text-muted">Carregando…</p>}>
      <Ficha params={props.params} />
    </Suspense>
  );
}
