"use client";

import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";

type Item = { id: string; name: string; count: number };

export function ProjectNav({ projects }: { projects: Item[] }) {
  const [activeId] = useSelectedLayoutSegments();

  if (projects.length === 0) {
    return <p className="m-0 px-3 text-sm text-muted">Nenhum projeto ainda. Crie o primeiro no botão +.</p>;
  }

  return projects.map((p) => {
    const active = p.id === activeId;
    return (
      <Link
        key={p.id}
        href={`/projects/${p.id}`}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-sunk ${
          active ? "bg-tint font-semibold hover:bg-tint" : ""
        }`}
      >
        <span className="min-w-0 flex-1">{p.name}</span>
        <span className="text-xs font-normal text-muted">{p.count}</span>
      </Link>
    );
  });
}
