import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CitationTabs } from "@/components/citation-tabs";
import { BackIcon, CheckIcon, FileIcon, LinkIcon } from "@/components/icons";
import { articleStatus, IN_PROGRESS, TONE_CLASS } from "@/lib/article-status";
import { requireUser } from "@/lib/auth";
import { allReferences, fullName, isArticleNumber, parseAuthors } from "@/lib/citation";
import { createClient } from "@/lib/supabase/server";
import { NotesField } from "./notes-field";

type Props = PageProps<"/projects/[id]/articles/[articleId]">;

type Field = {
  key: string;
  value: string;
  quote: string | null;
  pdf_page: number | null;
  printed_page: string | null;
  verified: boolean;
  source: string;
};

const LABEL: Record<string, string> = {
  abstract: "Resumo",
  subject: "Assunto",
  objective: "Objetivo",
  method: "Método",
  results: "Resultados",
  conclusions: "Conclusões",
};

function languageName(code: string | null): string | null {
  if (!code) return null;
  try {
    const name = new Intl.DisplayNames(["pt-BR"], { type: "language" }).of(code);
    return name ? name[0].toUpperCase() + name.slice(1) : code;
  } catch {
    return code.toUpperCase();
  }
}

/** Trecho do artigo que sustenta o campo, com a página e se foi conferido no PDF. */
function Evidence({ field, articleId }: { field: Field; articleId: string }) {
  if (!field.quote) return null;
  const page = field.printed_page ?? field.pdf_page;
  return (
    <figure className="m-0 flex flex-col gap-2 border-l-2 border-line pl-4">
      <blockquote className="m-0 font-serif text-[15px] leading-[1.55] text-muted italic">“{field.quote}”</blockquote>
      <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {field.pdf_page ? (
          <Link href={`/viewer/${articleId}?p=${field.pdf_page}`} className="font-medium text-ink underline-offset-2 hover:underline">
            p. {page}
          </Link>
        ) : null}
        {field.verified ? (
          <span className="inline-flex items-center gap-1 text-accent">
            <CheckIcon /> trecho conferido no PDF
          </span>
        ) : (
          <span className="text-warn">
            {field.pdf_page ? "o valor tem números que não estão no trecho" : "trecho não encontrado no PDF"} · revisar
          </span>
        )}
      </figcaption>
    </figure>
  );
}

function FieldCard({ field, articleId }: { field: Field; articleId: string }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line p-5">
      <h3 className="eyebrow">{LABEL[field.key]}</h3>
      <p className="m-0 font-serif text-[17px] leading-[1.6] text-pretty">{field.value}</p>
      <Evidence field={field} articleId={articleId} />
    </section>
  );
}

