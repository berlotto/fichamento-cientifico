import Link from "next/link";
import { Suspense } from "react";
import { BackIcon } from "@/components/icons";
import { DetailSkeleton } from "@/components/skeletons";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TagManager } from "./tag-manager";

type Props = PageProps<"/projects/[id]/temas">;

/** Temas do projeto (spec 003): tags com contagem, edição, junção e exclusão. */
async function Temas({ params }: Pick<Props, "params">) {
  const { id } = await params;
  await requireUser();
  const supabase = await createClient();

  const [{ data: tags }, { data: taggings }] = await Promise.all([
    supabase.from("tags").select("id, name, parent_id, color, description").eq("project_id", id),
    supabase.from("taggings").select("tag_id, article_id, tags!inner(project_id)").eq("tags.project_id", id),
  ]);

  const counts = new Map<string, { marks: number; articles: Set<string> }>();
  for (const t of taggings ?? []) {
    const c = counts.get(t.tag_id) ?? { marks: 0, articles: new Set<string>() };
    c.marks++;
    c.articles.add(t.article_id);
    counts.set(t.tag_id, c);
  }

  return (
    <div data-pane="detail" className="mx-auto flex w-full max-w-[780px] flex-col gap-6 px-8 pt-5 pb-14 max-[860px]:px-5">
      <header className="flex flex-col gap-2">
        <div className="flex min-h-11 items-center">
          <Link href={`/projects/${id}`} className="icon-btn fx-back -ml-3" aria-label="Voltar aos artigos">
            <BackIcon />
          </Link>
        </div>
        <span className="eyebrow">Temas</span>
        <p className="m-0 text-sm text-muted">
          Marque artigos, campos da ficha e suas citações com tags. Abra um tema para ver, num lugar só, tudo o que os
          artigos dizem sobre ele, com a chamada pronta para citar.
        </p>
      </header>
      <TagManager
        projectId={id}
        tags={(tags ?? []).map((t) => ({
          ...t,
          marks: counts.get(t.id)?.marks ?? 0,
          articles: counts.get(t.id)?.articles.size ?? 0,
        }))}
      />
    </div>
  );
}

export default function TemasPage(props: Props) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Temas params={props.params} />
    </Suspense>
  );
}
