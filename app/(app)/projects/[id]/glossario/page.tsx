import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackIcon, DownloadIcon } from "@/components/icons";
import { DetailSkeleton } from "@/components/skeletons";
import { requireUser } from "@/lib/auth";
import { loadGlossary } from "@/lib/export/glossary";
import { createClient } from "@/lib/supabase/server";
import { GlossaryView } from "./glossary-view";

type Props = PageProps<"/projects/[id]/glossario">;

/** Glossário do projeto (spec 006): conceitos e como cada artigo os define. */
async function Glossario({ params }: Pick<Props, "params">) {
  const { id } = await params;
  await requireUser();
  const supabase = await createClient();
  const glossary = await loadGlossary(supabase, id);
  if (!glossary) notFound();
  const total = glossary.concepts.reduce((n, c) => n + c.definitions.filter((d) => d.status !== "rejected").length, 0);

  return (
    <div data-pane="detail" className="mx-auto flex w-full max-w-[780px] flex-col gap-6 px-8 pt-5 pb-14 max-[860px]:px-5">
      <header className="flex flex-col gap-2">
        <div className="flex min-h-11 items-center">
          <Link href={`/projects/${id}/about`} className="icon-btn fx-back -ml-3" aria-label="Voltar ao projeto">
            <BackIcon />
          </Link>
        </div>
        <span className="eyebrow">Glossário</span>
        <p className="m-0 text-sm text-muted">
          Cadastre os conceitos da sua pesquisa. O Fichamento procura, em cada artigo, onde os autores definem esses
          conceitos ou dizem como os mediram, com o trecho e a página. Só os conceitos da lista são procurados.
        </p>
        {total > 0 && (
          <div className="flex flex-wrap gap-2">
            <a href={`/api/export/${id}/glossario?format=xlsx`} className="btn min-h-9 px-3 text-[13px]" download>
              <DownloadIcon size={16} /> Excel
            </a>
            <a href={`/api/export/${id}/glossario?format=md`} className="btn min-h-9 px-3 text-[13px]" download>
              <DownloadIcon size={16} /> Markdown
            </a>
          </div>
        )}
      </header>
      <GlossaryView projectId={id} concepts={glossary.concepts} />
    </div>
  );
}

export default function GlossarioPage(props: Props) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Glossario params={props.params} />
    </Suspense>
  );
}
