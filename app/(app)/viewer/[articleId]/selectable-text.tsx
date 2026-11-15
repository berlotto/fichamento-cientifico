"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { normalizeSelection } from "@/lib/quotes";
import { saveQuote } from "./actions";

type Anchor = { top: number; left: number; text: string };

/**
 * Texto da página com "Guardar citação" para o trecho selecionado (spec 002).
 * Funciona com mouse e com toque: o botão aparece abaixo da seleção, longe do
 * menu nativo do celular, que fica acima.
 */
export function SelectableText({
  articleId,
  page,
  fichaHref,
  children,
}: {
  articleId: string;
  page: number;
  fichaHref: string;
  children: ReactNode;
}) {
  const box = useRef<HTMLPreElement>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const track = useCallback(() => {
    const sel = window.getSelection();
    const el = box.current;
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !el) return setAnchor(null);
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return setAnchor(null);
    const text = sel.toString();
    if (!text.trim()) return setAnchor(null);
    const rect = range.getBoundingClientRect();
    const width = 172;
    setAnchor({
      text,
      top: Math.min(rect.bottom + 8, window.innerHeight - 52),
      left: Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8)),
    });
  }, []);

  // O aviso de sucesso some sozinho: a tela fica guardada entre navegações e
  // não deve reaparecer ao voltar ao visualizador.
  useEffect(() => {
    if (!result?.ok) return;
    const t = setTimeout(() => setResult(null), 6000);
    return () => clearTimeout(t);
  }, [result]);

  useEffect(() => {
    document.addEventListener("selectionchange", track);
    window.addEventListener("scroll", track, true);
    window.addEventListener("resize", track);
    return () => {
      document.removeEventListener("selectionchange", track);
      window.removeEventListener("scroll", track, true);
      window.removeEventListener("resize", track);
    };
  }, [track]);

  function open() {
    if (!anchor) return;
    setDraft(anchor.text);
    setComment("");
    setResult(null);
    setAnchor(null);
    window.getSelection()?.removeAllRanges();
  }

  function save() {
    if (draft == null) return;
    startTransition(async () => {
      const r = await saveQuote(articleId, page, draft, comment);
      if (r.ok) {
        setDraft(null);
        setResult({ ok: true, msg: "Citação guardada." });
        router.refresh();
      } else {
        setResult({ ok: false, msg: r.error });
      }
    });
  }

  return (
    <>
      <pre
        ref={box}
        className="min-h-[75vh] overflow-auto rounded-lg border border-line bg-surface p-4 font-mono text-xs whitespace-pre-wrap select-text"
      >
        {children}
      </pre>

      {anchor && draft == null && (
        <button
          type="button"
          className="btn btn-primary fixed z-30 min-h-10 w-[172px] px-3 text-[13px] shadow-lg"
          style={{ top: anchor.top, left: anchor.left }}
          // Não deixa o toque/clique desfazer a seleção antes do clique valer.
          onPointerDown={(e) => e.preventDefault()}
          onClick={open}
        >
          Guardar citação
        </button>
      )}

      {(draft != null || result) && (
        <div
          role="dialog"
          aria-label="Guardar citação"
          className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-[560px] flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-xl"
        >
          {draft != null ? (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="m-0 text-sm font-medium">Guardar citação</h2>
                <span className="text-xs text-muted">PDF p. {page}</span>
              </div>
              <blockquote className="m-0 max-h-40 overflow-auto border-l-2 border-accent pl-3 font-article text-[15px] leading-normal">
                {normalizeSelection(draft)}
              </blockquote>
              <label htmlFor="fx-quote-comment" className="text-[13px] font-medium">
                Comentário <span className="font-normal text-muted">(opcional)</span>
              </label>
              <textarea
                id="fx-quote-comment"
                rows={2}
                value={comment}
                maxLength={2000}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Por que este trecho importa para a sua pesquisa"
                className="field resize-y p-2.5 text-sm"
              />
              {result && !result.ok && <p className="m-0 text-sm text-warn">{result.msg}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn min-h-10 px-3 text-[13px]"
                  onClick={() => {
                    setDraft(null);
                    setResult(null);
                  }}
                >
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary min-h-10 px-3 text-[13px]" disabled={pending} onClick={save}>
                  {pending ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p aria-live="polite" className={`m-0 text-sm ${result?.ok ? "text-accent" : "text-warn"}`}>
                {result?.msg}
              </p>
              <div className="flex gap-2">
                <Link
                  href={`${fichaHref}#citacoes`}
                  className="btn min-h-10 px-3 text-[13px]"
                  onClick={() => setResult(null)}
                >
                  Ver na ficha
                </Link>
                <button type="button" className="btn min-h-10 px-3 text-[13px]" onClick={() => setResult(null)}>
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
