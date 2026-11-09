"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY, type Theme } from "@/lib/theme";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons";

const listeners = new Set<() => void>();

function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Sem storage (aba privada): vale só nesta página.
  }
  listeners.forEach((l) => l());
}

function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    currentTheme,
    () => "light",
  );
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useTheme();
  return (
    <button
      type="button"
      className={`icon-btn ${className}`}
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      aria-label="Alternar tema claro e escuro"
    >
      <SunIcon />
    </button>
  );
}

type Choice = Theme | "system";

function currentChoice(): Choice {
  const set = document.documentElement.dataset.theme;
  return set === "light" || set === "dark" ? set : "system";
}

/** "Sistema" remove a escolha salva: volta a seguir o sistema operacional. */
function setChoice(choice: Choice) {
  if (choice !== "system") return setTheme(choice);
  delete document.documentElement.dataset.theme;
  try {
    localStorage.removeItem(THEME_KEY);
  } catch {
    // Sem storage: vale só nesta página.
  }
  listeners.forEach((l) => l());
}

function useChoice(): Choice {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    currentChoice,
    () => "system",
  );
}

/** Tema: sistema, claro ou escuro (ícones, como nas configurações do Claude). */
export function ThemeChoice() {
  const choice = useChoice();
  const opts: { id: Choice; label: string; icon: React.ReactNode }[] = [
    { id: "system", label: "Seguir o sistema", icon: <MonitorIcon /> },
    { id: "light", label: "Claro", icon: <SunIcon size={18} /> },
    { id: "dark", label: "Escuro", icon: <MoonIcon /> },
  ];
  return (
    <div className="flex gap-1 rounded-lg bg-sunk p-1" role="radiogroup" aria-label="Tema">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={choice === o.id}
          aria-label={o.label}
          title={o.label}
          onClick={() => setChoice(o.id)}
          className={`inline-flex size-9 items-center justify-center rounded-md ${
            choice === o.id ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,.12)]" : "text-muted hover:text-ink"
          }`}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}
