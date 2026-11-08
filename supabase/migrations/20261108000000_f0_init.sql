-- F0: projetos, artigos, páginas, fila do pipeline, storage e RLS.
-- Ver arquitetura-fichamento.md (seção 4) e plano-implementacao.md (ajustes A2, A3, A9, A11).

create extension if not exists pgmq;
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);
create index projects_owner_idx on public.projects (owner_id);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  storage_path text not null,
  original_filename text,
  doi text,
  citekey text,
  zotero_key text,
  title text,
  authors jsonb,
  year int,
  venue text,
  metadata_source text check (metadata_source in ('crossref', 'zotero', 'manual')),
  tier text not null default 'full' check (tier in ('light', 'full')),
  page_count int,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'parsed', 'needs_ocr', 'extracted', 'verified', 'needs_review', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, sha256)
);
create index articles_project_idx on public.articles (project_id);

create table public.article_pages (
  article_id uuid not null references public.articles(id) on delete cascade,
  pdf_page int not null check (pdf_page >= 1),
  printed_page text,
  text text not null,
  primary key (article_id, pdf_page)
);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger articles_touch before update on public.articles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

create function public.owns_project(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.projects where id = p and owner_id = (select auth.uid())
  )
$$;

create function public.owns_article(a uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.articles ar
    join public.projects pr on pr.id = ar.project_id
    where ar.id = a and pr.owner_id = (select auth.uid())
  )
$$;

alter table public.projects enable row level security;
create policy own_projects on public.projects for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

alter table public.articles enable row level security;
create policy select_own_articles on public.articles for select to authenticated
  using (public.owns_project(project_id));
-- O arquivo precisa estar na pasta do próprio usuário.
create policy insert_own_articles on public.articles for insert to authenticated
  with check (
    public.owns_project(project_id)
    and storage_path like ((select auth.uid())::text || '/%')
  );
create policy update_own_articles on public.articles for update to authenticated
  using (public.owns_project(project_id))
  with check (public.owns_project(project_id));
create policy delete_own_articles on public.articles for delete to authenticated
  using (public.owns_project(project_id));

-- O usuário só grava colunas de entrada e de metadado manual.
-- status, error, page_count e afins são do worker (service role).
revoke insert, update on public.articles from authenticated, anon;
grant insert (project_id, sha256, storage_path, original_filename) on public.articles to authenticated;
grant update (title, authors, year, venue, doi, citekey, tier, metadata_source) on public.articles to authenticated;

alter table public.article_pages enable row level security;
create policy select_own_pages on public.article_pages for select to authenticated
  using (public.owns_article(article_id));
revoke insert, update, delete on public.article_pages from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Storage: bucket privado, pasta = user_id
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pdfs', 'pdfs', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;

create policy pdfs_select_own on storage.objects for select to authenticated
  using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy pdfs_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Sem update/delete pelo cliente: o mesmo PDF pode servir a mais de um projeto (A11).

-- ---------------------------------------------------------------------------
-- Fila do pipeline
-- ---------------------------------------------------------------------------

select pgmq.create('pipeline');

-- A2: o insert do artigo enfileira o parse; o cliente nunca toca na fila.
create function public.enqueue_parse() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pgmq.send('pipeline', jsonb_build_object('article_id', new.id, 'stage', 'parse'));
  return new;
end $$;

create trigger articles_enqueue_parse after insert on public.articles
  for each row execute function public.enqueue_parse();

-- Wrappers para o worker (service role) via PostgREST/RPC.
create function public.queue_read(qty int, vt_seconds int)
returns setof pgmq.message_record
language sql security definer set search_path = '' as $$
  select * from pgmq.read('pipeline', vt_seconds, qty)
$$;

create function public.queue_send(msg jsonb, delay_seconds int default 0)
returns bigint
language sql security definer set search_path = '' as $$
  select pgmq.send('pipeline', msg, delay_seconds)
$$;

create function public.queue_archive(msg_id bigint)
returns boolean
language sql security definer set search_path = '' as $$
  select pgmq.archive('pipeline', msg_id)
$$;

revoke all on function public.queue_read(int, int) from public, anon, authenticated;
revoke all on function public.queue_send(jsonb, int) from public, anon, authenticated;
revoke all on function public.queue_archive(bigint) from public, anon, authenticated;
grant execute on function public.queue_read(int, int) to service_role;
grant execute on function public.queue_send(jsonb, int) to service_role;
grant execute on function public.queue_archive(bigint) to service_role;

revoke all on function public.enqueue_parse() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Cron -> worker
-- Segredos no Vault: 'worker_url' e 'worker_secret'. Sem eles, o tick não faz nada
-- (ambiente local sem app rodando, por exemplo).
-- ---------------------------------------------------------------------------

create function public.tick_worker() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'worker_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'worker_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_secret,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  );
end $$;

revoke all on function public.tick_worker() from public, anon, authenticated;

select cron.schedule('pipeline-tick', '* * * * *', 'select public.tick_worker()');
