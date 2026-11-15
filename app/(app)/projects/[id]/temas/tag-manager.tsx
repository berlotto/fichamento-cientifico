"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { TAG_COLOR_LABEL, TAG_COLORS, tagHex, tagTree, type Tag } from "@/lib/tags";
import { createTag, deleteTag, mergeTags, updateTag } from "../tag-actions";

type Row = Tag & { description: string | null; marks: number; articles: number };

function NewTag({ projectId, roots }: { projectId: string; roots: Row[] }) {
  const [name, setName] = useState("");
  const [parent, setParent] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createTag(projectId, name, parent || null);
          if (r.ok) {
            setName("");
            setError("");
          } else setError(r.error);
        });
      }}
    >
      <label className="flex min-w-48 flex-1 flex-col gap-1">
        <span className="label">Nova tag</span>
        <input className="field" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Ex.: limitação amostral" />
      </label>
      {roots.length > 0 && (
        <label className="flex flex-col gap-1">
          <span className="label">Dentro do tema</span>
          <select className="field w-auto" value={parent} onChange={(e) => setParent(e.target.value)}>
            <option value="">(nenhum)</option>
            {roots.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <button type="submit" className="btn btn-primary" disabled={pending || !name.trim()}>
        Criar
      </button>
      {error && <p className="m-0 basis-full text-sm text-warn">{error}</p>}
    </form>
  );
}

/** Uma tag: nome, cor, tema, descrição, juntar em outra e excluir. */
function TagEditor({ tag, all, onClose }: { tag: Row; all: Row[]; onClose: () => void }) {
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);
  const [parent, setParent] = useState(tag.parent_id ?? "");
  const [description, setDescription] = useState(tag.description ?? "");
  const [mergeInto, setMergeInto] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const hasChildren = all.some((t) => t.parent_id === tag.id);
  const parentOptions = all.filter((t) => !t.parent_id && t.id !== tag.id);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after = onClose) =>
    start(async () => {
      const r = await fn();
      if (r.ok) after();
      else setError(r.error ?? "Erro");
    });

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-page p-4">
      <div className="flex flex-wrap gap-2">
        <label className="flex min-w-48 flex-1 flex-col gap-1">
          <span className="label">Nome</span>
          <input className="field" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Cor</span>
          <select className="field w-auto" value={color} onChange={(e) => setColor(e.target.value)}>
            {TAG_COLORS.map((c) => (
              <option key={c} value={c}>
                {TAG_COLOR_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        {!hasChildren && (
          <label className="flex flex-col gap-1">
            <span className="label">Dentro do tema</span>
            <select className="field w-auto" value={parent} onChange={(e) => setParent(e.target.value)}>
              <option value="">(nenhum)</option>
              {parentOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <label className="flex flex-col gap-1">
        <span className="label">Descrição (opcional)</span>
        <textarea
          className="field resize-y p-2.5 text-sm"
          rows={2}
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="O que entra neste tema"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary min-h-9 px-3 text-[13px]"
          disabled={pending}
          onClick={() => run(() => updateTag(tag.id, { name, color, description, parent_id: hasChildren ? undefined : parent || null }))}
        >
          Salvar
        </button>
        <button type="button" className="btn min-h-9 px-3 text-[13px]" onClick={onClose}>
          Cancelar
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <span className="text-[13px] text-muted">Juntar em</span>
        <select className="field min-h-9 w-auto py-1 text-[13px]" value={mergeInto} onChange={(e) => setMergeInto(e.target.value)}>
          <option value="">escolha a tag</option>
          {all
            .filter((t) => t.id !== tag.id)
            .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </select>
        <button
          type="button"
          className="btn min-h-9 px-3 text-[13px]"
          disabled={pending || !mergeInto}
          onClick={() => run(() => mergeTags(tag.id, mergeInto))}
          title="As marcações desta tag passam para a escolhida, e esta é apagada"
        >
          Juntar
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {confirmDelete ? (
          <>
            <span className="text-[13px] text-warn">
              {tag.marks > 0
                ? `Excluir “${tag.name}” remove ${tag.marks} ${tag.marks === 1 ? "marcação" : "marcações"}.`
                : `Excluir “${tag.name}”?`}
              {hasChildren && " Os subtemas viram temas."}
            </span>
            <button type="button" className="btn min-h-9 px-3 text-[13px] text-warn" disabled={pending} onClick={() => run(() => deleteTag(tag.id))}>
              Confirmar exclusão
            </button>
            <button type="button" className="btn min-h-9 px-3 text-[13px]" onClick={() => setConfirmDelete(false)}>
              Manter
            </button>
          </>
        ) : (
          <button type="button" className="text-[13px] text-muted underline underline-offset-2" onClick={() => setConfirmDelete(true)}>
            Excluir tag
          </button>
        )}
      </div>
      {error && <p className="m-0 text-sm text-warn">{error}</p>}
    </div>
  );
}

export function TagManager({ projectId, tags }: { projectId: string; tags: Row[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const tree = tagTree(tags) as { tag: Row; depth: 0 | 1 }[];
  const roots = tags.filter((t) => !t.parent_id).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <div className="flex flex-col gap-6">
      <NewTag projectId={projectId} roots={roots} />
      {tree.length === 0 ? (
        <p className="m-0 text-sm text-muted">
          Nenhuma tag ainda. Crie aqui ou use “+ tag” na ficha de um artigo, num campo ou numa citação.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {tree.map(({ tag, depth }) => (
            <li key={tag.id} className={`flex flex-col gap-2 border-b border-line py-3 ${depth ? "pl-6" : ""}`}>
              <div className="flex items-center gap-3">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: tagHex(tag.color) }} aria-hidden />
                <Link href={`/projects/${projectId}/temas/${tag.id}`} className="min-w-0 flex-1 hover:underline">
                  <span className={depth ? "text-[15px]" : "font-medium"}>{tag.name}</span>
                  {tag.description && <span className="block truncate text-xs text-muted">{tag.description}</span>}
                </Link>
                <span className="text-xs whitespace-nowrap text-muted">
                  {tag.marks} {tag.marks === 1 ? "trecho" : "trechos"} · {tag.articles} {tag.articles === 1 ? "artigo" : "artigos"}
                </span>
                <button
                  type="button"
                  className="text-xs text-muted underline underline-offset-2"
                  onClick={() => setEditing(editing === tag.id ? null : tag.id)}
                  aria-expanded={editing === tag.id}
                >
                  Editar
                </button>
              </div>
              {editing === tag.id && <TagEditor key={tag.id} tag={tag} all={tags} onClose={() => setEditing(null)} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
