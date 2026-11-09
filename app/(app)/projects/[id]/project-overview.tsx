import Link from "next/link";
import { notFound } from "next/navigation";
import { BackIcon, DownloadIcon } from "@/components/icons";
import { ProjectLanguage } from "@/components/language-select";
import { preferredCitationStyle, requireUser } from "@/lib/auth";
import { fieldDefs } from "@/lib/fields";
import { usd } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { CustomFields, DeleteProject, ReextractAll, RenameProject, VerificationSettings } from "./project-settings";

const REF_LABEL = { abnt: "ABNT", apa: "APA", vancouver: "Vancouver" } as const;
type QualityRow = {
  key: string;
  total: number;
  reviewed: number;
  as_is: number;
  auto: number;
  checked: number;
  agree: number;
  audited: number;
  audit_wrong: number;
  edited: number;
  rejected: number;
  verified: number;
};
type ProjectStats = {
  total: number;
  extracted: number;
  reviewed: number;
  cost: number | string;
  costed_articles: number;
  audit_queue: number;
  quality: QualityRow[];
};
const EMPTY_STATS: ProjectStats = {
  total: 0,
  extracted: 0,
  reviewed: 0,
  cost: 0,
  costed_articles: 0,
  audit_queue: 0,
  quality: [],
};

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : "—");

/**
 * Visão do projeto: números, custo, qualidade da extração (a partir das
 * revisões), campos personalizados, matriz, exportação e exclusão.
 */
export async function ProjectOverview({ projectId, pane }: { projectId: string; pane?: boolean }) {
  await requireUser();
  const supabase = await createClient();
  const style = await preferredCitationStyle();
  // BibTeX já tem botão próprio; a lista de referências usa a norma preferida (ABNT se for BibTeX).
  const refStyle = style === "bibtex" ? "abnt" : style;

  const [{ data: project }, { data: custom }, { data: rawStats }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, output_language, cross_check, auto_approve, critical_fields, audit_rate")
      .eq("id", projectId)
      .maybeSingle(),
    supabase.from("project_fields").select("key, label, instructions").eq("project_id", projectId).order("position"),
    // Totais somados no banco (não traz as linhas de campos e custos).
    supabase.rpc("project_stats", { p_project: projectId }),
  ]);
  if (!project) notFound();

  const stats = (rawStats as ProjectStats | null) ?? EMPTY_STATS;
  const total = stats.total;
  const auditQueue = stats.audit_queue;
  const reviewed = stats.reviewed;
  const extracted = stats.extracted;
  const cost = Number(stats.cost);
  const costedArticles = stats.costed_articles;

  // Qualidade por campo, medida pelas suas revisões (o "gold set" sai da própria revisão).
  const defs = fieldDefs(custom ?? []);
  const byKey = new Map(stats.quality.map((q) => [q.key, q]));
  const quality = defs.flatMap((d) => {
    const q = byKey.get(d.key);
    if (!q || q.total === 0) return [];
    return [
      {
        label: d.label,
        total: q.total,
        reviewed: q.reviewed,
        asIs: q.as_is,
        auto: q.auto,
        checked: q.checked,
        agree: q.agree,
        audited: q.audited,
        auditWrong: q.audit_wrong,
        edited: q.edited,
        rejected: q.rejected,
        verified: q.verified,
      },
    ];
  });

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
          {exportLink(refStyle, `Referências ${REF_LABEL[refStyle]}`)}
        </div>
        <p className="m-0 text-[13px] text-muted">
          A matriz e as planilhas trazem um artigo por linha e um campo por coluna, com a página de cada trecho.
          Campos rejeitados ficam de fora.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">
          <label htmlFor="fx-idioma-projeto">Idioma das fichas</label>
        </h2>
        <p className="m-0 text-[13px] text-muted">
          Os campos são escritos neste idioma, qualquer que seja o idioma do artigo. Os trechos citados ficam no
          original (é assim que são conferidos no PDF), com a tradução ao lado e o botão “Ver origem”.
        </p>
        <ProjectLanguage projectId={projectId} initial={project.output_language} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">Verificação automática</h2>
        <VerificationSettings
          projectId={projectId}
          initial={{
            crossCheck: project.cross_check,
            autoApprove: project.auto_approve,
            critical: project.critical_fields,
            auditRate: Number(project.audit_rate),
          }}
          fields={defs.map((d) => ({ key: d.key, label: d.label }))}
        />
        {auditQueue > 0 && (
          <Link href={`/projects/${projectId}/audit`} className="btn btn-primary w-fit">
            Auditar {auditQueue} {auditQueue === 1 ? "aprovação automática" : "aprovações automáticas"}
          </Link>
        )}
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
                  {["Campo", "Revisados", "Aceitos sem editar", "Editados", "Rejeitados", "Trecho conferido", "Modelos concordam", "Aprov. automática", "Erro na auditoria"].map((h) => (
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
                    <td className="border-b border-line py-2 pr-4">{pct(q.agree, q.checked)}</td>
                    <td className="border-b border-line py-2 pr-4">{q.auto || "—"}</td>
                    <td className="border-b border-line py-2 pr-4">
                      {q.audited ? `${q.auditWrong}/${q.audited}` : "—"}
                    </td>
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
