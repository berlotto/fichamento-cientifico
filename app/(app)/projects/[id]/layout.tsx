import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackIcon } from "@/components/icons";
import { articleStatus, IN_PROGRESS, statusSignature } from "@/lib/article-status";
import { requireUser } from "@/lib/auth";
import { displayTitle, shortCite } from "@/lib/citation";
import { createClient } from "@/lib/supabase/server";
import { ArticleList } from "./article-list";
import { AutoRefresh } from "./auto-refresh";
import { ListSkeleton } from "@/components/skeletons";
import { Uploader } from "./uploader";

async function ArticlesPane({ params }: { params: LayoutProps<"/projects/[id]">["params"] }) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: project }, { data: articles }] = await Promise.all([
    supabase.from("projects").select("id, name").eq("id", id).maybeSingle(),
    supabase
      .from("articles")
      .select("id, title, subtitle, original_filename, authors, year, status, page_count")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!project) notFound();

  const items = (articles ?? []).map((a) => {
    const status = articleStatus(a.status);
    return {
      id: a.id,
      title: displayTitle(a) ?? a.original_filename ?? "Sem título",
      cite: shortCite(a) ?? (a.page_count ? `${a.page_count} páginas` : "Sem metadados"),
      statusLabel: status.label,
      tone: status.tone,
    };
  });

  return (
    <>
      <ArticleList
        projectId={project.id}
        projectName={project.name}
        articles={items}
        uploader={<Uploader projectId={project.id} userId={user.id} />}
        backLink={
          <Link href="/projects" className="icon-btn fx-back -ml-3" aria-label="Voltar aos projetos">
            <BackIcon />
          </Link>
        }
      />
      <AutoRefresh
        projectId={project.id}
        signature={statusSignature(articles ?? [])}
        active={(articles ?? []).some((a) => IN_PROGRESS.has(a.status))}
      />
    </>
  );
}

export default function ProjectLayout({ children, params }: LayoutProps<"/projects/[id]">) {
  return (
    <>
      <section
        className="fx-pane fx-list flex flex-col border-r border-line bg-surface"
        aria-label="Artigos do projeto"
        data-pane="articles"
      >
        <Suspense fallback={<ListSkeleton />}>
          <ArticlesPane params={params} />
        </Suspense>
      </section>
      <article className="fx-pane fx-detail bg-surface" aria-label="Ficha do artigo">
        {children}
      </article>
    </>
  );
}
