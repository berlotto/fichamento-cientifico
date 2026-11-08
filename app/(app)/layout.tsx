import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { signOut } from "../(auth)/login/actions";

async function UserMenu() {
  const user = await requireUser();
  return (
    <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
      <span>{user.email}</span>
      <form action={signOut}>
        <button type="submit" className="underline">
          Sair
        </button>
      </form>
    </div>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
        <Link href="/projects" className="font-semibold">
          Fichamento
        </Link>
        <Suspense fallback={null}>
          <UserMenu />
        </Suspense>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
