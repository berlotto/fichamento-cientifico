import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NewProjectForm } from "./new-project-form";

async function ProjectList() {
  await requireUser();
  const supabase = await createClient();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, created_at, articles(count)")
    .order("created_at", { ascending: false });

  if (error) return <p className="text-red-600">Erro ao carregar projetos.</p>;
  if (!projects?.length) return <p className="text-zinc-500">Nenhum projeto ainda.</p>;

  return (
    <ul className="divide-y divide-zinc-200 rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {projects.map((p) => (
        <li key={p.id}>
          <Link
            href={`/projects/${p.id}`}
            className="flex justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <span>{p.name}</span>
            <span className="text-sm text-zinc-500">{p.articles[0]?.count ?? 0} artigos</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function ProjectsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Projetos</h1>
      <NewProjectForm />
      <Suspense fallback={<p className="text-zinc-500">Carregando…</p>}>
        <ProjectList />
      </Suspense>
    </div>
  );
}
