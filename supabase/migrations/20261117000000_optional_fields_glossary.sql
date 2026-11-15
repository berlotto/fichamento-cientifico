-- Spec 005: campos opcionais da extração (limitações, trabalhos futuros, lacunas).
-- Spec 006: conceitos do projeto e definições encontradas nos artigos (glossário).

-- ---------------------------------------------------------------------------
-- 005: quais campos opcionais o projeto extrai
-- ---------------------------------------------------------------------------
alter table public.projects
  add column optional_fields text[] not null default '{limitations,future_work}'
    check (optional_fields <@ array['limitations', 'future_work', 'gaps']::text[]);

grant update (optional_fields) on public.projects to authenticated;

-- ---------------------------------------------------------------------------
-- 006: conceitos de interesse do projeto
-- ---------------------------------------------------------------------------
create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  notes text check (length(notes) <= 500),
  created_at timestamptz not null default now()
);

create unique index concepts_project_name on public.concepts (project_id, lower(trim(name)));

alter table public.concepts enable row level security;
create policy own_concepts on public.concepts for all to authenticated
  using (private.owns_project(project_id))
  with check (private.owns_project(project_id));

revoke all on public.concepts from anon;
revoke update on public.concepts from authenticated;
grant select, insert, delete on public.concepts to authenticated;
grant update (name, notes) on public.concepts to authenticated;

create function private.concepts_limit() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.project_id::text, 2));
  if (select count(*) from public.concepts where project_id = new.project_id) >= 30 then
    raise exception 'limite de 30 conceitos por projeto' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger concepts_limit before insert on public.concepts
  for each row execute function private.concepts_limit();

-- ---------------------------------------------------------------------------
-- 006: definições encontradas (pelo LLM ou marcadas à mão a partir de citação)
-- Um artigo pode ter várias definições do mesmo conceito: sem chave única.
-- ---------------------------------------------------------------------------
create table public.definitions (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.concepts(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  -- Trecho literal do artigo, na língua original (é o que se confere no PDF).
  text text not null check (length(trim(text)) between 1 and 3000),
  text_translated text check (length(text_translated) <= 3000),
  pdf_page integer check (pdf_page >= 1),
  printed_page text check (length(printed_page) <= 20),
  -- Definição do próprio autor ou citada de outro trabalho.
  origin text not null default 'own' check (origin in ('own', 'cited')),
  cited_ref text check (length(cited_ref) <= 500),
  -- O que o conceito é, ou como foi medido neste estudo.
  kind text not null default 'definition' check (kind in ('definition', 'operationalization')),
  verified boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  source text not null default 'llm' check (source in ('llm', 'manual')),
  quote_id uuid references public.quotes(id) on delete set null,
  created_at timestamptz not null default now()
);

create index definitions_concept on public.definitions (concept_id);
create index definitions_article on public.definitions (article_id);

alter table public.definitions enable row level security;
create policy own_definitions on public.definitions for all to authenticated
  using (private.owns_article(article_id))
  with check (private.owns_article(article_id));

revoke all on public.definitions from anon;
revoke update on public.definitions from authenticated;
grant select, insert, delete on public.definitions to authenticated;
grant update (status, origin, cited_ref, kind) on public.definitions to authenticated;

-- Conceito e artigo do mesmo projeto; citação (quando houver) do mesmo artigo.
create function private.definitions_check() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.concepts c join public.articles a on a.project_id = c.project_id
    where c.id = new.concept_id and a.id = new.article_id
  ) then
    raise exception 'conceito e artigo de projetos diferentes' using errcode = 'check_violation';
  end if;
  if new.quote_id is not null
     and not exists (select 1 from public.quotes where id = new.quote_id and article_id = new.article_id) then
    raise exception 'citação de outro artigo' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger definitions_check before insert or update on public.definitions
  for each row execute function private.definitions_check();

-- ---------------------------------------------------------------------------
-- 006: pedir a busca de definições nos artigos do projeto (estágio "definitions")
-- Sem refazer a ficha: só procura os conceitos. Respeita o teto de gasto.
-- ---------------------------------------------------------------------------
create function public.request_definitions(p_project uuid) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  reason text;
  n integer := 0;
  art record;
begin
  if not private.owns_project(p_project) then
    raise exception 'Projeto não encontrado.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.concepts where project_id = p_project) then
    raise exception 'Cadastre ao menos um conceito.' using errcode = 'P0001';
  end if;
  reason := private.llm_block_reason(uid);
  if reason is not null then
    raise exception '%', reason using errcode = 'P0001';
  end if;
  for art in
    select a.id from public.articles a
    where a.project_id = p_project
      and a.reading_status <> 'discarded'
      and exists (select 1 from public.article_pages p where p.article_id = a.id)
  loop
    perform pgmq.send('pipeline', jsonb_build_object('article_id', art.id, 'stage', 'definitions'));
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.request_definitions(uuid) from public, anon;
grant execute on function public.request_definitions(uuid) to authenticated;
