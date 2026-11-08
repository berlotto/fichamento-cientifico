import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IN_PROGRESS, STATUS_CLASS, STATUS_LABEL } from "@/lib/article-status";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AutoRefresh } from "./auto-refresh";
import { Uploader } from "./uploader";

async function ProjectView({ params }: { params: PageProps<"/projects/[id]">["params"] }) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", id).maybeSingle();
  if (!project) notFound();

  const { data: articles } = await supabase
    .from("articles")
    .select("id, title, original_filename, status, page_count, error, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const pending = (articles ?? []).some((a) => IN_PROGRESS.has(a.status));

  return (
    <>
      <div className="flex flex-col gap-1">
        <Link href="/projects" className="text-sm text-zinc-500 underline">
          ← Projetos
        </Link>
        <h1 className="text-2xl font-semibold">{project.name}</h1>
      </div>

      <Uploader projectId={project.id} userId={user.id} />
      <AutoRefresh active={pending} />

      {!articles?.length ? (
        <p className="text-zinc-500">Nenhum artigo. Envie PDFs para começar.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <tr>
              <th className="py-2 font-medium">Artigo</th>
              <th className="py-2 font-medium">Páginas</th>
              <th className="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {articles.map((a) => (
              <tr key={a.id}>
                <td className="py-2 pr-4">
                  <Link href={`/projects/${id}/articles/${a.id}`} className="underline">
                    {a.title ?? a.original_filename ?? a.id}
                  </Link>
                  {a.error && <p className="text-xs text-red-600">{a.error}</p>}
                </td>
                <td className="py-2 pr-4">{a.page_count ?? "–"}</td>
                <td className="py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${STATUS_CLASS[a.status] ?? STATUS_CLASS.uploaded}`}
                  >
                    {STATUS_LABEL[a.status] ?? a.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export default function ProjectPage(props: PageProps<"/projects/[id]">) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <Suspense fallback={<p className="text-zinc-500">Carregando…</p>}>
        <ProjectView params={props.params} />
      </Suspense>
    </div>
  );
}
