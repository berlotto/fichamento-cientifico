import { Suspense } from "react";
import { FontSync } from "@/components/font-controls";
import { SettingsButton } from "@/components/settings-dialog";
import { ThemeToggle } from "@/components/theme-controls";
import { requireProfile } from "@/lib/auth";
import { validLanguage } from "@/lib/languages";
import { createClient } from "@/lib/supabase/server";
import { NewProjectButton } from "./new-project-button";
import { ProjectNav } from "./project-nav";

async function SidebarProjects() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, articles(count)")
    .order("created_at", { ascending: true });

  return (
    <ProjectNav
      projects={(projects ?? []).map((p) => ({ id: p.id, name: p.name, count: p.articles[0]?.count ?? 0 }))}
    />
  );
}

async function ProfileLink() {
  const profile = await requireProfile();
  return (
    <>
      <SettingsButton
        profile={{
          email: profile.email,
          fullName: profile.fullName,
          institution: profile.institution,
          defaultLanguage: validLanguage(profile.defaultLanguage),
        }}
      />
      <FontSync ui={profile.fontUi} article={profile.fontArticle} />
    </>
  );
}

export default function ProjectsLayout({ children }: LayoutProps<"/projects">) {
  return (
    <div className="fx-shell">
      <nav className="fx-pane fx-side relative flex flex-col border-r border-line bg-page px-3 pt-5 pb-3" aria-label="Projetos">
        <div className="px-3 pb-5 font-serif text-2xl tracking-[-0.01em]">Fichamento</div>
        <div className="flex items-center justify-between pr-1 pb-2 pl-3">
          <h2 className="eyebrow">Projetos</h2>
          <NewProjectButton />
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          <Suspense fallback={<p className="px-3 text-sm text-muted">Carregando…</p>}>
            <SidebarProjects />
          </Suspense>
        </div>
        <div className="mt-3 flex items-center gap-1 border-t border-line pt-2">
          <Suspense fallback={<div className="min-h-11 flex-1" />}>
            <ProfileLink />
          </Suspense>
          <ThemeToggle />
        </div>
      </nav>
      {children}
    </div>
  );
}
