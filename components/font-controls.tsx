"use client";

import { useEffect, useSyncExternalStore } from "react";
import { saveFonts } from "@/app/(app)/profile/actions";
import {
  CATEGORY_LABEL,
  FONT_ARTICLE_KEY,
  FONT_OPTIONS,
  FONT_UI_KEY,
  fontById,
  validFont,
  type FontCategory,
  type FontRole,
} from "@/lib/fonts";

const listeners = new Set<() => void>();
const attr = (role: FontRole) => (role === "ui" ? "fontUi" : "fontArticle");
const storageKey = (role: FontRole) => (role === "ui" ? FONT_UI_KEY : FONT_ARTICLE_KEY);

export function currentFont(role: FontRole): string {
  return validFont(document.documentElement.dataset[attr(role)], role);
}

/** Aplica a fonte no <html> e guarda no navegador (o script do <head> lê na próxima visita). */
export function applyFont(role: FontRole, id: string) {
  const el = document.documentElement;
  if (id === "padrao") delete el.dataset[attr(role)];
  else el.dataset[attr(role)] = id;
  try {
    if (id === "padrao") localStorage.removeItem(storageKey(role));
    else localStorage.setItem(storageKey(role), id);
  } catch {
    // Sem storage (aba privada): vale só nesta página.
  }
  listeners.forEach((l) => l());
}

export function useFont(role: FontRole): string {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => currentFont(role),
    () => "padrao",
  );
}

/**
 * Traz para este navegador as fontes guardadas na conta (escolhidas em outro
 * aparelho). Renderizado no layout logado; não mostra nada.
 */
export function FontSync({ ui, article }: { ui: string | null; article: string | null }) {
  useEffect(() => {
    if (ui && validFont(ui, "ui") !== currentFont("ui")) applyFont("ui", validFont(ui, "ui"));
    if (article && validFont(article, "article") !== currentFont("article")) {
      applyFont("article", validFont(article, "article"));
    }
  }, [ui, article]);
  return null;
}

const ORDER: FontCategory[] = ["padrao", "sem-serifa", "serifa", "manuscrita"];

/**
 * Lista suspensa de fontes de um papel (interface ou artigo). Aplica na hora e
 * guarda na conta; `onSaved` informa o resultado.
 */
export function FontSelect({
  role,
  id,
  onSaved,
}: {
  role: FontRole;
  id: string;
  onSaved?: (ok: boolean) => void;
}) {
  const selected = useFont(role);
  const options = FONT_OPTIONS.filter((f) => f.roles.includes(role));
  return (
    <select
      id={id}
      value={selected}
      onChange={async (e) => {
        applyFont(role, e.target.value);
        const { ok } = await saveFonts(currentFont("ui"), currentFont("article"));
        onSaved?.(ok);
      }}
      className="field w-full cursor-pointer min-[640px]:w-[260px]"
    >
      {ORDER.map((cat) => {
        const group = options.filter((f) => f.category === cat);
        if (group.length === 0) return null;
        const items = group.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ));
        return cat === "padrao" ? items : (
          <optgroup key={cat} label={CATEGORY_LABEL[cat]}>
            {items}
          </optgroup>
        );
      })}
    </select>
  );
}

/** Uma linha de amostra na fonte escolhida (com a nota da fonte). */
export function FontSample({ role }: { role: FontRole }) {
  const f = fontById(useFont(role));
  return (
    <p className={`m-0 text-[15px] leading-snug text-muted ${role === "article" ? "font-article" : ""}`}>
      {role === "ui" ? "Projetos · Adicionar artigo · Revisar" : "“Os resultados indicam uma associação consistente.”"}
      {f?.note ? <span className="ml-2 font-sans text-xs">({f.note})</span> : null}
    </p>
  );
}
