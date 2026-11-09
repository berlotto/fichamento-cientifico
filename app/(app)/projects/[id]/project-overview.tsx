import Link from "next/link";
import { notFound } from "next/navigation";
import { BackIcon, DownloadIcon } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { fieldDefs } from "@/lib/fields";
import { createClient } from "@/lib/supabase/server";
import { CustomFields, DeleteProject, ReextractAll, RenameProject } from "./project-settings";

const usd = (n: number) =>
  n < 0.01 ? `US$ ${n.toFixed(4)}` : n.toLocaleString("pt-BR", { style: "currency", currency: "USD" });
const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : "—");

/**
 * Visão do projeto: números, custo, qualidade da extração (a partir das
 * revisões), campos personalizados, matriz, exportação e exclusão.
 */
export async function ProjectOverview({ projectId, pane }: { projectId: string; pane?: boolean }) {
  await requireUser();
  const supabase = await createClient();

  const [{ data: project }, { data: articles }, { data: custom }, { data: fieldRows }, { data: runs }] =
    await Promise.all([
      supabase.from("projects").select("id, name").eq("id", projectId).maybeSingle(),
      supabase.from("articles").select("id, status").eq("project_id", projectId),
      supabase.from("project_fields").select("key, label, instructions").eq("project_id", projectId).order("position"),
      supabase
        .from("article_fields")
        .select("key, status, edited, verified, articles!inner(project_id)")
        .eq("articles.project_id", projectId),
      supabase
        .from("llm_runs")
        .select("article_id, cost_usd, articles!inner(project_id)")
        .eq("articles.project_id", projectId),
    ]);
  if (!project) notFound();

  const total = articles?.length ?? 0;
  const reviewed = (articles ?? []).filter((a) => a.status === "verified").length;
  const extracted = (articles ?? []).filter((a) =>
    ["extracted", "needs_review", "verified", "failed"].includes(a.status),
  ).length;
  const cost = (runs ?? []).reduce((s, r) => s + Number(r.cost_usd ?? 0), 0);
  const costedArticles = new Set((runs ?? []).map((r) => r.article_id)).size;

  // Qualidade por campo, medida pelas suas revisões (o "gold set" sai da própria revisão).
  const defs = fieldDefs(custom ?? []);
  const quality = defs
    .map((d) => {
      const rows = (fieldRows ?? []).filter((f) => f.key === d.key);
      const done = rows.filter((f) => f.status !== "pending");
      return {
        label: d.label,
        total: rows.length,
        reviewed: done.length,
        asIs: done.filter((f) => f.status === "accepted" && !f.edited).length,
        edited: done.filter((f) => f.edited).length,
        rejected: done.filter((f) => f.status === "rejected").length,
        verified: rows.filter((f) => f.verified).length,
      };
    })
    .filter((q) => q.total > 0);

  const exportLink = (format: string, label: string) => (
    <a href={`/api/export/${projectId}?format=${format}`} className="btn min-h-9 px-3 text-[13px]" download>
      <DownloadIcon size={16} />
      {label}
    </a>
  );

  return (
    <div
      data-pane={pane ? "detail" : undefined}
      className="mx-auto flex w-full max-w-[780px] flex-col gap-9 px-8 pt-5 pb-14 max-[860px]:px-5"
    >
      <header className="flex flex-col gap-4">
        {pane && (
          <div className="flex min-h-11 items-center">
            <Link href={`/projects/${projectId}`} className="icon-btn fx-back -ml-3" aria-label="Voltar aos artigos">
              <BackIcon />
            </Link>
          </div>
        )}
        <span className="eyebrow">Projeto</span>
        <RenameProject projectId={projectId} name={project.name} />
        <dl className="m-0 grid grid-cols-2 gap-3 min-[600px]:grid-cols-4">
          {[
            ["Artigos", String(total)],
            ["Extraídos", String(extracted)],
            ["Revisados", String(reviewed)],
            ["Custo do LLM", cost ? usd(cost) : "—"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-page p-4">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="m-0 mt-1 font-serif text-2xl">{v}</dd>
            </div>
          ))}
        </dl>
        {costedArticles > 0 && (
          <p className="m-0 text-xs text-muted">Média de {usd(cost / costedArticles)} por artigo extraído.</p>
        )}
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">Matriz e exportação</h2>
        <div className="flex flex-wrap gap-2">
          <Link href={`/matrix/${projectId}`} className="btn btn-primary min-h-9 px-3 text-[13px]">
            Abrir matriz
          </Link>
          {exportLink("xlsx", "Excel")}
          {exportLink("csv", "CSV")}
          {exportLink("bib", "BibTeX")}
          {exportLink("abnt", "Referências ABNT")}
        </div>
        <p className="m-0 text-[13px] text-muted">
          A matriz e as planilhas trazem um artigo por linha e um campo por coluna, com a página de cada trecho.
          Campos rejeitados ficam de fora.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">Campos personalizados</h2>
        <p className="m-0 text-[13px] text-muted">
          Além de resumo, assunto, objetivo, método, resultados e conclusões. Valem para os próximos artigos; para os
          que já estão no projeto, use “Extrair todos de novo”.
        </p>
        <CustomFields projectId={projectId} fields={custom ?? []} />
        <ReextractAll projectId={projectId} count={extracted} />
      </section>

      {quality.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="eyebrow">Qualidade da extração</h2>
          <p className="m-0 text-[13px] text-muted">
            Medida pelas suas revisões: quanto o LLM acertou sem você precisar editar.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  {["Campo", "Revisados", "Aceitos sem editar", "Editados", "Rejeitados", "Trecho conferido"].map((h) => (
                    <th key={h} className="border-b border-line py-2 pr-4 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quality.map((q) => (
                  <tr key={q.label}>
                    <td className="border-b border-line py-2 pr-4">{q.label}</td>
                    <td className="border-b border-line py-2 pr-4">
                      {q.reviewed}/{q.total}
                    </td>
                    <td className="border-b border-line py-2 pr-4">{pct(q.asIs, q.reviewed)}</td>
                    <td className="border-b border-line py-2 pr-4">{pct(q.edited, q.reviewed)}</td>
                    <td className="border-b border-line py-2 pr-4">{pct(q.rejected, q.reviewed)}</td>
                    <td className="border-b border-line py-2 pr-4">{pct(q.verified, q.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3 border-t border-line pt-6">
        <DeleteProject projectId={projectId} />
      </section>
    </div>
  );
}
