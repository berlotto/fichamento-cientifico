/** Nenhum projeto selecionado: no celular a coluna de projetos ocupa a tela. */
export default function ProjectsPage() {
  return (
    <>
      <section className="fx-pane fx-list flex flex-col border-r border-line bg-surface" aria-label="Artigos do projeto">
        <p className="m-0 px-5 py-6 text-sm text-muted">Selecione um projeto para ver os artigos.</p>
      </section>
      <article className="fx-pane fx-detail bg-surface" aria-label="Ficha do artigo" />
    </>
  );
}
