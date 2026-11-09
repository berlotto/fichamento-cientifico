"use client";

import { AUDIT_RATES, type ProjectDefaults } from "@/lib/project-defaults";

export type VerificationValue = ProjectDefaults;

/**
 * Controles da verificação automática (segundo modelo + juiz, aprovação
 * automática, taxa de auditoria e campos críticos). Usados no projeto e nos
 * padrões de projetos novos.
 */
export function VerificationControls({
  value: v,
  onChange,
  fields,
  disabled,
}: {
  value: VerificationValue;
  onChange: (next: VerificationValue) => void;
  fields: { key: string; label: string }[];
  disabled?: boolean;
}) {
  const auto = v.crossCheck && v.autoApprove;
  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-[var(--accent)]"
          checked={v.crossCheck}
          disabled={disabled}
          onChange={(e) => onChange({ ...v, crossCheck: e.target.checked, autoApprove: e.target.checked && v.autoApprove })}
        />
        <span className="flex flex-col">
          <span className="text-sm font-medium">Conferir com um segundo modelo e um juiz</span>
          <span className="text-[13px] text-muted">
            Outro modelo, de outro fornecedor, lê o artigo de forma independente; um terceiro confere se os dois
            concordam, se o trecho sustenta o valor e se é deste estudo. Cerca de 2× o custo da extração.
          </span>
        </span>
      </label>
      <label className={`flex items-start gap-3 ${v.crossCheck ? "" : "opacity-50"}`}>
        <input
          type="checkbox"
          className="mt-1 size-4 accent-[var(--accent)]"
          checked={v.autoApprove}
          disabled={disabled || !v.crossCheck}
          onChange={(e) => onChange({ ...v, autoApprove: e.target.checked })}
        />
        <span className="flex flex-col">
          <span className="text-sm font-medium">Aprovar sozinho o que passar em todas as verificações</span>
          <span className="text-[13px] text-muted">
            Campos críticos nunca. Um campo com mais de 10% de erro na auditoria (em 5 ou mais auditorias) deixa de
            ser aprovado sozinho.
          </span>
        </span>
      </label>
      <div className={`flex flex-wrap items-center gap-3 ${auto ? "" : "opacity-50"}`}>
        <label htmlFor="fx-audit-rate" className="text-[13px] font-medium">
          Auditoria às cegas
        </label>
        <select
          id="fx-audit-rate"
          className="field cursor-pointer"
          value={v.auditRate}
          disabled={disabled || !auto}
          onChange={(e) => onChange({ ...v, auditRate: Number(e.target.value) })}
        >
          {AUDIT_RATES.map((r) => (
            <option key={r} value={r}>
              {Math.round(r * 100)}% das aprovações
            </option>
          ))}
        </select>
      </div>
      <div className={`flex flex-col gap-2 ${auto ? "" : "opacity-50"}`}>
        <span className="text-[13px] font-medium">Campos críticos (sempre com revisão humana)</span>
        <div className="flex flex-wrap gap-2">
          {fields.map((f) => {
            const on = v.critical.includes(f.key);
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={on}
                disabled={disabled || !auto}
                onClick={() =>
                  onChange({ ...v, critical: on ? v.critical.filter((k) => k !== f.key) : [...v.critical, f.key] })
                }
                className={`rounded-full border px-3 py-1 text-[13px] ${
                  on ? "border-accent bg-tint text-ink" : "border-line text-muted hover:border-muted"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
