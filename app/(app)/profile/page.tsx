import Link from "next/link";
import { Suspense } from "react";
import { BackIcon } from "@/components/icons";
import { FontSettings, FontSync } from "@/components/font-controls";
import { ThemeSegmented } from "@/components/theme-controls";
import { requireProfile } from "@/lib/auth";
import { initialsOf } from "@/lib/citation";
import { signOut } from "../../(auth)/login/actions";
import { BackupButton } from "./backup-button";
import { ProfileForm } from "./profile-form";

async function ProfileHeader() {
  const p = await requireProfile();
  return (
    <>
      <div className="flex items-center gap-4">
        <div className="flex size-16 flex-none items-center justify-center rounded-full bg-tint text-xl font-semibold text-accent">
          {initialsOf(p.fullName, p.email)}
        </div>
        <div className="min-w-0">
          <h1 className="m-0 font-serif text-[30px] leading-tight font-normal tracking-[-0.01em]">
            {p.fullName ?? "Sem nome"}
          </h1>
          <div className="text-sm text-muted">{p.email}</div>
        </div>
      </div>
      <ProfileForm name={p.fullName ?? ""} institution={p.institution ?? ""} />
      <FontSync ui={p.fontUi} article={p.fontArticle} />
    </>
  );
}

export default function ProfilePage() {
  return (
    <main className="min-h-dvh bg-page">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-8 px-6 pt-5 pb-14">
        <Link href="/projects" className="-ml-3 flex min-h-11 w-fit items-center gap-1 text-sm text-muted">
          <span className="icon-btn">
            <BackIcon />
          </span>
          Projetos
        </Link>

        <Suspense fallback={<p className="m-0 text-sm text-muted">Carregando…</p>}>
          <ProfileHeader />
        </Suspense>

        <section className="flex flex-col gap-3 border-t border-line pt-6">
          <h2 className="eyebrow">Aparência</h2>
          <ThemeSegmented />
          <FontSettings />
        </section>

        <section className="flex flex-col gap-3 border-t border-line pt-6">
          <h2 className="eyebrow">Backup dos dados</h2>
          <p className="m-0 text-sm">Gera um arquivo com seus projetos, artigos, fichas, citações e notas.</p>
          <BackupButton />
        </section>

        <div className="border-t border-line pt-6">
          <form action={signOut}>
            <button className="btn" type="submit">
              Sair da conta
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
