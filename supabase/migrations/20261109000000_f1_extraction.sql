-- F1: metadados completos (Crossref ou LLM), campos da ficha com trecho e página,
-- e importação de PDF por URL.

-- Metadados bibliográficos que faltavam para as referências (ABNT, APA, Vancouver, BibTeX).
alter table public.articles
  add column subtitle text,
  add column language text,
  add column volume text,
  add column issue text,
  add column pages text,
  add column source_url text;

-- 'llm': metadado lido do PDF pelo modelo, sem confirmação no Crossref.
alter table public.articles drop constraint articles_metadata_source_check;
alter table public.articles add constraint articles_metadata_source_check
  check (metadata_source in ('crossref', 'zotero', 'manual', 'llm'));

grant insert (source_url) on public.articles to authenticated;
grant update (subtitle, language, volume, issue, pages) on public.articles to authenticated;

-- Campos da ficha: um por chave, regravados a cada extração.
create table public.article_fields (
  article_id uuid not null references public.articles(id) on delete cascade,
  key text not null
    check (key in ('abstract', 'subject', 'objective', 'method', 'results', 'conclusions')),
  value text not null,
  -- Trecho literal do artigo que sustenta o valor, com a página onde foi encontrado.
  quote text,
  pdf_page int check (pdf_page >= 1),
  printed_page text,
  -- true: o trecho foi encontrado no texto do PDF e os números do valor estão nele.
  verified boolean not null default false,
  -- 'author': copiado do artigo (resumo do autor); 'llm': escrito pelo modelo.
  source text not null check (source in ('author', 'llm')),
  model text,
  created_at timestamptz not null default now(),
  primary key (article_id, key)
);

alter table public.article_fields enable row level security;
create policy select_own_fields on public.article_fields for select to authenticated
  using (public.owns_article(article_id));
revoke insert, update, delete on public.article_fields from authenticated, anon;
