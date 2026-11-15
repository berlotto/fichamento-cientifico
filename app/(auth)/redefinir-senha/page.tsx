import Link from "next/link";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme-controls";
import { isRecentRecovery } from "@/lib/recovery";
import { createClient } from "@/lib/supabase/server";
import { ResetForm } from "./reset-form";

/** Lê a sessão (cookies): precisa ficar dentro de <Suspense> (cacheComponents). */
async function Content() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!isRecentRecovery(data?.claims)) {
    return (
      <p className="m-0 text-sm text-muted">
        Este link expirou ou já foi usado. Volte ao{" "}
        <Link href="/login" className="text-ink underline underline-offset-2">
          login
        </Link>{" "}
        e peça outro em “Esqueci minha senha”.
      </p>
    );
  }
  return <ResetForm />;
}

export default function ResetPasswordPage() {
  return (
    <main className="relative flex min-h-dvh flex-1 items-center justify-center bg-page px-6 py-8">
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="flex w-full max-w-[380px] flex-col gap-6">
        <div className="font-serif text-[28px] tracking-[-0.01em]">Fichamento</div>
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-lg font-medium">Criar senha nova</h1>
          <p className="m-0 text-sm text-muted">Use pelo menos 8 caracteres.</p>
        </div>
        <Suspense fallback={<p className="m-0 text-sm text-muted">Carregando…</p>}>
          <Content />
        </Suspense>
      </div>
    </main>
  );
}
