"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY, type Theme } from "@/lib/theme";
import { SunIcon } from "./icons";

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

export function ThemeSegmented() {
  const theme = useTheme();
  return (
    <div className="segmented max-w-[280px]">
      <button type="button" aria-pressed={theme === "light"} onClick={() => setTheme("light")}>
        Claro
      </button>
      <button type="button" aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}>
        Escuro
      </button>
    </div>
  );
}
