"use client";

import { useActionState, useState, useTransition } from "react";
import { VerificationControls } from "@/components/verification-controls";
import {
  addProjectField,
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
