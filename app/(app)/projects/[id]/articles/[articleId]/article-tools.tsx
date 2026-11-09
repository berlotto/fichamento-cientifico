"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { deleteArticle, reextract, saveMetadata, type MetadataState } from "./actions";

export type MetadataValues = {
  title: string;
  subtitle: string;
  authors: string;
  year: string;
  venue: string;
  volume: string;
  issue: string;
  pages: string;
  doi: string;
  language: string;
};

/** Formulário de correção dos metadados (vira fonte "manual"). */
export function MetadataForm({
  articleId,
  initial,
  onDone,
}: {
  articleId: string;
  initial: MetadataValues;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<MetadataState, FormData>(saveMetadata, {});
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  const input = (name: keyof MetadataValues, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="label">{label}</span>
      <input name={name} defaultValue={initial[name]} className="field" {...props} />
    </label>
  );

  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-line p-5">
      <input type="hidden" name="articleId" value={articleId} />
      {input("title", "Título", { required: true, maxLength: 1000 })}
      {input("subtitle", "Subtítulo", { maxLength: 1000 })}
      <label className="flex flex-col gap-1">
        <span className="label">Autores (um por linha: Sobrenome, Prenomes)</span>
        <textarea name="authors" defaultValue={initial.authors} rows={4} className="field resize-y p-3" />
      </label>
      <div className="grid grid-cols-2 gap-3 min-[600px]:grid-cols-4">
        {input("year", "Ano", { inputMode: "numeric", maxLength: 4 })}
        {input("volume", "Volume", { maxLength: 50 })}
        {input("issue", "Número", { maxLength: 50 })}
        {input("pages", "Páginas", { maxLength: 50, placeholder: "123-145" })}
      </div>
      {input("venue", "Periódico ou evento", { maxLength: 500 })}
      <div className="grid grid-cols-1 gap-3 min-[600px]:grid-cols-[1fr_120px]">
        {input("doi", "DOI", { maxLength: 300, placeholder: "10.xxxx/…" })}
        {input("language", "Língua", { maxLength: 10, placeholder: "pt, en…" })}
      </div>
      {state.error && <p className="m-0 text-sm text-warn">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn" onClick={onDone} disabled={pending}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}

/** "Corrigir dados", "Extrair de novo" e "Excluir" (exclusão em dois cliques, sem diálogo do navegador). */
export function ArticleTools({
  projectId,
  articleId,
  metadata,
  canReextract,
}: {
  projectId: string;
  articleId: string;
  metadata: MetadataValues;
  canReextract: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (editing) return <MetadataForm articleId={articleId} initial={metadata} onDone={() => setEditing(false)} />;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn min-h-9 px-3 text-[13px]" onClick={() => setEditing(true)}>
          Corrigir dados
        </button>
        {canReextract && (
          <button
            type="button"
            className="btn min-h-9 px-3 text-[13px]"
            disabled={pending}
            title="Lê o artigo de novo. Campos já revisados são mantidos."
            onClick={() =>
              start(async () => {
                const r = await reextract(articleId);
                setMsg(r.ok ? "Extração pedida. A ficha atualiza em um ou dois minutos." : (r.error ?? "Erro"));
              })
            }
          >
            Extrair de novo
          </button>
        )}
        {confirmDelete ? (
          <>
            <button
              type="button"
              className="btn min-h-9 border-warn px-3 text-[13px] text-warn"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await deleteArticle(projectId, articleId);
                  if (r && !r.ok) setMsg(r.error ?? "Erro");
                })
              }
            >
              {pending ? "Excluindo…" : "Confirmar exclusão"}
            </button>
            <button type="button" className="text-[13px] text-muted underline" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </button>
          </>
        ) : (
          <button
            type="button"
            className="min-h-9 px-2 text-[13px] text-muted underline"
            onClick={() => setConfirmDelete(true)}
          >
            Excluir artigo
          </button>
        )}
      </div>
      {msg && (
        <p aria-live="polite" className="m-0 text-sm text-muted">
          {msg}
        </p>
      )}
    </div>
  );
}
