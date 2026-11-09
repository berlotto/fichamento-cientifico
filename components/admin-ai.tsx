"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  loadAiPanel,
  saveAiSettings,
  testModel,
  type AiPanel,
  type AiSettings,
  type ModelOption,
  type TestResult,
} from "@/app/(app)/admin/actions";
import { usd } from "@/lib/format";

const provider = (m: string | null | undefined) => m?.split("/")[0] ?? "";

const price = (m: ModelOption | undefined) =>
  m && m.input != null && m.output != null
    ? `${usd(m.input)} entrada · ${usd(m.output)} saída, por 1 M de tokens`
    : null;

const SOURCE: Record<string, string> = {
  settings: "configurado aqui",
  env: "variável de ambiente",
  default: "padrão do sistema",
};

function ModelPicker({
  id,
  label,
  hint,
  value,
  onChange,
  models,
  emptyLabel,
  effective,
  warn,
}: {
  id: string;
  label: string;
  hint: string;
  value: string | null;
  onChange: (v: string | null) => void;
  models: ModelOption[] | null;
  emptyLabel: string;
  /** Modelo que vale hoje quando nada está escolhido. */
  effective: string | null;
  warn?: string | null;
}) {
  const [test, setTest] = useState<TestResult | null>(null);
  const [testing, startTest] = useTransition();
  const target = value ?? effective;
  const selected = models?.find((m) => m.id === value);
  const byProvider = new Map<string, ModelOption[]>();
  for (const m of models ?? []) byProvider.set(m.provider, [...(byProvider.get(m.provider) ?? []), m]);

  return (
    <div className="flex flex-col gap-2 border-b border-line py-4 last:border-b-0">
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-[15px]">
          {label}
        </label>
        <span className="text-[13px] text-muted">{hint}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {models ? (
          <select
            id={id}
            className="field max-w-full min-w-[280px] flex-1 cursor-pointer"
            value={value ?? ""}
            onChange={(e) => {
              setTest(null);
              onChange(e.target.value || null);
            }}
          >
            <option value="">{emptyLabel}</option>
            {/* Modelo salvo que saiu do catálogo continua visível. */}
            {value && !selected && <option value={value}>{value} (fora do catálogo)</option>}
            {[...byProvider].map(([p, list]) => (
              <optgroup key={p} label={p}>
                {list.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.id}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        ) : (
          <input
            id={id}
            className="field min-w-[280px] flex-1 font-mono text-[13px]"
            placeholder={emptyLabel}
            value={value ?? ""}
            onChange={(e) => {
              setTest(null);
              onChange(e.target.value.trim() || null);
            }}
          />
        )}
        <button
          type="button"
          className="btn"
          disabled={!target || testing}
          onClick={() => startTest(async () => setTest(await testModel(target!)))}
        >
          {testing ? "Testando…" : "Testar"}
        </button>
      </div>
      <div className="flex flex-col gap-1 text-[13px]">
        {selected && price(selected) && <span className="text-muted">{price(selected)}</span>}
        {!value && effective && (
          <span className="text-muted">
            Em uso: <span className="font-mono">{effective}</span>
          </span>
        )}
        {warn && <span className="text-warn">{warn}</span>}
        {test && (
          <span className={test.ok ? "text-accent" : "text-warn"} aria-live="polite">
            {test.ok
              ? `Funcionou: ${target} respondeu em ${((test.latencyMs ?? 0) / 1000).toFixed(1)} s${
                  test.costUsd != null ? ` (custo ${usd(test.costUsd)})` : ""
                }.`
              : `Falhou: ${test.error}`}
          </span>
        )}
      </div>
    </div>
  );
}

/** Admin: modelos da IA, teto de gasto do serviço e gasto do mês por modelo. */
export function AdminAiSection() {
  const [panel, setPanel] = useState<AiPanel | null>(null);
  const [form, setForm] = useState<AiSettings | null>(null);
  const [budget, setBudget] = useState("");
  const [loadError, setLoadError] = useState("");
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [saving, startSave] = useTransition();

  const load = useCallback(async () => {
    try {
      const p = await loadAiPanel();
      setPanel(p);
      setForm(p.settings);
      setBudget(p.settings.monthly_budget_usd == null ? "" : String(p.settings.monthly_budget_usd));
    } catch {
      setLoadError("Não foi possível carregar as configurações de IA.");
    }
  }, []);

  useEffect(() => {
    let alive = true;
    loadAiPanel().then(
      (p) => {
        if (!alive) return;
        setPanel(p);
        setForm(p.settings);
        setBudget(p.settings.monthly_budget_usd == null ? "" : String(p.settings.monthly_budget_usd));
      },
      () => alive && setLoadError("Não foi possível carregar as configurações de IA."),
    );
    return () => {
      alive = false;
    };
  }, []);

  if (loadError) return <p className="m-0 text-sm text-warn">{loadError}</p>;
  if (!panel || !form) return <p className="m-0 text-sm text-muted">Carregando modelos do AI Gateway…</p>;

  const budgetValue = budget.trim() === "" ? null : Number(budget.replace(",", "."));
  const budgetInvalid = budgetValue != null && (!Number.isFinite(budgetValue) || budgetValue < 0);
  const next: AiSettings = { ...form, monthly_budget_usd: budgetValue };
  const dirty = JSON.stringify(next) !== JSON.stringify(panel.settings);

  const fb = panel.fallback;
  const extract = form.extract_model ?? fb.extract.model;
  const sameAs = (m: string | null, who: string) =>
    m && provider(m) === provider(extract)
      ? `Mesmo fornecedor do extrator (${provider(m)}): ${who} tende a repetir os mesmos erros.`
      : null;

  return (
    <>
      <h3 className="m-0 mb-1 text-lg font-semibold">Gasto</h3>
      <div className="grid grid-cols-2 gap-3 py-2">
        <div className="rounded-xl bg-page p-4">
          <div className="text-xs text-muted">Gasto do serviço neste mês</div>
          <div className="mt-1 font-serif text-2xl">{usd(panel.monthCost)}</div>
        </div>
        <div className="rounded-xl bg-page p-4">
          <div className="text-xs text-muted">Saldo no AI Gateway</div>
          <div className="mt-1 font-serif text-2xl">{panel.credits ? usd(panel.credits.balance) : "—"}</div>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-b border-line py-4 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between">
        <div className="flex flex-col gap-1">
          <label htmlFor="fx-ai-budget" className="text-[15px]">
            Teto mensal do serviço (US$)
          </label>
          <span className="text-[13px] text-muted">
            Atingido o teto, ninguém extrai mais até o mês virar. Vazio: sem teto.
          </span>
        </div>
        <input
          id="fx-ai-budget"
          inputMode="decimal"
          className="field w-[140px] text-right tabular-nums"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="sem teto"
          aria-invalid={budgetInvalid}
        />
      </div>

      <h3 className="m-0 mt-5 mb-1 text-lg font-semibold">Modelos</h3>
      {panel.modelsError && <p className="m-0 text-[13px] text-warn">{panel.modelsError} Digite o id do modelo.</p>}
      <ModelPicker
        id="fx-ai-extract"
        label="Extrator"
        hint="Lê o artigo e escreve a ficha com os trechos."
        value={form.extract_model}
        onChange={(v) => setForm({ ...form, extract_model: v })}
        models={panel.models}
        emptyLabel={`Padrão: ${fb.extract.model} (${SOURCE[fb.extract.source]})`}
        effective={fb.extract.model}
      />
      <ModelPicker
        id="fx-ai-cross"
        label="Segundo extrator"
        hint="Lê o artigo de forma independente para conferir a ficha."
        value={form.cross_model}
        onChange={(v) => setForm({ ...form, cross_model: v })}
        models={panel.models}
        emptyLabel={fb.cross ? `Padrão: ${fb.cross.model} (${SOURCE[fb.cross.source]})` : "Automático (outro fornecedor que o extrator)"}
        effective={fb.cross?.model ?? null}
        warn={sameAs(form.cross_model ?? fb.cross?.model ?? null, "a conferência")}
      />
      <ModelPicker
        id="fx-ai-judge"
        label="Juiz"
        hint="Compara os dois valores e confere se o trecho sustenta a ficha."
        value={form.judge_model}
        onChange={(v) => setForm({ ...form, judge_model: v })}
        models={panel.models}
        emptyLabel={fb.judge ? `Padrão: ${fb.judge.model} (${SOURCE[fb.judge.source]})` : "Automático (outro fornecedor que o extrator)"}
        effective={fb.judge?.model ?? null}
        warn={sameAs(form.judge_model ?? fb.judge?.model ?? null, "o juiz")}
      />

      <div className="flex items-center justify-end gap-3 pt-3">
        <span aria-live="polite" className={`text-[13px] ${msg?.ok ? "text-accent" : "text-warn"}`}>
          {saving ? "" : budgetInvalid ? "Teto inválido." : dirty ? "" : msg?.text}
        </span>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!dirty || budgetInvalid || saving}
          onClick={() =>
            startSave(async () => {
              const r = await saveAiSettings(next);
              if (r.ok) {
                await load();
                setMsg({ ok: true, text: "Salvo. Vale para as próximas extrações." });
              } else setMsg({ text: r.error ?? "Não foi possível salvar." });
            })
          }
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>

      <h3 className="m-0 mt-6 mb-2 text-lg font-semibold">Gasto do mês por modelo</h3>
      {panel.byModel.length ? (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full border-collapse text-[13px]">
            <thead className="bg-page text-left text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Modelo</th>
                <th className="px-3 py-2 text-right font-medium">Chamadas</th>
                <th className="px-3 py-2 text-right font-medium">Custo</th>
              </tr>
            </thead>
            <tbody>
              {panel.byModel.map((r) => (
                <tr key={r.model} className="border-t border-line">
                  <td className="px-3 py-2 font-mono text-[12px]">{r.model}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.runs}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{usd(r.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="m-0 text-[13px] text-muted">Nenhuma chamada neste mês.</p>
      )}
    </>
  );
}
