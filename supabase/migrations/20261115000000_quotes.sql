-- Spec 002: citações marcadas à mão no texto do PDF.
-- Ficam em tabela própria: a reextração do artigo não mexe nelas.

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  text text not null check (length(trim(text)) between 1 and 2000),
  pdf_page integer not null check (pdf_page >= 1),
  printed_page text check (length(printed_page) <= 20),
  comment text check (length(comment) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quotes_article_page on public.quotes (article_id, pdf_page, created_at);

alter table public.quotes enable row level security;

create policy own_quotes on public.quotes for all to authenticated
  using (private.owns_article(article_id))
  with check (private.owns_article(article_id));

-- Trecho, página e artigo não mudam depois de gravados: só o comentário.
revoke all on public.quotes from anon;
revoke update on public.quotes from authenticated;
grant select, insert, delete on public.quotes to authenticated;
grant update (comment, updated_at) on public.quotes to authenticated;

-- Limite de 200 citações por artigo. O advisory lock serializa inserções
-- concorrentes no mesmo artigo para a contagem valer.
create function private.quotes_limit() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.article_id::text, 0));
  if (select count(*) from public.quotes where article_id = new.article_id) >= 200 then
    raise exception 'limite de 200 citações por artigo' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger quotes_limit before insert on public.quotes
  for each row execute function private.quotes_limit();