async function Ficha({ params }: Pick<Props, "params">) {
  const { id, articleId } = await params;
  await requireUser();
  const supabase = await createClient();

  const [{ data: a }, { data: fieldRows }] = await Promise.all([
    supabase
      .from("articles")
      .select(
        "id, title, subtitle, original_filename, authors, year, venue, volume, issue, pages, doi, language, metadata_source, source_url, status, page_count, error, notes, citekey",
      )
      .eq("id", articleId)
      .eq("project_id", id)
      .maybeSingle(),
    supabase
      .from("article_fields")
      .select("key, value, quote, pdf_page, printed_page, verified, source")
      .eq("article_id", articleId),
  ]);
  if (!a) notFound();

  const fields = new Map((fieldRows ?? []).map((f) => [f.key, f as Field]));
  const status = articleStatus(a.status);
  const authors = parseAuthors(a.authors);
  const refs = allReferences(a);
  const language = languageName(a.language);
  const working = IN_PROGRESS.has(a.status);
  const abstract = fields.get("abstract");
  const subject = fields.get("subject");
  const body = (["objective", "method", "results", "conclusions"] as const).flatMap((k) => fields.get(k) ?? []);
  const unverified = [...fields.values()].filter((f) => !f.verified).length;

  const where = [
    a.venue,
    a.volume && `v. ${a.volume}`,
    a.issue && `n. ${a.issue}`,
    a.pages && (isArticleNumber(a.pages) ? `art. ${a.pages}` : `p. ${a.pages}`),
    a.year,
  ].filter(Boolean);

  return (
    <div data-pane="detail" className="mx-auto flex w-full max-w-[780px] flex-col gap-9 px-8 pt-5 pb-14 max-[860px]:px-5">
      <header className="flex flex-col gap-4">
        <div className="flex min-h-11 items-center justify-between">
          <Link href={`/projects/${id}`} className="icon-btn fx-back -ml-3" aria-label="Voltar aos artigos">
            <BackIcon />
          </Link>
          <span className={`ml-auto rounded-full bg-page px-3 py-1 text-xs font-medium ${TONE_CLASS[status.tone]}`}>
            {status.label}
          </span>
        </div>

        {(where.length > 0 || language) && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
            {where.length > 0 && <span>{where.join(" · ")}</span>}
            {language && (
              <span className="rounded-md border border-line px-1.5 py-px text-[11px] font-medium tracking-wide uppercase">
                {language}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h1 className="m-0 font-serif text-[34px] leading-[1.15] font-normal tracking-[-0.01em] text-pretty max-[860px]:text-[28px]">
            {a.title ?? a.original_filename ?? "Sem título"}
          </h1>
          {a.subtitle && (
            <p className="m-0 font-serif text-xl leading-snug text-muted text-pretty">{a.subtitle}</p>
          )}
        </div>

        {authors.length > 0 ? (
          <p className="m-0 text-[15px] leading-relaxed">{authors.map(fullName).join(", ")}</p>
        ) : (
          !working && <p className="m-0 text-sm text-muted">Autores não identificados.</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {a.doi && (
            <a href={`https://doi.org/${a.doi}`} target="_blank" rel="noreferrer" className="btn min-h-9 px-3 text-[13px]">
              DOI {a.doi}
            </a>
          )}
          {a.page_count ? (
            <Link href={`/viewer/${a.id}`} className="btn min-h-9 px-3 text-[13px]">
              <FileIcon size={16} />
              PDF · {a.page_count} p.
            </Link>
          ) : null}
          {a.source_url && (
            <a href={a.source_url} target="_blank" rel="noreferrer" className="btn min-h-9 px-3 text-[13px]">
              <LinkIcon />
              Origem
            </a>
          )}
          {a.metadata_source && (
            <span className="text-xs text-muted">
              {a.metadata_source === "crossref"
                ? "Metadados confirmados no Crossref"
                : a.metadata_source === "llm"
                  ? "Metadados lidos do PDF (sem confirmação no Crossref)"
                  : "Metadados informados à mão"}
            </span>
          )}
        </div>
        {a.error && !working && <p className="m-0 text-sm text-warn">{a.error}</p>}
      </header>

      {working && (
        <section className="flex flex-col gap-2 rounded-xl bg-page p-5">
          <h2 className="eyebrow">Ficha</h2>
          <p className="m-0 font-serif text-lg leading-normal text-muted">
            {a.status === "uploaded"
              ? "Na fila. O texto do PDF é lido em até um minuto."
              : "Lendo o artigo: título, autores, resumo, objetivo, método, resultados e conclusões aparecem aqui em um ou dois minutos."}
          </p>
        </section>
      )}

      {subject && (
        <section className="flex flex-col gap-2 rounded-xl bg-tint p-5">
          <h2 className="eyebrow">Assunto</h2>
          <p className="m-0 font-serif text-xl leading-snug text-pretty">{subject.value}</p>
          <Evidence field={subject} articleId={a.id} />
        </section>
      )}

      {abstract && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="eyebrow">Resumo</h2>
            <span className="text-xs text-muted">{abstract.source === "author" ? "do autor" : "escrito pela IA"}</span>
          </div>
          <p className="m-0 font-serif text-[17px] leading-[1.65] text-pretty whitespace-pre-line">{abstract.value}</p>
          {abstract.source !== "author" && <Evidence field={abstract} articleId={a.id} />}
          {abstract.source === "author" && !abstract.verified && (
            <p className="m-0 text-xs text-warn">Não foi possível localizar este resumo no texto do PDF · revisar</p>
          )}
        </section>
      )}

      {body.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="eyebrow">Ficha</h2>
            {unverified > 0 ? (
              <span className="text-xs text-warn">
                {unverified} {unverified === 1 ? "campo precisa" : "campos precisam"} de revisão
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-accent">
                <CheckIcon /> todos os trechos conferidos no PDF
              </span>
            )}
          </div>
          {body.map((f) => (
            <FieldCard key={f.key} field={f} articleId={a.id} />
          ))}
        </section>
      )}

      {!working && fields.size === 0 && (
        <section className="flex flex-col gap-2 rounded-xl bg-page p-5">
          <h2 className="eyebrow">Ficha</h2>
          <p className="m-0 text-sm text-muted">
            {a.status === "needs_ocr"
              ? "O PDF não tem texto (parece escaneado). A extração precisa de OCR, que ainda não existe."
              : "A ficha não foi gerada."}
          </p>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-xl bg-page p-5">
        <h2 className="eyebrow">Como citar</h2>
        {refs ? (
          <CitationTabs refs={refs} />
        ) : (
          <p className="m-0 text-sm text-muted">
            {working
              ? "A referência aparece quando os metadados forem lidos."
              : "Faltam autor, título ou ano para montar a referência."}
          </p>
        )}
      </section>

      <NotesField articleId={a.id} initial={a.notes ?? ""} />
    </div>
  );
}

export default function ArticlePage(props: Props) {
  return (
    <Suspense fallback={<p data-pane="detail" className="m-0 p-8 text-sm text-muted">Carregando…</p>}>
      <Ficha params={props.params} />
    </Suspense>
  );
}
