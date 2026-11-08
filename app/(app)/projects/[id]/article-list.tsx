"use client";

import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import { useState, type ReactNode } from "react";
import { SearchIcon } from "@/components/icons";
import { TONE_CLASS, type StatusTone } from "@/lib/article-status";

type Item = { id: string; title: string; cite: string; statusLabel: string; tone: StatusTone };

export function ArticleList({
  projectId,
  projectName,
  articles,
  uploader,
  backLink,
}: {
  projectId: string;
  projectName: string;
  articles: Item[];
  uploader: ReactNode;
  backLink: ReactNode;
}) {
  const [q, setQ] = useState("");
  // Segmentos abaixo de /projects/[id]: ["articles", articleId]
  const segments = useSelectedLayoutSegments();
  const activeId = segments[0] === "articles" ? segments[1] : undefined;

  const term = q.trim().toLowerCase();
  const filtered = articles.filter((a) => !term || `${a.title} ${a.cite}`.toLowerCase().includes(term));

  return (
    <>
      <div className="sticky top-0 z-[1] flex flex-col gap-3 border-b border-line bg-surface px-5 py-4">
        <div className="flex min-h-11 items-center gap-1">
          {backLink}
          <h2 className="m-0 min-w-0 flex-1 font-serif text-xl leading-tight font-normal">{projectName}</h2>
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
      </div>

      {filtered.map((a) => {
        const active = a.id === activeId;
        return (
          <Link
            key={a.id}
            href={`/projects/${projectId}/articles/${a.id}`}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col gap-1.5 border-b border-line px-5 py-4 ${active ? "bg-tint" : "hover:bg-page"}`}
          >
            <span className="font-serif text-base leading-[1.3]">{a.title}</span>
            <span className="flex justify-between gap-3 text-[13px] text-muted">
              <span>{a.cite}</span>
              <span className={`text-xs font-medium ${TONE_CLASS[a.tone]}`}>{a.statusLabel}</span>
            </span>
          </Link>
        );
      })}

      {filtered.length === 0 && (
        <p className="m-0 px-5 py-6 text-sm text-muted">
          {articles.length === 0
            ? "Nenhum artigo neste projeto. Envie PDFs no botão +."
            : "Nenhum artigo encontrado neste projeto."}
        </p>
      )}
    </>
  );
}
