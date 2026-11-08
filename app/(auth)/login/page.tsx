import { ThemeToggle } from "@/components/theme-controls";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh flex-1 grid-cols-1 bg-page min-[861px]:grid-cols-2">
      <aside className="hidden flex-col justify-center gap-10 bg-sunk p-16 min-[861px]:flex">
        <h1 className="m-0 max-w-[14em] font-serif text-[44px] leading-[1.12] font-normal tracking-[-0.01em] text-balance">
          Cada artigo vira uma ficha, com a citação no lugar certo.
        </h1>
        <div className="flex max-w-[460px] flex-col gap-2.5 rounded-xl border border-line bg-surface p-6">
          <div className="text-xs font-semibold text-muted">Objetivo</div>
          <p className="m-0 font-serif text-lg leading-[1.45]">
            Estimar a associação entre a coluna de ozônio e a incidência de glaucoma em municípios do Sul
            do Brasil.
          </p>
          <div className="text-xs font-medium text-accent">Autor, ano · p. 2 · conferido</div>
        </div>
      </aside>

      <div className="relative flex items-center justify-center px-6 py-8">
        <ThemeToggle className="absolute top-4 right-4" />
        <LoginForm />
      </div>
    </main>
  );
}
