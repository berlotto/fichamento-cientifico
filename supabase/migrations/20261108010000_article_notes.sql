-- "Minhas notas" na ficha do artigo (design: canvas "Fichamento de artigos").
alter table public.articles add column notes text;

grant update (notes) on public.articles to authenticated;
