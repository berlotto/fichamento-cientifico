"use client";

import { useEffect, useState, useTransition, useSyncExternalStore } from "react";
import { saveFonts } from "@/app/(app)/profile/actions";
import {
  CATEGORY_LABEL,
  FONT_ARTICLE_KEY,
  FONT_OPTIONS,
  FONT_UI_KEY,
  validFont,
  type FontCategory,
  type FontRole,
} from "@/lib/fonts";

const listeners = new Set<() => void>();
const attr = (role: FontRole) => (role === "ui" ? "fontUi" : "fontArticle");
const storageKey = (role: FontRole) => (role === "ui" ? FONT_UI_KEY : FONT_ARTICLE_KEY);

function current(role: FontRole): string {
  return validFont(document.documentElement.dataset[attr(role)], role);
}

/** Aplica a fonte no <html> e guarda no navegador (o script do <head> lê na próxima visita). */
function applyFont(role: FontRole, id: string) {
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

function useFont(role: FontRole): string {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current(role),
    () => "padrao",
  );
}

/**
 * Traz para este navegador as fontes guardadas na conta (escolhidas em outro
 * aparelho). Renderizado no layout logado; não mostra nada.
 */
export function FontSync({ ui, article }: { ui: string | null; article: string | null }) {
  useEffect(() => {
    if (ui && validFont(ui, "ui") !== current("ui")) applyFont("ui", validFont(ui, "ui"));
    if (article && validFont(article, "article") !== current("article")) {
      applyFont("article", validFont(article, "article"));
    }
  }, [ui, article]);
  return null;
}

const ORDER: FontCategory[] = ["padrao", "sem-serifa", "serifa", "manuscrita"];

/** Amostra de cada fonte escrita nela mesma (o "Padrão" usa a fonte padrão daquele papel). */
function sampleFamily(role: FontRole, cssVar: string) {
  if (cssVar) return `var(${cssVar})`;
  return role === "ui" ? "var(--font-instrument-sans)" : "var(--font-newsreader)";
}

function FontPicker({ role, onChange }: { role: FontRole; onChange: () => void }) {
  const selected = useFont(role);
  const options = FONT_OPTIONS.filter((f) => f.roles.includes(role));
  const sample =
    role === "ui" ? "Projetos · Adicionar artigo · Revisar" : "Os resultados indicam uma associação consistente.";

  return (
    <div className="flex flex-col gap-4" role="radiogroup" aria-label={role === "ui" ? "Fonte da interface" : "Fonte dos artigos"}>
      {ORDER.map((cat) => {
        const group = options.filter((f) => f.category === cat);
        if (group.length === 0) return null;
        return (
          <div key={cat} className="flex flex-col gap-2">
            {cat !== "padrao" && <span className="text-xs font-medium text-muted">{CATEGORY_LABEL[cat]}</span>}
            <div className="grid grid-cols-1 gap-2 min-[560px]:grid-cols-2">
              {group.map((f) => {
                const on = f.id === selected;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      applyFont(role, f.id);
                      onChange();
                    }}
                    className={`flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left ${
                      on ? "border-accent bg-tint" : "border-line hover:border-muted"
                    }`}
                  >
                    <span className="text-xs text-muted">
                      {f.label}
                      {f.note ? ` · ${f.note}` : ""}
                    </span>
                    <span
                      className="text-[17px] leading-snug"
                      style={{
                        fontFamily: sampleFamily(role, f.cssVar),
                        fontSizeAdjust: f.category === "manuscrita" ? "0.54" : undefined,
                      }}
                    >
                      {sample}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Perfil > Aparência > Fontes: uma para a interface, outra para os artigos. */
export function FontSettings() {
  const [status, setStatus] = useState("");
  const [pending, start] = useTransition();

  const persist = () =>
    start(async () => {
      const { ok } = await saveFonts(current("ui"), current("article"));
      setStatus(ok ? "Salvo na sua conta" : "Aplicado neste navegador (não foi possível salvar na conta)");
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="m-0 text-sm font-medium">Fonte da interface</h3>
          <span aria-live="polite" className="text-xs text-muted">
            {pending ? "Salvando…" : status}
          </span>
        </div>
        <p className="m-0 text-[13px] text-muted">Menus, botões, rótulos e títulos das telas.</p>
        <FontPicker role="ui" onChange={persist} />
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="m-0 text-sm font-medium">Fonte dos artigos</h3>
        <p className="m-0 text-[13px] text-muted">
          Título, resumo, campos da ficha, trechos citados, referências, notas e matriz.
        </p>
        <FontPicker role="article" onChange={persist} />
      </div>
      <div className="flex flex-col gap-2 rounded-xl bg-page p-4">
        <span className="eyebrow">Prévia</span>
        <p className="font-article m-0 text-xl leading-snug">O papel do ozônio como medicina integrativa</p>
        <p className="font-article m-0 text-[15px] leading-relaxed text-muted italic">
          “Foram caracterizadas 26 revisões sistemáticas, distribuídas em uma matriz com 6 intervenções.”
        </p>
        <div className="flex gap-2">
          <span className="btn min-h-9 px-3 text-[13px]">Aceitar</span>
          <span className="btn min-h-9 px-3 text-[13px]">Editar</span>
        </div>
      </div>
    </div>
  );
}
