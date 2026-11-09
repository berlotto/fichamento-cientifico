import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CitationTabs } from "@/components/citation-tabs";
import { BackIcon, CheckIcon, FileIcon, LinkIcon } from "@/components/icons";
import { articleStatus, IN_PROGRESS, TONE_CLASS } from "@/lib/article-status";
import { preferredCitationStyle, requireUser } from "@/lib/auth";
import { allReferences, authorLines, displayTitle, fullName, isArticleNumber, parseAuthors } from "@/lib/citation";
import { fieldDefs } from "@/lib/fields";
import { createClient } from "@/lib/supabase/server";
import { ArticleTools } from "./article-tools";
import { FieldReview, type ReviewField } from "./field-review";
import { DetailSkeleton } from "@/components/skeletons";
import { NotesField } from "./notes-field";

type Props = PageProps<"/projects/[id]/articles/[articleId]">;

function languageName(code: string | null): string | null {
  if (!code) return null;
  try {
    const name = new Intl.DisplayNames(["pt-BR"], { type: "language" }).of(code);
    return name ? name[0].toUpperCase() + name.slice(1) : code;
  } catch {
    return code.toUpperCase();
  }
}

const usd = (n: number) =>
  n < 0.01 ? `US$ ${n.toFixed(4)}` : n.toLocaleString("pt-BR", { style: "currency", currency: "USD" });

async function Ficha({ params }: Pick<Props, "params">) {
  const { id, articleId } = await params;
  await requireUser();
  const supabase = await createClient();

  const [{ data: a }, { data: fieldRows }, { data: custom }, { data: runs }] = await Promise.all([
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
      .select("key, value, quote, quote_translated, source_value, pdf_page, printed_page, verified, source, status, edited, value_b, agrees, supported, from_study, judge_note, auto_approved")
      .eq("article_id", articleId),
    supabase.from("project_fields").select("key, label").eq("project_id", id).order("position"),
    supabase.from("llm_runs").select("cost_usd").eq("article_id", articleId),
  ]);
  if (!a) notFound();

  const fields = new Map((fieldRows ?? []).map((f) => [f.key, f as ReviewField]));
  const defs = fieldDefs(custom ?? []);
  const status = articleStatus(a.status);
  const authors = parseAuthors(a.authors);
  const refs = allReferences(a);
  const citationStyle = await preferredCitationStyle();
  const language = languageName(a.language);
  const working = IN_PROGRESS.has(a.status);
  const abstract = fields.get("abstract");
  const subject = fields.get("subject");
  const body = defs
    .filter((d) => d.key !== "abstract" && d.key !== "subject")
    .flatMap((d) => (fields.has(d.key) ? [{ def: d, field: fields.get(d.key)! }] : []));
  const toReview = [...fields.values()].filter((f) => f.status === "pending").length;
  const cost = (runs ?? []).reduce((s, r) => s + Number(r.cost_usd ?? 0), 0);

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
          <h1 className="m-0 font-article text-[34px] leading-[1.15] font-normal tracking-[-0.01em] text-pretty max-[860px]:text-[28px]">
            {displayTitle(a) ?? a.original_filename ?? "Sem título"}
          </h1>
          {a.subtitle && <p className="m-0 font-article text-xl leading-snug text-muted text-pretty">{a.subtitle}</p>}
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
                  : "Metadados corrigidos à mão"}
            </span>
          )}
        </div>
        {a.error && !working && <p className="m-0 text-sm text-warn">{a.error}</p>}

        <ArticleTools
          projectId={id}
          articleId={a.id}
          canReextract={!working && (a.page_count ?? 0) > 0}
          metadata={{
            title: a.title ?? "",
            subtitle: a.subtitle ?? "",
            authors: authorLines(a.authors),
            year: a.year ? String(a.year) : "",
            venue: a.venue ?? "",
            volume: a.volume ?? "",
            issue: a.issue ?? "",
            pages: a.pages ?? "",
            doi: a.doi ?? "",
            language: a.language ?? "",
          }}
        />
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
        <div className="rounded-xl bg-tint p-5">
          <FieldReview field={subject} label="Assunto" articleId={a.id} variant="plain" />
        </div>
      )}

      {abstract && <FieldReview field={abstract} label="Resumo" articleId={a.id} variant="plain" />}

      {body.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="eyebrow">Ficha</h2>
            {toReview > 0 ? (
              <span className="text-xs text-warn">
                {toReview} {toReview === 1 ? "campo a revisar" : "campos a revisar"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-accent">
                <CheckIcon /> ficha revisada
              </span>
            )}
          </div>
          {body.map(({ def, field }) => (
            <FieldReview key={def.key} field={field} label={def.label} articleId={a.id} />
          ))}
        </section>
      )}

      {!working && fields.size === 0 && (
        <section className="flex flex-col gap-2 rounded-xl bg-page p-5">
          <h2 className="eyebrow">Ficha</h2>
          <p className="m-0 text-sm text-muted">
            {a.status === "needs_ocr"
              ? "O PDF não tem texto (parece escaneado). A extração precisa de OCR, que ainda não existe."
              : "A ficha não foi gerada. Use “Extrair de novo”."}
          </p>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-xl bg-page p-5">
        <h2 className="eyebrow">Como citar</h2>
        {refs ? (
          <CitationTabs refs={refs} initial={citationStyle} />
        ) : (
          <p className="m-0 text-sm text-muted">
            {working
              ? "A referência aparece quando os metadados forem lidos."
              : "Faltam autor, título ou ano para montar a referência. Use “Corrigir dados”."}
          </p>
        )}
      </section>

      <NotesField articleId={a.id} initial={a.notes ?? ""} />

      {cost > 0 && <p className="m-0 text-xs text-muted">Custo da extração: {usd(cost)}</p>}
    </div>
  );
}

export default function ArticlePage(props: Props) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Ficha params={props.params} />
    </Suspense>
  );
}
