-- F1: revisão dos campos, campos personalizados por projeto, custo do LLM,
-- reextração a pedido e limpeza de PDFs (A11).

-- ---------------------------------------------------------------------------
-- Campos personalizados por projeto (além dos 6 fixos)
-- ---------------------------------------------------------------------------
create table public.project_fields (
  project_id uuid not null references public.projects(id) on delete cascade,
  key text not null check (key ~ '^[a-z][a-z0-9_]{1,39}$'),
  label text not null check (length(trim(label)) between 1 and 80),
  instructions text check (length(instructions) <= 1000),
  position int not null default 0,
  created_at timestamptz not null default now(),
  primary key (project_id, key)
);

alter table public.project_fields enable row level security;
create policy own_project_fields on public.project_fields for all to authenticated
  using (private.owns_project(project_id))
  with check (private.owns_project(project_id));

create function private.enforce_project_fields_quota() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.project_fields where project_id = new.project_id) >= 20 then
    raise exception 'Limite de 20 campos personalizados por projeto.' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function private.enforce_project_fields_quota() from public, anon, authenticated;
create trigger project_fields_quota before insert on public.project_fields
  for each row execute function private.enforce_project_fields_quota();

-- ---------------------------------------------------------------------------
-- Revisão dos campos da ficha
-- ---------------------------------------------------------------------------
-- A chave deixa de ser fixa: campos personalizados usam a chave do projeto.
alter table public.article_fields drop constraint article_fields_key_check;
alter table public.article_fields add constraint article_fields_key_check
  check (key ~ '^[a-z][a-z0-9_]{1,39}$');

alter table public.article_fields
  -- pending: como o LLM entregou; accepted: conferido (com ou sem edição); rejected: descartado.
  add column status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  -- Valor e trecho originais do LLM, para medir a taxa de acerto (gold set a partir da revisão).
  add column llm_value text,
  add column llm_quote text,
  add column edited boolean not null default false,
  add column reviewed_by uuid references auth.users(id) on delete set null,
  add column reviewed_at timestamptz,
  add constraint article_fields_sizes check (length(value) <= 20000 and coalesce(length(quote), 0) <= 5000);

update public.article_fields set llm_value = value, llm_quote = quote where llm_value is null;

-- O usuário revisa pelo app (server actions com a sessão dele); RLS limita aos próprios artigos.
grant update (value, quote, pdf_page, printed_page, verified, status, edited, reviewed_by, reviewed_at)
  on public.article_fields to authenticated;
create policy update_own_fields on public.article_fields for update to authenticated
  using (private.owns_article(article_id))
  with check (private.owns_article(article_id));

-- Status do artigo acompanha a revisão: tudo revisado -> verified.
create function private.sync_article_review_status() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  pending int;
  unverified int;
begin
  select count(*) filter (where status = 'pending'),
         count(*) filter (where status = 'pending' and not verified)
    into pending, unverified
  from public.article_fields where article_id = new.article_id;

  update public.articles
  set status = case
    when pending = 0 then 'verified'
    when unverified = 0 then 'extracted'
    else 'needs_review'
  end
  where id = new.article_id and status in ('extracted', 'needs_review', 'verified');
  return null;
end $$;
revoke all on function private.sync_article_review_status() from public, anon, authenticated;

create trigger article_fields_review_status after update of status, verified on public.article_fields
  for each row execute function private.sync_article_review_status();

-- ---------------------------------------------------------------------------
-- Custo do LLM por chamada
-- ---------------------------------------------------------------------------
create table public.llm_runs (
  id bigint generated always as identity primary key,
  article_id uuid not null references public.articles(id) on delete cascade,
  stage text not null,
  model text not null,
  prompt_version text,
  input_tokens int,
  output_tokens int,
  cost_usd numeric(12, 6),
  latency_ms int,
  created_at timestamptz not null default now()
);
create index llm_runs_article_idx on public.llm_runs (article_id);

alter table public.llm_runs enable row level security;
create policy select_own_runs on public.llm_runs for select to authenticated
  using (private.owns_article(article_id));
revoke insert, update, delete on public.llm_runs from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Reextração a pedido (ex.: depois de criar campos personalizados)
-- ---------------------------------------------------------------------------
create function public.request_extract(article uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  runs int;
begin
  if not private.owns_article(article) then
    raise exception 'Artigo não encontrado.' using errcode = 'P0001';
  end if;
  -- Mesmo teto diário dos uploads: cada extração é uma chamada paga.
  select count(*) into runs
  from public.llm_runs r
  join public.articles a on a.id = r.article_id
  join public.projects p on p.id = a.project_id
  where p.owner_id = (select auth.uid()) and r.created_at > now() - interval '24 hours';
  if runs >= 150 then
    raise exception 'Limite diário de extrações atingido. Tente novamente amanhã.' using errcode = 'P0001';
  end if;
  update public.articles set status = 'parsed', error = null
  where id = article and status in ('extracted', 'needs_review', 'verified', 'failed');
  perform pgmq.send('pipeline', jsonb_build_object('article_id', article, 'stage', 'extract'));
end $$;
revoke all on function public.request_extract(uuid) from public, anon;
grant execute on function public.request_extract(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- A11: o usuário apaga os próprios PDFs (o app só apaga quando nenhum artigo usa mais o arquivo)
-- ---------------------------------------------------------------------------
create policy pdfs_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);
