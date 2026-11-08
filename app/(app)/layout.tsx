/** Área logada. Cada tela monta o próprio chrome (shell de projetos, perfil, visualizador). */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <div className="flex flex-1 flex-col">{children}</div>;
}
