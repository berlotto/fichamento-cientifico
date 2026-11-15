"use client";

import { useActionState, useState, useTransition } from "react";
import { VerificationControls } from "@/components/verification-controls";
import { FIELD_TEMPLATES } from "@/lib/field-templates";
import { OPTIONAL_FIELDS } from "@/lib/fields";
import {
  addProjectField,
  applyFieldTemplate,
  setOptionalFields,
  deleteProject,
  removeProjectField,
  renameProject,
  reextractProject,
  saveVerification,
  type ProjectActionState,
  type VerificationSettings as VerificationSettingsValue,
} from "../actions";

export function RenameProject({ projectId, name }: { projectId: string; name: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ProjectActionState, FormData>(async (prev, fd) => {
    const r = await renameProject(prev, fd);
    if (r.ok) setEditing(false);
    return r;
  }, {});

  if (!editing) {
    return (
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="m-0 font-serif text-[32px] leading-tight font-normal">{name}</h1>
        <button type="button" className="text-[13px] text-muted underline" onClick={() => setEditing(true)}>
          Renomear
        </button>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <input name="name" defaultValue={name} className="field min-w-0 flex-1 font-serif text-xl" required maxLength={200} autoFocus />
      <button type="button" className="btn" onClick={() => setEditing(false)}>
        Cancelar
      </button>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        Salvar
      </button>
      {state.error && <p className="m-0 w-full text-sm text-warn">{state.error}</p>}
    </form>
  );
}

export function CustomFields({
  projectId,
  fields,
}: {
  projectId: string;
  fields: { key: string; label: string; instructions: string | null }[];
}) {
  const [state, action, pending] = useActionState<ProjectActionState, FormData>(addProjectField, {});
  const [removing, start] = useTransition();
  const [formKey, setFormKey] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      {fields.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {fields.map((f) => (
            <li key={f.key} className="flex items-start justify-between gap-3 rounded-lg border border-line px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">{f.label}</div>
                {f.instructions && <div className="text-[13px] text-muted">{f.instructions}</div>}
              </div>
              <button
                type="button"
                className="text-[13px] text-muted underline"
                disabled={removing}
                onClick={() => start(async () => void (await removeProjectField(projectId, f.key)))}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        key={formKey}
        action={async (fd) => {
          await action(fd);
          setFormKey((k) => k + 1);
        }}
        className="flex flex-col gap-2"
      >
        <input type="hidden" name="projectId" value={projectId} />
        <div className="grid grid-cols-1 gap-2 min-[600px]:grid-cols-[200px_1fr_auto]">
          <input name="label" placeholder="Nome do campo (ex.: Amostra)" className="field" required maxLength={80} />
          <input
            name="instructions"
            placeholder="O que extrair (ex.: número de participantes e como foram selecionados)"
            className="field"
            maxLength={1000}
          />
          <button type="submit" className="btn btn-primary" disabled={pending}>
            Adicionar
          </button>
        </div>
        {state.error && <p className="m-0 text-sm text-warn">{state.error}</p>}
      </form>
    </div>
  );
}

export function ReextractAll({ projectId, count }: { projectId: string; count: number }) {
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (count === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {confirm ? (
          <>
            <button
              type="button"
              className="btn btn-primary"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await reextractProject(projectId);
                  setConfirm(false);
                  setMsg(
                    r.error
                      ? `${r.error}${r.queued ? ` (${r.queued} pedidos antes do limite)` : ""}`
                      : `${r.queued} ${r.queued === 1 ? "artigo" : "artigos"} na fila.`,
                  );
                })
              }
            >
              {pending ? "Pedindo…" : `Confirmar (${count} ${count === 1 ? "artigo" : "artigos"})`}
            </button>
            <button type="button" className="text-[13px] text-muted underline" onClick={() => setConfirm(false)}>
              Cancelar
            </button>
          </>
        ) : (
          <button type="button" className="btn" onClick={() => setConfirm(true)}>
            Extrair todos de novo
          </button>
        )}
      </div>
      <p className="m-0 text-[13px] text-muted">
        {msg ?? "Use depois de criar campos. Campos já revisados são mantidos; cada artigo é uma nova chamada ao LLM."}
      </p>
    </div>
  );
}

export function DeleteProject({ projectId }: { projectId: string }) {
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {confirm ? (
        <>
          <button
            type="button"
            className="btn border-warn text-warn"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await deleteProject(projectId);
                if (r?.error) setMsg(r.error);
              })
            }
          >
            {pending ? "Excluindo…" : "Excluir projeto, artigos e PDFs"}
          </button>
          <button type="button" className="text-[13px] text-muted underline" onClick={() => setConfirm(false)}>
            Cancelar
          </button>
        </>
      ) : (
        <button type="button" className="text-[13px] text-muted underline" onClick={() => setConfirm(true)}>
          Excluir projeto
        </button>
      )}
      {msg && <p className="m-0 w-full text-sm text-warn">{msg}</p>}
    </div>
  );
}

