import { Suspense } from "react";
import { DetailSkeleton } from "@/components/skeletons";
import { ProjectOverview } from "./project-overview";

/** Projeto aberto, nenhum artigo escolhido: visão geral do projeto (no celular, a lista ocupa a tela). */
export default function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton pane={false} />}>
      <Overview params={params} />
    </Suspense>
  );
}

async function Overview({ params }: { params: PageProps<"/projects/[id]">["params"] }) {
  const { id } = await params;
  return <ProjectOverview projectId={id} />;
}
