"use client";

import { useRouter } from "next/navigation";
import { tagPath, tagTree, type Tag } from "@/lib/tags";

/** Filtro da matriz por tema (spec 003): troca o parâmetro ?tema= mantendo os outros. */
export function TagFilter({ tags, value, base, query }: { tags: Tag[]; value: string; base: string; query: string }) {
  const router = useRouter();
  return (
    <select
      aria-label="Filtrar por tema"
      className="field min-h-9 w-auto max-w-[14rem] py-1 text-[13px]"
      value={value}
      onChange={(e) => {
        const q = [query, e.target.value && `tema=${e.target.value}`].filter(Boolean).join("&");
        router.push(`${base}${q ? `?${q}` : ""}`);
      }}
    >
      <option value="">Todos os temas</option>
      {tagTree(tags).map(({ tag }) => (
        <option key={tag.id} value={tag.id}>
          {tagPath(tag, tags)}
        </option>
      ))}
    </select>
  );
}
