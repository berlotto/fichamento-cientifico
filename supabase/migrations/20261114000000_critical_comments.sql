-- Spec 001: comentário crítico.
--
-- 1. Análise crítica estruturada do artigo. "Notas livres" continuam em
--    articles.notes (antigo "Minhas notas"), então nada precisa ser migrado.
-- 2. Comentário do pesquisador por campo da ficha, numa tabela própria: o
--    worker não toca nela, então reextrair o artigo nunca apaga comentários.

alter table public.articles
  add column crit_strengths text,
  add column crit_weaknesses text,
  add column crit_relevance text,
  add constraint articles_crit_sizes check (
    coalesce(length(crit_strengths), 0) <= 10000
    and coalesce(length(crit_weaknesses), 0) <= 10000
    and coalesce(length(crit_relevance), 0) <= 10000
  );

grant update (crit_strengths, crit_weaknesses, crit_relevance) on public.articles to authenticated;

create table public.field_comments (
  article_id uuid not null references public.articles(id) on delete cascade,
  field_key text not null check (field_key ~ '^[a-z][a-z0-9_]{1,39}$'),
  body text not null check (length(trim(body)) between 1 and 5000),
  updated_at timestamptz not null default now(),
  primary key (article_id, field_key)
);

alter table public.field_comments enable row level security;
create policy own_field_comments on public.field_comments for all to authenticated
  using (private.owns_article(article_id))
  with check (private.owns_article(article_id));
revoke all on public.field_comments from anon;
