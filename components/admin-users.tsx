"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  loadUserRuns,
  loadUsersPanel,
  saveDefaultLimits,
  saveUserOverride,
  type AdminUser,
  type Limits,
  type RunRow,
  type UserOverride,
  type UsersPanel,
} from "@/app/(app)/admin/actions";
import { usd } from "@/lib/format";
import { RunsTable } from "./usage-section";

/** Campo numérico que aceita vazio (null). */
function NumberField({
  id,
  value,
  onChange,
  placeholder,
  decimal,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  decimal?: boolean;
}) {
  return (
    <input
      id={id}
      inputMode={decimal ? "decimal" : "numeric"}
      className="field w-[120px] text-right tabular-nums"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

const toStr = (v: number | null | undefined) => (v == null ? "" : String(v));
const toNum = (s: string): number | null => {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

const LIMIT_FIELDS = [
  { key: "articles_per_day", label: "Artigos por dia" },
  { key: "extractions_per_day", label: "Extrações por dia" },
  { key: "max_pdfs", label: "PDFs guardados" },
  { key: "max_projects", label: "Projetos" },
] as const;

function DefaultLimitsForm({ initial, onSaved }: { initial: Limits; onSaved: () => void }) {
  const toForm = (l: Limits) => Object.fromEntries(Object.entries(l).map(([k, v]) => [k, toStr(v as number | null)]));
  const [form, setForm] = useState<Record<string, string>>(toForm(initial));
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(initial));

  const rows: { key: keyof Limits; label: string; hint?: string; decimal?: boolean }[] = [
    { key: "user_monthly_budget_usd", label: "Gasto mensal com IA (US$)", hint: "Vazio: sem teto.", decimal: true },
    ...LIMIT_FIELDS,
    { key: "max_fields_per_project", label: "Campos personalizados por projeto" },
  ];

  return (
    <form
      className="flex flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        const l = Object.fromEntries(rows.map((r) => [r.key, toNum(form[r.key])])) as Limits;
        if (Object.entries(l).some(([k, v]) => (v == null ? k !== "user_monthly_budget_usd" : Number.isNaN(v)))) {
          setMsg({ text: "Preencha todos os limites com números (só o gasto pode ficar vazio)." });
          return;
        }
        start(async () => {
          const r = await saveDefaultLimits(l);
          setMsg(r.ok ? { ok: true, text: "Salvo." } : { text: r.error ?? "Não foi possível salvar." });
          if (r.ok) onSaved();
        });
      }}
    >
      {rows.map((r) => (
        <div key={r.key} className="flex items-center justify-between gap-3 border-b border-line py-2.5">
          <label htmlFor={`fx-lim-${r.key}`} className="flex flex-col text-[14px]">
            {r.label}
            {r.hint && <span className="text-[12px] text-muted">{r.hint}</span>}
          </label>
          <NumberField
            id={`fx-lim-${r.key}`}
            value={form[r.key]}
            decimal={r.decimal}
            placeholder={r.decimal ? "sem teto" : undefined}
            onChange={(v) => setForm({ ...form, [r.key]: v })}
          />
        </div>
      ))}
      <div className="flex items-center justify-end gap-3 pt-3">
        <span aria-live="polite" className={`text-[13px] ${msg?.ok ? "text-accent" : "text-warn"}`}>
          {pending ? "" : dirty && msg?.ok ? "" : msg?.text}
        </span>
        <button type="submit" className="btn btn-primary" disabled={!dirty || pending}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}

const EMPTY_OVERRIDE: UserOverride = {
  monthly_budget_usd: null,
  unlimited_budget: false,
  articles_per_day: null,
  extractions_per_day: null,
  max_pdfs: null,
  max_projects: null,
  blocked: false,
  note: null,
};

function UserDetail({ user, defaults, onSaved }: { user: AdminUser; defaults: Limits; onSaved: () => void }) {
  const initial = user.override ?? EMPTY_OVERRIDE;
  const [o, setO] = useState({
    budget: toStr(initial.monthly_budget_usd),
    unlimited: initial.unlimited_budget,
    blocked: initial.blocked,
    note: initial.note ?? "",
    ...Object.fromEntries(LIMIT_FIELDS.map((f) => [f.key, toStr(initial[f.key])])),
  } as Record<string, string | boolean>);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [runs, setRuns] = useState<RunRow[] | null>(null);
  const [runsError, setRunsError] = useState("");

  useEffect(() => {
    let alive = true;
    loadUserRuns(user.id).then(
      (r) => alive && setRuns(r),
      () => alive && setRunsError("Não foi possível carregar o registro."),
    );
    return () => {
      alive = false;
    };
  }, [user.id]);

  const save = () => {
    const nums = Object.fromEntries(LIMIT_FIELDS.map((f) => [f.key, toNum(o[f.key] as string)]));
    const budget = toNum(o.budget as string);
    if ([budget, ...Object.values(nums)].some((v) => v != null && Number.isNaN(v))) {
      setMsg({ text: "Use números (ou deixe vazio para o padrão)." });
      return;
    }
    start(async () => {
      const r = await saveUserOverride(user.id, {
        ...(nums as Pick<UserOverride, (typeof LIMIT_FIELDS)[number]["key"]>),
        monthly_budget_usd: budget,
        unlimited_budget: o.unlimited as boolean,
        blocked: o.blocked as boolean,
        note: (o.note as string) || null,
      });
      setMsg(r.ok ? { ok: true, text: "Salvo." } : { text: r.error ?? "Não foi possível salvar." });
      if (r.ok) onSaved();
    });
  };

  return (
    <div className="flex flex-col gap-4 bg-page px-4 py-4">
      <div className="grid grid-cols-1 gap-x-6 gap-y-2 min-[640px]:grid-cols-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={`fx-u-budget-${user.id}`} className="text-[13px]">
            Gasto mensal (US$)
          </label>
          <NumberField
            id={`fx-u-budget-${user.id}`}
            decimal
            value={o.budget as string}
            placeholder={defaults.user_monthly_budget_usd == null ? "sem teto" : `padrão ${defaults.user_monthly_budget_usd}`}
            onChange={(v) => setO({ ...o, budget: v })}
          />
        </div>
        {LIMIT_FIELDS.map((f) => (
          <div key={f.key} className="flex items-center justify-between gap-3">
            <label htmlFor={`fx-u-${f.key}-${user.id}`} className="text-[13px]">
              {f.label}
            </label>
            <NumberField
              id={`fx-u-${f.key}-${user.id}`}
              value={o[f.key] as string}
              placeholder={`padrão ${defaults[f.key]}`}
              onChange={(v) => setO({ ...o, [f.key]: v })}
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="size-4 accent-[var(--accent)]"
            checked={o.unlimited as boolean}
            onChange={(e) => setO({ ...o, unlimited: e.target.checked })}
          />
          Sem teto de gasto
        </label>
        <label className="flex items-center gap-2 text-warn">
          <input
            type="checkbox"
            className="size-4 accent-[var(--warn)]"
            checked={o.blocked as boolean}
            onChange={(e) => setO({ ...o, blocked: e.target.checked })}
          />
          Bloquear novas extrações
        </label>
      </div>
      <input
        aria-label="Nota interna"
        className="field text-[13px]"
        placeholder="Nota interna (ex.: plano, motivo do bloqueio)"
        maxLength={500}
        value={o.note as string}
        onChange={(e) => setO({ ...o, note: e.target.value })}
      />
      <div className="flex items-center justify-end gap-3">
        <span aria-live="polite" className={`text-[13px] ${msg?.ok ? "text-accent" : "text-warn"}`}>
          {pending ? "" : msg?.text}
        </span>
        <button type="button" className="btn btn-primary" disabled={pending} onClick={save}>
          {pending ? "Salvando…" : "Salvar exceções"}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium">Registro de gastos (últimas 200 chamadas)</span>
        {runsError ? (
          <p className="m-0 text-[13px] text-warn">{runsError}</p>
        ) : runs ? (
          <RunsTable runs={runs} />
        ) : (
          <p className="m-0 text-[13px] text-muted">Carregando…</p>
        )}
      </div>
    </div>
  );
}

/** Admin: limites padrão, usuários com gasto do mês e exceções por usuário. */
export function AdminUsersSection() {
  const [panel, setPanel] = useState<UsersPanel | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const reload = useCallback(() => {
    loadUsersPanel().then(setPanel, () => setError("Não foi possível carregar os usuários."));
  }, []);

  useEffect(() => {
    let alive = true;
    loadUsersPanel().then(
      (p) => alive && setPanel(p),
      () => alive && setError("Não foi possível carregar os usuários."),
    );
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <p className="m-0 text-sm text-warn">{error}</p>;
  if (!panel) return <p className="m-0 text-sm text-muted">Carregando…</p>;

  const q = query.trim().toLowerCase();
  const users = q
    ? panel.users.filter((u) => u.email.toLowerCase().includes(q) || u.fullName?.toLowerCase().includes(q))
    : panel.users;
  const budgetOf = (u: AdminUser) =>
    u.override?.unlimited_budget
      ? null
      : (u.override?.monthly_budget_usd ?? panel.defaults.user_monthly_budget_usd);

  return (
    <>
      <h3 className="m-0 mb-1 text-lg font-semibold">Limites padrão por usuário</h3>
      <p className="m-0 text-[13px] text-muted">Valem para todos, menos para quem tiver exceção abaixo.</p>
      <DefaultLimitsForm key={JSON.stringify(panel.defaults)} initial={panel.defaults} onSaved={reload} />

      <div className="mt-6 mb-2 flex flex-wrap items-center justify-between gap-3">
        <h3 className="m-0 text-lg font-semibold">Usuários ({panel.users.length})</h3>
        <input
          type="search"
          aria-label="Buscar usuário"
          placeholder="Buscar por nome ou e-mail"
          className="field min-w-[220px]"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <ul className="m-0 flex list-none flex-col overflow-hidden rounded-lg border border-line p-0">
        {users.map((u) => {
          const budget = budgetOf(u);
          const over = budget != null && u.monthCost >= budget;
          const isOpen = open === u.id;
          return (
            <li key={u.id} className="border-t border-line first:border-t-0">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : u.id)}
                className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-sunk/60"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14px]">
                    {u.fullName ?? u.email}
                    {u.isAdmin && (
                      <span className="ml-2 rounded-full bg-tint px-2 py-0.5 text-[11px] text-ink">admin</span>
                    )}
                    {u.override?.blocked && (
                      <span className="ml-2 rounded-full border border-warn px-2 py-0.5 text-[11px] text-warn">
                        bloqueado
                      </span>
                    )}
                    {u.override && !u.override.blocked && (
                      <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">
                        exceção
                      </span>
                    )}
                  </span>
                  {u.fullName && <span className="truncate text-[12px] text-muted">{u.email}</span>}
                </span>
                <span className="text-[12px] text-muted tabular-nums">
                  {u.projects} proj. · {u.articles} art.
                </span>
                <span className={`text-[13px] tabular-nums ${over ? "text-warn" : ""}`}>
                  {usd(u.monthCost)}
                  <span className="text-muted"> / {budget == null ? "sem teto" : usd(budget)}</span>
                </span>
              </button>
              {isOpen && <UserDetail user={u} defaults={panel.defaults} onSaved={reload} />}
            </li>
          );
        })}
        {!users.length && <li className="px-4 py-3 text-[13px] text-muted">Nenhum usuário encontrado.</li>}
      </ul>
      <p className="m-0 mt-2 text-[12px] text-muted">Gasto do mês corrente / teto. Clique para ver o registro e editar exceções.</p>
    </>
  );
}
