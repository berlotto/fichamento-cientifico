"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CheckIcon } from "@/components/icons";
import {
  definitionCite,
  KIND_LABEL,
  type GlossaryConcept,
  type GlossaryDefinition,
} from "@/lib/export/glossary-export";
import { addConcept, deleteDefinition, removeConcept, requestDefinitions, reviewDefinition } from "../glossary-actions";

function DefinitionItem({ d }: { d: GlossaryDefinition }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [translated, setTranslated] = useState(Boolean(d.text_translated));
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      setError(r.ok ? "" : (r.error ?? "Erro"));
    });
  const href = d.pdf_page
    ? `/viewer/${d.article.id}?p=${d.pdf_page}&q=${encodeURIComponent(d.text.slice(0, 300))}#trecho`
    : `/viewer/${d.article.id}`;

  if (d.status === "rejected") {
    return (
      <li className="flex items-center justify-between gap-3 text-[13px] text-muted">
        <span className="truncate">Rejeitada: “{d.text.slice(0, 80)}…”</span>
        <button type="button" className="underline" disabled={pending} onClick={() => run(() => reviewDefinition(d.id, "pending"))}>
          Desfazer
        </button>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 border-b border-line pb-4 last:border-b-0">
      <blockquote className="m-0 font-article text-[16px] leading-normal">
        “{translated && d.text_translated ? d.text_translated : d.text}”
      </blockquote>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <Link href={href} className="font-medium text-accent hover:underline">
          {definitionCite(d)}
        </Link>
        <span className="rounded bg-page px-1.5 py-px">{KIND_LABEL[d.kind]}</span>
        {d.origin === "cited" && (
          <span className="rounded bg-page px-1.5 py-px">citada{d.cited_ref ? ` de ${d.cited_ref}` : ""}</span>
        )}
        {d.source === "manual" && <span className="text-muted">marcada à mão</span>}
        {d.verified ? (
          <span className="inline-flex items-center gap-1 text-accent">
            <CheckIcon /> trecho conferido no PDF
          </span>
        ) : (
          <span className="text-warn">trecho não encontrado no PDF</span>
        )}
        {d.text_translated && (
          <button type="button" className="underline underline-offset-2" onClick={() => setTranslated(!translated)}>
            {translated ? "Ver original" : "Ver tradução"}
          </button>
        )}
      </div>
      <span className="text-xs text-muted">{d.article.displayTitle}</span>
      <div className="flex flex-wrap gap-2">
        {d.status === "pending" ? (
          <>
            <button type="button" className="btn min-h-8 px-3 text-xs" disabled={pending} onClick={() => run(() => reviewDefinition(d.id, "accepted"))}>
              <CheckIcon /> Aceitar
            </button>
            <button type="button" className="btn min-h-8 px-3 text-xs text-muted" disabled={pending} onClick={() => run(() => reviewDefinition(d.id, "rejected"))}>
              Rejeitar
            </button>
          </>
        ) : (
          <>
            <span className="text-xs font-medium text-accent">Aceita</span>
            {d.source === "manual" ? (
              <button type="button" className="text-xs text-muted underline" disabled={pending} onClick={() => run(() => deleteDefinition(d.id))}>
                Excluir
              </button>
            ) : (
              <button type="button" className="text-xs text-muted underline" disabled={pending} onClick={() => run(() => reviewDefinition(d.id, "pending"))}>
                Desfazer
              </button>
            )}
          </>
        )}
      </div>
      {error && <p className="m-0 text-xs text-warn">{error}</p>}
    </li>
  );
}

function ConceptSection({ c }: { c: GlossaryConcept }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const visible = c.definitions.filter((d) => d.status !== "rejected");
  const rejected = c.definitions.filter((d) => d.status === "rejected");
  const [showRejected, setShowRejected] = useState(false);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 font-article text-xl font-normal">{c.name}</h2>
        <span className="text-xs text-muted">
          {visible.length} {visible.length === 1 ? "definição" : "definições"}
        </span>
      </div>
      {c.notes && <p className="m-0 text-[13px] text-muted">{c.notes}</p>}
      {visible.length === 0 ? (
        <p className="m-0 text-sm text-muted">Nenhuma definição ainda.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {visible.map((d) => (
            <DefinitionItem key={d.id} d={d} />
          ))}
        </ul>
      )}
      {rejected.length > 0 && (
        <button type="button" className="w-fit text-xs text-muted underline" onClick={() => setShowRejected(!showRejected)}>
          {showRejected ? "Esconder" : "Mostrar"} {rejected.length} {rejected.length === 1 ? "rejeitada" : "rejeitadas"}
        </button>
      )}
      {showRejected && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {rejected.map((d) => (
            <DefinitionItem key={d.id} d={d} />
          ))}
        </ul>
      )}
      <div className="flex gap-3 text-xs">
        {confirm ? (
          <>
            <span className="text-warn">
              Remover “{c.name}”{c.definitions.length ? ` e ${c.definitions.length} definições` : ""}?
            </span>
            <button type="button" className="text-warn underline" disabled={pending} onClick={() => start(async () => void (await removeConcept(c.id)))}>
              Remover
            </button>
            <button type="button" className="underline" onClick={() => setConfirm(false)}>
              Manter
            </button>
          </>
        ) : (
          <button type="button" className="text-muted underline" onClick={() => setConfirm(true)}>
            Remover conceito
          </button>
        )}
      </div>
    </section>
  );
}

export function GlossaryView({ projectId, concepts }: { projectId: string; concepts: GlossaryConcept[] }) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex flex-col gap-2 rounded-xl bg-page p-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await addConcept(projectId, name, notes);
            if (r.ok) {
              setName("");
              setNotes("");
              setMsg({ ok: true, text: "Conceito adicionado. Use “Buscar definições” para procurá-lo nos artigos." });
            } else setMsg({ ok: false, text: r.error });
          });
        }}
      >
        <div className="grid grid-cols-1 gap-2 min-[600px]:grid-cols-[220px_1fr_auto]">
          <input
            className="field"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder="Conceito (ex.: resiliência)"
            aria-label="Conceito"
          />
          <input
            className="field"
            value={notes}
            maxLength={500}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Nota opcional (sinônimos, recorte)"
            aria-label="Nota"
          />
          <button type="submit" className="btn btn-primary" disabled={pending || !name.trim()}>
            Adicionar
          </button>
        </div>
        {concepts.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn min-h-9 px-3 text-[13px]"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await requestDefinitions(projectId);
                  setMsg(
                    r.ok
                      ? {
                          ok: true,
                          text: `Busca pedida em ${r.queued} ${r.queued === 1 ? "artigo" : "artigos"}. As definições aparecem aqui em alguns minutos.`,
                        }
                      : { ok: false, text: r.error },
                  );
                })
              }
            >
              Buscar definições nos artigos
            </button>
            <span className="text-xs text-muted">
              Uma chamada à IA por artigo. Não refaz as fichas. Artigos novos já são buscados ao serem extraídos.
            </span>
          </div>
        )}
        {msg && <p className={`m-0 text-sm ${msg.ok ? "text-accent" : "text-warn"}`}>{msg.text}</p>}
      </form>

      {concepts.length === 0 ? (
        <p className="m-0 text-sm text-muted">Nenhum conceito cadastrado.</p>
      ) : (
        concepts.map((c) => <ConceptSection key={c.id} c={c} />)
      )}
    </div>
  );
}