/** Verificação automática do projeto: salva a cada mudança. */
export function VerificationSettings({
  projectId,
  initial,
  fields,
}: {
  projectId: string;
  initial: VerificationSettingsValue;
  fields: { key: string; label: string }[];
}) {
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  const save = (next: VerificationSettingsValue) => {
    setV(next);
    start(async () => {
      const r = await saveVerification(projectId, next);
      setMsg(r.error ?? "Salvo.");
    });
  };

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      <VerificationControls value={v} onChange={save} fields={fields} />
      <span aria-live="polite" className="text-xs text-muted">
        {pending ? "Salvando…" : msg}
      </span>
    </div>
  );
}

/**
 * Campos opcionais da extração (spec 005): só o que os autores declaram.
 * Valem para as próximas extrações.
 */
export function OptionalFields({ projectId, initial }: { projectId: string; initial: string[] }) {
  const [on, setOn] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  function toggle(key: string, checked: boolean) {
    const next = checked ? [...on, key] : on.filter((k) => k !== key);
    const before = on;
    setOn(next);
    setMsg("");
    start(async () => {
      const r = await setOptionalFields(projectId, next);
      if (r.error) {
        setOn(before);
        setMsg(r.error);
      } else setMsg("Salvo. Vale para as próximas extrações.");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {OPTIONAL_FIELDS.map((f) => (
        <label key={f.key} className="flex items-start gap-3 rounded-lg border border-line px-4 py-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={on.includes(f.key)}
            disabled={pending}
            onChange={(e) => toggle(f.key, e.target.checked)}
          />
          <span className="flex flex-col">
            <span className="text-sm font-medium">{f.label}</span>
            <span className="text-[13px] text-muted">{f.definition}</span>
          </span>
        </label>
      ))}
      <p aria-live="polite" className="m-0 text-xs text-muted empty:hidden">
        {msg}
      </p>
    </div>
  );
}

/** Aplicar um modelo de campos (spec 007) a um projeto que já existe. */
export function FieldTemplates({ projectId, existing, limit }: { projectId: string; existing: string[]; limit: number }) {
  const [id, setId] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const template = FIELD_TEMPLATES.find((t) => t.id === id);
  const missing = template ? template.fields.filter((f) => !existing.includes(f.key)) : [];
  const room = Math.max(0, limit - existing.length);

  function apply() {
    start(async () => {
      const r = await applyFieldTemplate(projectId, id);
      setMsg(
        r.error
          ? { ok: false, text: r.error }
          : {
              ok: true,
              text: `${r.added} ${r.added === 1 ? "campo criado" : "campos criados"}. Use “Extrair todos de novo” para preencher os artigos que já estão no projeto.`,
            },
      );
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-page p-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="label">Modelo de campos</span>
          <select
            className="field w-auto"
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              setMsg(null);
            }}
          >
            <option value="">Escolha</option>
            {FIELD_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!template || pending || missing.length === 0 || missing.length > room}
          onClick={apply}
        >
          Aplicar
        </button>
      </div>
      {template && (
        <div className="flex flex-col gap-1 text-[13px]">
          <p className="m-0 text-muted">{template.summary}</p>
          <p className="m-0">{template.fields.map((f) => f.label).join(" · ")}</p>
          {missing.length === 0 ? (
            <p className="m-0 text-muted">O projeto já tem todos os campos deste modelo.</p>
          ) : missing.length > room ? (
            <p className="m-0 text-warn">
              O modelo precisa de {missing.length} campos novos e só cabem mais {room} neste projeto.
            </p>
          ) : (
            <p className="m-0 text-muted">
              Cria {missing.length} {missing.length === 1 ? "campo" : "campos"}
              {missing.length < template.fields.length ? " (os que já existem ficam como estão)" : ""}. Nada é apagado.
            </p>
          )}
          <p className="m-0 text-xs text-muted">Referência: {template.doc} no repositório do Fichamento.</p>
        </div>
      )}
      {msg && <p className={`m-0 text-sm ${msg.ok ? "text-accent" : "text-warn"}`}>{msg.text}</p>}
    </div>
  );
}
