"use client";

import { useEffect, useState } from "react";
import { loadMyUsage, type MyUsage } from "@/app/(app)/profile/actions";
import { dateTime, STAGE_LABEL, usd } from "@/lib/format";

/** Barra de consumo: usado / limite. */
export function Meter({ label, used, limit, format = String }: { label: string; used: number; limit: number | null; format?: (n: number) => string }) {
  const ratio = limit ? Math.min(1, used / limit) : 0;
  const tone = ratio >= 1 ? "bg-warn" : ratio >= 0.8 ? "bg-warn/60" : "bg-accent";
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <div className="flex items-baseline justify-between gap-3 text-[14px]">
        <span>{label}</span>
        <span className="text-muted tabular-nums">
          {format(used)} {limit == null ? "· sem limite" : `de ${format(limit)}`}
        </span>
      </div>
      {limit != null && (
        <div
          className="h-1.5 overflow-hidden rounded-full bg-sunk"
          role="meter"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={used}
        >
          <div className={`h-full rounded-full ${tone}`} style={{ width: `${ratio * 100}%` }} />
        </div>
      )}
    </div>
  );
}

/** Uso e gasto do próprio usuário (limites do plano e últimas chamadas de IA). */
export function UsageSection() {
  const [u, setU] = useState<MyUsage | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    loadMyUsage().then(
      (r) => alive && setU(r),
      () => alive && setError("Não foi possível carregar o uso."),
    );
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <p className="m-0 text-sm text-warn">{error}</p>;
  if (!u) return <p className="m-0 text-sm text-muted">Carregando…</p>;

  const month = new Date().toLocaleDateString("pt-BR", { month: "long" });
  return (
    <>
      <h3 className="m-0 mb-1 text-lg font-semibold">Este mês</h3>
      {u.blocked && (
        <p className="m-0 mb-2 rounded-lg border border-warn px-3 py-2 text-[13px] text-warn">
          Sua conta está bloqueada para novas extrações. Fale com o administrador.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 py-2">
        <div className="rounded-xl bg-page p-4">
          <div className="text-xs text-muted">Gasto com IA em {month}</div>
          <div className="mt-1 font-serif text-2xl">{usd(u.monthCost)}</div>
        </div>
        <div className="rounded-xl bg-page p-4">
          <div className="text-xs text-muted">Artigos processados</div>
          <div className="mt-1 font-serif text-2xl">{u.monthArticles}</div>
        </div>
      </div>
      <Meter label="Gasto mensal com IA" used={u.monthCost} limit={u.monthlyBudget} format={usd} />

      <h3 className="m-0 mt-5 mb-1 text-lg font-semibold">Limites</h3>
      <Meter label="Artigos enviados nas últimas 24 h" used={u.articlesToday} limit={u.articlesPerDay} />
      <Meter label="Extrações nas últimas 24 h" used={u.extractionsToday} limit={u.extractionsPerDay} />
      <Meter label="PDFs guardados" used={u.pdfs} limit={u.maxPdfs} />
      <Meter label="Projetos" used={u.projects} limit={u.maxProjects} />

      <h3 className="m-0 mt-5 mb-2 text-lg font-semibold">Últimas chamadas de IA</h3>
      <RunsTable runs={u.runs} />
    </>
  );
}

export function RunsTable({
  runs,
}: {
  runs: { id: number; createdAt: string; stage: string; model: string; costUsd: number | null; article: string | null }[];
}) {
  if (!runs.length) return <p className="m-0 text-[13px] text-muted">Nenhuma chamada ainda.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-[13px]">
        <thead className="bg-page text-left text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">Quando</th>
            <th className="px-3 py-2 font-medium">Etapa</th>
            <th className="px-3 py-2 font-medium">Artigo</th>
            <th className="px-3 py-2 font-medium">Modelo</th>
            <th className="px-3 py-2 text-right font-medium">Custo</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="border-t border-line">
              <td className="px-3 py-2 whitespace-nowrap tabular-nums">{dateTime(r.createdAt)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{STAGE_LABEL[r.stage] ?? r.stage}</td>
              <td className="max-w-[220px] truncate px-3 py-2" title={r.article ?? undefined}>
                {r.article ?? <span className="text-muted">—</span>}
              </td>
              <td className="px-3 py-2 font-mono text-[12px] whitespace-nowrap">{r.model}</td>
              <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                {r.costUsd == null ? "—" : usd(r.costUsd)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
