"use client";

import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import { useState, type ReactNode } from "react";
import { SearchIcon, StarIcon, TagIcon } from "@/components/icons";
import { ReadingQuick, type ReadingState } from "@/components/reading-controls";
import { TONE_CLASS, type StatusTone } from "@/lib/article-status";
import { READING_LABEL, READING_STATUSES, RELEVANCE_LABEL, RELEVANCES } from "@/lib/reading";
import { tagFamily, tagPath, tagTree, type Tag } from "@/lib/tags";

type Item = {
  id: string;
  title: string;
  cite: string;
  statusLabel: string;
  tone: StatusTone;
  reading: ReadingState;
  tagIds: string[];
};

/** "active" = tudo menos os descartados (padrão); "all" = todos. */
type ReadingFilter = "active" | "all" | ReadingState["reading_status"];

const selectClass =
  "min-h-8 min-w-0 cursor-pointer rounded-md border border-line bg-page px-2 text-xs text-ink";

export function ArticleList({
  projectId,
  projectName,
  articles,
  tags,
  uploader,
  backLink,
}: {
  projectId: string;
  projectName: string;
  articles: Item[];
  tags: Tag[];
  uploader: ReactNode;
  backLink: ReactNode;
}) {
  const [q, setQ] = useState("");
  const [reading, setReading] = useState<ReadingFilter>("active");
  const [relevance, setRelevance] = useState("");
  const [starred, setStarred] = useState(false);
  const [tag, setTag] = useState("");
  // Segmentos abaixo de /projects/[id]: ["articles", articleId]
  const segments = useSelectedLayoutSegments();
  const activeId = segments[0] === "articles" ? segments[1] : undefined;

  const term = q.trim().toLowerCase();
  const family = tag ? tagFamily(tag, tags) : null;
  const filtered = articles.filter(
    (a) =>
      (!term || `${a.title} ${a.cite}`.toLowerCase().includes(term)) &&
      (reading === "all"
        ? true
        : reading === "active"
          ? a.reading.reading_status !== "discarded"
          : a.reading.reading_status === reading) &&
      (!relevance || a.reading.relevance === relevance) &&
      (!starred || a.reading.starred) &&
      (!family || a.tagIds.some((t) => family.has(t))),
  );
  const discarded = articles.filter((a) => a.reading.reading_status === "discarded").length;
  const filtering = reading !== "active" || relevance || starred || tag;

  return (
    <>
      <div className="sticky top-0 z-[1] flex flex-col gap-3 border-b border-line bg-surface px-5 py-4">
        <div className="flex min-h-11 items-center gap-1">
          {backLink}
          <h2 className="m-0 min-w-0 flex-1 font-serif text-xl leading-tight font-normal">
            <Link href={`/projects/${projectId}/about`} className="hover:underline" title="Visão do projeto, matriz e exportação">
              {projectName}
            </Link>
          </h2>
          <Link href={`/projects/${projectId}/temas`} className="btn min-h-9 px-3 text-[13px]" title="Temas do projeto">
            <TagIcon size={15} />
            Temas
          </Link>
          <Link href={`/matrix/${projectId}`} className="btn min-h-9 px-3 text-[13px]">
            Matriz
          </Link>
        </div>
        <div className="relative flex gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-page px-3 text-muted">
            <SearchIcon />
            <input
              type="search"
              placeholder="Buscar artigo"
              aria-label="Buscar artigo"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="min-h-[42px] min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
            />
          </label>
          {uploader}
        </div>
        {articles.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtros">
            <select
              aria-label="Situação de leitura"
              className={selectClass}
              value={reading}
              onChange={(e) => setReading(e.target.value as ReadingFilter)}
            >
              <option value="active">Sem descartados</option>
              <option value="all">Todos</option>
              {READING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {READING_LABEL[s]}
                  {s === "discarded" && discarded ? ` (${discarded})` : ""}
                </option>
              ))}
            </select>
            <select
              aria-label="Relevância"
              className={selectClass}
              value={relevance}
              onChange={(e) => setRelevance(e.target.value)}
            >
              <option value="">Relevância</option>
              {RELEVANCES.map((r) => (
                <option key={r} value={r}>
                  {RELEVANCE_LABEL[r]}
                </option>
              ))}
            </select>
            {tags.length > 0 && (
              <select aria-label="Tema" className={`${selectClass} max-w-[10rem]`} value={tag} onChange={(e) => setTag(e.target.value)}>
                <option value="">Tema</option>
                {tagTree(tags).map(({ tag: t }) => (
                  <option key={t.id} value={t.id}>
                    {tagPath(t, tags)}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              aria-pressed={starred}
              onClick={() => setStarred(!starred)}
              className={`flex min-h-8 items-center gap-1 rounded-md border px-2 text-xs ${starred ? "border-warn text-warn" : "border-line text-muted"}`}
            >
              <StarIcon size={14} filled={starred} />
              Prioridade
            </button>
            {filtering && (
              <button
                type="button"
                className="min-h-8 px-1 text-xs text-muted underline underline-offset-2"
                onClick={() => {
                  setReading("active");
                  setRelevance("");
                  setStarred(false);
                  setTag("");
                }}
              >
                Limpar
              </button>
            )}
          </div>
        )}
      </div>

      {filtered.map((a) => {
        const active = a.id === activeId;
        const r = a.reading;
        return (
          <div
            key={a.id}
            className={`flex flex-col gap-1 border-b border-line px-5 py-3.5 ${active ? "bg-tint" : "hover:bg-page"} ${r.reading_status === "discarded" ? "opacity-60" : ""}`}
          >
            <Link
              href={`/projects/${projectId}/articles/${a.id}`}
              aria-current={active ? "page" : undefined}
              className="flex flex-col gap-1.5"
            >
              <span className="font-article text-base leading-[1.3]">{a.title}</span>
              <span className="flex justify-between gap-3 text-[13px] text-muted">
                <span>
                  {a.cite}
                  {r.relevance && <span className="ml-2 text-xs font-medium text-accent">{RELEVANCE_LABEL[r.relevance]}</span>}
                </span>
                <span className={`text-xs font-medium ${TONE_CLASS[a.tone]}`}>{a.statusLabel}</span>
              </span>
            </Link>
            {/* key: volta ao valor do servidor quando ele muda (ex.: alterado na ficha). */}
            <ReadingQuick key={`${r.reading_status}-${r.starred}`} articleId={a.id} initial={r} />
          </div>
        );
      })}

      {filtered.length === 0 && (
        <p className="m-0 px-5 py-6 text-sm text-muted">
          {articles.length === 0
            ? "Nenhum artigo neste projeto. Envie PDFs no botão +."
            : filtering || term
              ? "Nenhum artigo com esses filtros."
              : `${discarded === 1 ? "O único artigo está descartado" : "Os artigos estão descartados"}. Escolha “Descartado” no filtro para vê-los.`}
        </p>
      )}
    </>
  );
}
