export type Theme = "light" | "dark";

export const THEME_KEY = "fichamento-theme";

/** Roda no <head> antes da pintura: aplica o tema salvo (sem escolha, segue o sistema). */
export const themeInitScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
