/** Esqueletos de carregamento: a forma da tela aparece antes dos dados. */

const bar = "rounded-md bg-line motion-safe:animate-pulse";

function Bar({ className }: { className: string }) {
  return <div aria-hidden className={`${bar} ${className}`} />;
}

/** Lista de projetos na lateral. */
export function NavSkeleton() {
  return (
    <div role="status" aria-label="Carregando projetos" className="flex flex-col gap-2 px-3 py-1">
      {["w-3/4", "w-1/2", "w-4/5"].map((w) => (
        <Bar key={w} className={`h-4 ${w}`} />
      ))}
    </div>
  );
}

/** Lista de artigos do projeto. */
export function ListSkeleton() {
  return (
    <div role="status" aria-label="Carregando artigos" className="flex flex-col">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4">
        <Bar className="h-6 w-1/2" />
        <Bar className="h-[42px] w-full" />
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex flex-col gap-2 border-b border-line px-5 py-4">
          <Bar className="h-4 w-11/12" />
          <Bar className="h-4 w-3/5" />
          <Bar className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

/** Painel de detalhe (ficha do artigo, visão do projeto, auditoria). */
export function DetailSkeleton({ pane = true }: { pane?: boolean }) {
  return (
    <div
      role="status"
      aria-label="Carregando"
      data-pane={pane ? "detail" : undefined}
      className="mx-auto flex w-full max-w-[780px] flex-col gap-6 px-8 pt-8 pb-14 max-[860px]:px-5"
    >
      <Bar className="h-4 w-1/4" />
      <div className="flex flex-col gap-3">
        <Bar className="h-9 w-11/12" />
        <Bar className="h-9 w-2/3" />
      </div>
      <Bar className="h-4 w-1/2" />
      <div className="flex flex-col gap-2 pt-4">
        <Bar className="h-4 w-full" />
        <Bar className="h-4 w-full" />
        <Bar className="h-4 w-5/6" />
        <Bar className="h-4 w-3/4" />
      </div>
      <div className="flex flex-col gap-2 pt-4">
        <Bar className="h-4 w-full" />
        <Bar className="h-4 w-4/5" />
      </div>
    </div>
  );
}
