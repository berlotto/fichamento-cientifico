import type { Metadata } from "next";
import { fontCss, fontInitScript } from "@/lib/fonts";
import { themeInitScript } from "@/lib/theme";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fichamento",
  description: "Cada artigo vira uma ficha, com a citação no lugar certo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${fontVariables} h-full antialiased`}
      // Os scripts de tema e fonte alteram data-* antes da hidratação.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript + fontInitScript }} />
        <style dangerouslySetInnerHTML={{ __html: fontCss() }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
