import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackIcon } from "@/components/icons";
import { articleStatus, IN_PROGRESS, statusSignature } from "@/lib/article-status";
import { requireUser } from "@/lib/auth";
import { displayTitle, shortCite } from "@/lib/citation";
import { isReadingStatus, isRelevance } from "@/lib/reading";
import { createClient } from "@/lib/supabase/server";
import { ArticleList } from "./article-list";
import { AutoRefresh } from "./auto-refresh";
import { ListSkeleton } from "@/components/skeletons";
import { Uploader } from "./uploader";

async function ArticlesPane({ params }: { params: LayoutProps<"/projects/[id]">["params"] }) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: project }, { data: articles }, { data: tags }, { data: taggings }] = await Promise.all([
    supabase.from("projects").select("id, name").eq("id", id).maybeSingle(),
    supabase
      .from("articles")
      .select("id, title, subtitle, original_filename, authors, year, status, page_count, reading_status, relevance, starred")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("tags").select("id, name, parent_id, color").eq("project_id", id).order("name"),
    // Só os pares artigo-tag, para o filtro por tema (spec 003).
    supabase.from("taggings").select("article_id, tag_id, tags!inner(project_id)").eq("tags.project_id", id),
  ]);
  if (!project) notFound();

  const tagsByArticle = new Map<string, Set<string>>();
  for (const t of taggings ?? []) {
    const set = tagsByArticle.get(t.article_id) ?? new Set<string>();
    set.add(t.tag_id);
    tagsByArticle.set(t.article_id, set);
  }

  const items = (articles ?? []).map((a) => {
    const status = articleStatus(a.status);
    return {
      id: a.id,
      title: displayTitle(a) ?? a.original_filename ?? "Sem título",
      cite: shortCite(a) ?? (a.page_count ? `${a.page_count} páginas` : "Sem metadados"),
      statusLabel: status.label,
      tone: status.tone,
      reading: {
        reading_status: isReadingStatus(a.reading_status) ? a.reading_status : "to_read",
        relevance: isRelevance(a.relevance) ? a.relevance : null,
        starred: a.starred,
      },
      tagIds: [...(tagsByArticle.get(a.id) ?? [])],
    };
  });

  return (
    <>
      <ArticleList
        projectId={project.id}
        projectName={project.name}
        articles={items}
        tags={tags ?? []}
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
