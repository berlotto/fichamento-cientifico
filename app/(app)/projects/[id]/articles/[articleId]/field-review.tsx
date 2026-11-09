"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CheckIcon } from "@/components/icons";
import { editField, reviewField } from "./actions";

export type ReviewField = {
  key: string;
  value: string;
  quote: string | null;
  pdf_page: number | null;
  printed_page: string | null;
  verified: boolean;
  source: string;
  status: string;
  edited: boolean;
};

/** Link para o visualizador na página do trecho, com o trecho destacado. */
export const viewerHref = (articleId: string, page: number, quote: string | null) =>
  `/viewer/${articleId}?p=${page}${quote ? `&q=${encodeURIComponent(quote.slice(0, 300))}#trecho` : ""}`;

export function Evidence({ field, articleId }: { field: ReviewField; articleId: string }) {
  if (!field.quote) return null;
  const page = field.printed_page ?? field.pdf_page;
  return (
    <figure className="m-0 flex flex-col gap-2 border-l-2 border-line pl-4">
      <blockquote className="m-0 font-article text-[15px] leading-[1.55] text-muted italic">“{field.quote}”</blockquote>
      <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {field.pdf_page ? (
          <Link
            href={viewerHref(articleId, field.pdf_page, field.quote)}
            className="font-medium text-ink underline-offset-2 hover:underline"
          >
            p. {page}
          </Link>
        ) : null}
        {field.verified ? (
          <span className="inline-flex items-center gap-1 text-accent">
            <CheckIcon /> trecho conferido no PDF
          </span>
        ) : (
          <span className="text-warn">
            {field.pdf_page ? "o valor tem números que não estão no trecho" : "trecho não encontrado no PDF"}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  accepted: { text: "Aceito", cls: "text-accent" },
  rejected: { text: "Rejeitado", cls: "text-muted" },
  pending: { text: "A revisar", cls: "text-warn" },
};

/**
 * Campo da ficha com revisão: aceitar, editar (valor e trecho, que é conferido de
 * novo no PDF) ou rejeitar. Rejeitado fica recolhido, com opção de desfazer.
 */
export function FieldReview({
  field,
  label,
  articleId,
  variant = "card",
}: {
  field: ReviewField;
  label: string;
  articleId: string;
  variant?: "card" | "plain";
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(field.value);
  const [quote, setQuote] = useState(field.quote ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const st = STATUS_LABEL[field.status] ?? STATUS_LABEL.pending;

  const run = (fn: () => Promise<{ ok: boolean; error?: string; verified?: boolean }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? null : (r.error ?? "Erro"));
      if (r.ok) after?.();
    });

  const box = variant === "card" ? "rounded-xl border border-line p-5" : "";

  if (field.status === "rejected" && !editing) {
    return (
      <section className={`flex items-center justify-between gap-3 ${box} ${variant === "card" ? "py-3" : ""}`}>
        <span className="text-sm text-muted">
          <span className="eyebrow mr-2">{label}</span> rejeitado
        </span>
        <button
          type="button"
          className="text-[13px] text-muted underline"
          disabled={pending}
          onClick={() => run(() => reviewField(articleId, field.key, "pending"))}
        >
          Desfazer
        </button>
      </section>
    );
  }

  return (
    <section className={`flex flex-col gap-3 ${box}`} aria-busy={pending}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="eyebrow">{label}</h3>
        <span className={`text-xs font-medium ${st.cls}`}>
          {st.text}
          {field.edited ? " · editado" : ""}
          {field.source === "author" ? " · do autor" : ""}
        </span>
      </div>

      {editing ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => editField(articleId, field.key, value, quote), () => setEditing(false));
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="label">Valor</span>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={Math.min(12, Math.max(3, Math.ceil(value.length / 90)))}
              className="field resize-y p-3 font-article text-[16px] leading-normal"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Trecho do artigo que sustenta o valor (copie do PDF)</span>
            <textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              rows={3}
              className="field resize-y p-3 text-sm leading-normal italic"
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="btn" onClick={() => setEditing(false)} disabled={pending}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? "Conferindo…" : "Salvar e aceitar"}
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="m-0 font-article text-[17px] leading-[1.6] text-pretty whitespace-pre-line">{field.value}</p>
          {field.source === "author" ? (
            !field.verified && (
              <p className="m-0 text-xs text-warn">Não foi possível localizar este resumo no texto do PDF.</p>
            )
          ) : (
            <Evidence field={field} articleId={articleId} />
          )}
          <div className="flex flex-wrap gap-2">
            {field.status !== "accepted" && (
              <button
                type="button"
                className="btn min-h-9 px-3 text-[13px]"
                disabled={pending}
                onClick={() => run(() => reviewField(articleId, field.key, "accepted"))}
              >
                <CheckIcon /> Aceitar
              </button>
            )}
            <button type="button" className="btn min-h-9 px-3 text-[13px]" disabled={pending} onClick={() => setEditing(true)}>
              Editar
            </button>
            {field.status !== "rejected" && (
              <button
                type="button"
                className="btn min-h-9 px-3 text-[13px] text-muted"
                disabled={pending}
                onClick={() => run(() => reviewField(articleId, field.key, "rejected"))}
              >
                Rejeitar
              </button>
            )}
            {field.status === "accepted" && (
              <button
                type="button"
                className="min-h-9 px-2 text-[13px] text-muted underline"
                disabled={pending}
                onClick={() => run(() => reviewField(articleId, field.key, "pending"))}
              >
                Desfazer
              </button>
            )}
          </div>
        </>
      )}
      {msg && <p className="m-0 text-sm text-warn">{msg}</p>}
    </section>
  );
}
