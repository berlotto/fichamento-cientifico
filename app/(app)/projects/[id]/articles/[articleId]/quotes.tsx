"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { CopyButton } from "@/components/copy-button";
import { TagPicker } from "@/components/tag-picker";
import { directQuote, inTextCite, type CitableArticle, type InTextStyle } from "@/lib/citation";
import { deleteQuote, saveQuoteComment } from "./actions";

export type QuoteItem = {
  id: string;
  text: string;
  pdf_page: number;
  printed_page: string | null;
  comment: string | null;
};

const STYLES: { style: InTextStyle; label: string }[] = [
  { style: "abnt", label: "ABNT" },
  { style: "apa", label: "APA" },
  { style: "vancouver", label: "Vancouver" },
];

function QuoteCard({
  quote,
  article,
  articleId,
  style,
}: {
  quote: QuoteItem;
  article: CitableArticle;
  articleId: string;
  style: InTextStyle;
}) {
  const [saved, setSaved] = useState(quote.comment ?? "");
  const [comment, setComment] = useState(quote.comment ?? "");
  const [msg, setMsg] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  // Sem página impressa, cita a do PDF e avisa: a ABNT pede a página do documento.
  const page = quote.printed_page ?? String(quote.pdf_page);
  const cite = inTextCite(article, page, style);
  const copyText = cite ? directQuote(quote.text, cite, style) : `“${quote.text}”`;
  const fieldId = `fx-quote-${quote.id}`;

  function saveComment() {
    if (comment === saved) return;
    startTransition(async () => {
      const r = await saveQuoteComment(quote.id, comment);
      if (r.ok) setSaved(comment);
      setMsg(r.ok ? "Salvo" : (r.error ?? "Não foi possível salvar"));
    });
  }

  function remove() {
    startTransition(async () => {
      const r = await deleteQuote(quote.id);
      if (!r.ok) {
        setMsg(r.error ?? "Não foi possível excluir");
        setConfirming(false);
      }
    });
  }

  return (
    <li className="flex flex-col gap-2.5 border-b border-line pb-5 last:border-b-0 last:pb-0">
      <blockquote className="m-0 font-article text-[17px] leading-[1.55] text-pretty">“{quote.text}”</blockquote>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
        <span className="font-medium text-accent">{cite ?? "Faltam autor ou ano para a chamada"}</span>
        {!quote.printed_page && (
          <span className="text-xs text-warn">Página do PDF: a página impressa não foi identificada</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CopyButton text={copyText} />
        <Link
          href={`/viewer/${articleId}?p=${quote.pdf_page}&c=${quote.id}#trecho`}
          className="btn min-h-9 px-3 text-[13px]"
        >
          Ver no PDF
        </Link>
        {confirming ? (
          <>
            <button type="button" className="btn min-h-9 px-3 text-[13px] text-warn" disabled={pending} onClick={remove}>
              {pending ? "Excluindo…" : "Confirmar exclusão"}
            </button>
            <button type="button" className="btn min-h-9 px-3 text-[13px]" onClick={() => setConfirming(false)}>
              Manter
            </button>
          </>
        ) : (
          <button type="button" className="btn min-h-9 px-3 text-[13px]" onClick={() => setConfirming(true)}>
            Excluir
          </button>
        )}
      </div>
      <TagPicker quoteId={quote.id} />
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={fieldId} className="text-xs font-medium text-muted">
            Comentário
          </label>
          <span aria-live="polite" className="text-xs text-muted">
            {pending && !confirming ? "Salvando…" : comment !== saved ? "" : msg}
          </span>
        </div>
        <textarea
          id={fieldId}
          rows={1}
          value={comment}
          maxLength={2000}
          onChange={(e) => setComment(e.target.value)}
          onBlur={saveComment}
          placeholder="Por que este trecho importa"
          className="field resize-y p-2.5 text-sm"
        />
      </div>
    </li>
  );
}

/**
 * Citações marcadas à mão no texto do PDF (spec 002), em ordem de página, com
 * a citação direta pronta na norma escolhida.
 */
export function Quotes({
  articleId,
  article,
  quotes,
  initialStyle,
  canSelect,
}: {
  articleId: string;
  article: CitableArticle;
  quotes: QuoteItem[];
  initialStyle: InTextStyle;
  canSelect: boolean;
}) {
  const [style, setStyle] = useState<InTextStyle>(initialStyle);
  const section = useRef<HTMLElement>(null);

  // A ficha rola dentro do próprio painel e chega depois do Suspense: o
  // navegador não acha a âncora sozinho ao vir de "Ver na ficha".
  useEffect(() => {
    if (window.location.hash === "#citacoes") section.current?.scrollIntoView({ block: "start" });
  }, []);

  return (
    <section ref={section} id="citacoes" className="flex scroll-mt-6 flex-col gap-4" aria-labelledby="fx-citacoes">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="fx-citacoes" className="eyebrow">
          Minhas citações{quotes.length > 0 && <span className="ml-1.5 font-normal text-muted">{quotes.length}</span>}
        </h2>
        {quotes.length > 0 && (
          <div className="segmented [&>button]:min-h-8 [&>button]:px-3 [&>button]:text-[13px]" role="group" aria-label="Norma da chamada">
            {STYLES.map((s) => (
              <button key={s.style} type="button" aria-pressed={s.style === style} onClick={() => setStyle(s.style)}>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {style === "vancouver" && quotes.length > 0 && (
        <p className="m-0 text-xs text-muted">Troque “n” pelo número do artigo na sua lista de referências.</p>
      )}
      {quotes.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-5 p-0">
          {quotes.map((q) => (
            <QuoteCard key={q.id} quote={q} article={article} articleId={articleId} style={style} />
          ))}
        </ul>
      ) : (
        <p className="m-0 text-sm text-muted">
          {canSelect ? (
            <>
              Trechos que você quer citar e que a ficha não pegou. Abra o{" "}
              <Link href={`/viewer/${articleId}`} className="text-ink underline underline-offset-2">
                texto do PDF
              </Link>
              , selecione o trecho e use “Guardar citação”. A página vai junto.
            </>
          ) : (
            "As citações ficam disponíveis quando o texto do PDF for lido."
          )}
        </p>
      )}
    </section>
  );
}
