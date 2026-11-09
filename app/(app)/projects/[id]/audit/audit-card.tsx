"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitAudit } from "../articles/[articleId]/actions";
import { viewerHref } from "../articles/[articleId]/field-review";

export type AuditItem = {
  articleId: string;
  key: string;
  label: string;
  definition: string;
  cite: string;
  title: string;
  value: string;
  quote: string | null;
  quote_translated: string | null;
  pdf_page: number | null;
  printed_page: string | null;
};

/**
 * Auditoria às cegas: primeiro a pessoa lê o trecho e escreve a própria leitura,
 * sem ver o valor aprovado; depois o valor aparece e ela diz se está certo.
 */
export function AuditCard({ item, remaining }: { item: AuditItem; remaining: number }) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [original, setOriginal] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const decide = (result: "correct" | "incorrect") =>
    start(async () => {
      const r = await submitAudit(item.articleId, item.key, answer, result);
      if (!r.ok) return setMsg(r.error ?? "Erro");
      setAnswer("");
      setRevealed(false);
      setOriginal(false);
      router.refresh();
    });

  const shownQuote = item.quote_translated && !original ? item.quote_translated : item.quote;

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-line p-6">
      <span className="text-xs text-muted">
        {remaining} {remaining === 1 ? "item" : "itens"} na fila
      </span>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted">{item.cite}</span>
        <h2 className="m-0 font-article text-xl leading-snug font-normal">{item.title}</h2>
      </div>

      <div className="flex flex-col gap-1">
        <span className="eyebrow">{item.label}</span>
        <p className="m-0 text-[13px] text-muted">{item.definition}</p>
      </div>

      {shownQuote && (
        <figure className="m-0 flex flex-col gap-2 border-l-2 border-line pl-4">
          <blockquote className="m-0 font-article text-[16px] leading-[1.55] italic">“{shownQuote}”</blockquote>
          <figcaption className="flex flex-wrap items-center gap-x-3 text-xs">
            {item.quote_translated && (
              <button
                type="button"
                className="font-medium underline underline-offset-2"
                onClick={() => setOriginal(!original)}
              >
                {original ? "Ver tradução" : "Ver origem"}
              </button>
            )}
            {item.pdf_page ? (
              <Link
                href={viewerHref(item.articleId, item.pdf_page, item.quote)}
                className="underline-offset-2 hover:underline"
              >
                p. {item.printed_page ?? item.pdf_page}
              </Link>
            ) : null}
          </figcaption>
        </figure>
      )}

      {!revealed ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setRevealed(true);
          }}
        >
          <label htmlFor="fx-audit-answer" className="label">
            Pelo trecho (e pelo PDF, se precisar), o que deveria estar neste campo?
          </label>
          <textarea
            id="fx-audit-answer"
            rows={4}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="field font-article resize-y p-3 text-[15px] leading-normal"
            placeholder="Escreva com suas palavras. Isso fica registrado junto com a auditoria."
          />
          <button type="submit" className="btn btn-primary self-end" disabled={!answer.trim()}>
            Revelar o valor aprovado
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 rounded-lg bg-page p-4">
            <span className="text-xs text-muted">Valor aprovado automaticamente</span>
            <p className="m-0 font-article text-[17px] leading-[1.6]">{item.value}</p>
          </div>
          <p className="m-0 text-sm">Comparando com a sua leitura: o valor aprovado está certo e completo?</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" disabled={pending} onClick={() => decide("correct")}>
              Está certo
            </button>
            <button
              type="button"
              className="btn border-warn text-warn"
              disabled={pending}
              onClick={() => decide("incorrect")}
            >
              Está errado (volta para revisão)
            </button>
          </div>
        </div>
      )}
      {msg && <p className="m-0 text-sm text-warn">{msg}</p>}
    </section>
  );
}
