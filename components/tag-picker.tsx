"use client";

import { createContext, useContext, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { addTagging, removeTagging, type Tagging } from "@/app/(app)/projects/[id]/tag-actions";
import { cleanTagName, sameTagName, tagHex, tagPath, type Tag } from "@/lib/tags";

type Ctx = {
  articleId: string;
  tags: Tag[];
  taggings: Tagging[];
  add: (target: Target, name: string) => Promise<string | null>;
  remove: (taggingId: string) => Promise<string | null>;
};
type Target = { fieldKey?: string; quoteId?: string };

const TagsContext = createContext<Ctx | null>(null);

/**
 * Tags do projeto e marcações do artigo, compartilhadas pelos seletores da
 * ficha (artigo, campos e citações). Uma tag criada num campo já aparece nas
 * sugestões dos outros.
 */
export function TagsProvider({
  articleId,
  tags: initialTags,
  taggings: initialTaggings,
  children,
}: {
  articleId: string;
  tags: Tag[];
  taggings: Tagging[];
  children: ReactNode;
}) {
  const [tags, setTags] = useState(initialTags);
  const [taggings, setTaggings] = useState(initialTaggings);
  // Dados novos do servidor (revalidação, outra aba) valem mais que o estado local.
  const [source, setSource] = useState({ initialTags, initialTaggings });
  if (source.initialTags !== initialTags || source.initialTaggings !== initialTaggings) {
    setSource({ initialTags, initialTaggings });
    setTags(initialTags);
    setTaggings(initialTaggings);
  }

  async function add(target: Target, name: string) {
    const r = await addTagging(articleId, target, name);
    if (!r.ok) return r.error;
    setTags((list) => (list.some((t) => t.id === r.tag.id) ? list : [...list, r.tag]));
    setTaggings((list) => (list.some((t) => t.id === r.tagging.id) ? list : [...list, r.tagging]));
    return null;
  }

  async function remove(taggingId: string) {
    const before = taggings;
    setTaggings((list) => list.filter((t) => t.id !== taggingId));
    const r = await removeTagging(taggingId);
    if (!r.ok) {
      setTaggings(before);
      return r.error;
    }
    return null;
  }

  return <TagsContext.Provider value={{ articleId, tags, taggings, add, remove }}>{children}</TagsContext.Provider>;
}

export function TagChip({ tag, all, onRemove }: { tag: Tag; all: Tag[]; onRemove?: () => void }) {
  return (
    <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-line bg-surface py-0.5 pr-1 pl-2.5 text-xs">
      <span className="size-2 shrink-0 rounded-full" style={{ background: tagHex(tag.color) }} aria-hidden />
      <span>{tagPath(tag, all)}</span>
      {onRemove ? (
        <button
          type="button"
          className="grid size-5 place-items-center rounded-full text-muted hover:bg-page hover:text-ink"
          aria-label={`Tirar a tag ${tag.name}`}
          onClick={onRemove}
        >
          ×
        </button>
      ) : (
        <span className="w-1" />
      )}
    </span>
  );
}

/** Tags de um alvo (artigo, campo ou citação) com "+ tag" e autocompletar. */
export function TagPicker({ fieldKey, quoteId, label = "tag" }: Target & { label?: string }) {
  const ctx = useContext(TagsContext);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  if (!ctx) return null;

  const mine = ctx.taggings.filter(
    (t) => (t.field_key ?? undefined) === fieldKey && (t.quote_id ?? undefined) === quoteId,
  );
  const applied = new Set(mine.map((t) => t.tag_id));
  const term = cleanTagName(text).toLocaleLowerCase("pt-BR");
  const suggestions = ctx.tags
    .filter((t) => !applied.has(t.id) && (!term || tagPath(t, ctx.tags).toLocaleLowerCase("pt-BR").includes(term)))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, 8);
  const exact = ctx.tags.some((t) => sameTagName(t.name, text));
  const options = [...suggestions.map((t) => ({ name: t.name, label: tagPath(t, ctx.tags), tag: t as Tag | null }))];
  if (term && !exact) options.push({ name: cleanTagName(text), label: `Criar “${cleanTagName(text)}”`, tag: null });

  function choose(name: string) {
    setError("");
    startTransition(async () => {
      const err = await ctx!.add({ fieldKey, quoteId }, name);
      if (err) setError(err);
      else {
        setText("");
        setActive(0);
        input.current?.focus();
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {mine.map((t) => {
        const tag = ctx.tags.find((x) => x.id === t.tag_id);
        return tag ? (
          <TagChip
            key={t.id}
            tag={tag}
            all={ctx.tags}
            onRemove={() =>
              startTransition(async () => {
                const err = await ctx.remove(t.id);
                if (err) setError(err);
              })
            }
          />
        ) : null;
      })}
      {open ? (
        <div className="relative">
          <input
            ref={input}
            autoFocus
            role="combobox"
            aria-expanded={options.length > 0}
            aria-controls={listId}
            aria-label="Nome da tag"
            value={text}
            maxLength={60}
            disabled={pending}
            placeholder="Nome da tag"
            className="field min-h-7 w-44 px-2 py-0.5 text-xs"
            onChange={(e) => {
              setText(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, options.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const opt = options[active] ?? (term ? { name: cleanTagName(text) } : null);
                if (opt) choose(opt.name);
              } else if (e.key === "Escape") {
                setOpen(false);
                setText("");
              }
            }}
            // Atraso: deixa o clique numa sugestão valer antes de fechar.
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
          {options.length > 0 && (
            <ul
              id={listId}
              role="listbox"
              className="absolute top-full left-0 z-20 m-0 mt-1 max-h-60 w-56 list-none overflow-auto rounded-lg border border-line bg-surface p-1 shadow-lg"
            >
              {options.map((o, i) => (
                <li
                  key={o.tag?.id ?? "new"}
                  role="option"
                  aria-selected={i === active}
                  className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs ${i === active ? "bg-tint" : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(o.name)}
                >
                  {o.tag && <span className="size-2 rounded-full" style={{ background: tagHex(o.tag.color) }} aria-hidden />}
                  <span className={o.tag ? "" : "text-accent"}>{o.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="min-h-7 rounded-full border border-dashed border-line px-2.5 text-xs text-muted hover:border-accent hover:text-accent"
          onClick={() => {
            setOpen(true);
            setError("");
          }}
        >
          + {label}
        </button>
      )}
      {error && <span className="text-xs text-warn">{error}</span>}
    </div>
  );
}
