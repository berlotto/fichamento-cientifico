import { Suspense } from "react";
import { ProjectOverview } from "../project-overview";

/** Visão do projeto como painel de detalhe (no celular, aberta pelo link na lista). */
export default function ProjectAboutPage({ params }: PageProps<"/projects/[id]/about">) {
  return (
    <Suspense fallback={<p data-pane="detail" className="m-0 p-8 text-sm text-muted">Carregando…</p>}>
      <Overview params={params} />
    </Suspense>
  );
}

async function Overview({ params }: { params: PageProps<"/projects/[id]/about">["params"] }) {
  const { id } = await params;
  return <ProjectOverview projectId={id} pane />;
}
