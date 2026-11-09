-- Administração do serviço (SaaS): admin, modelos de IA configuráveis, limites
-- e teto de gasto por usuário, registro de gasto por usuário.

-- ---------------------------------------------------------------------------
-- 1. Admin: app_metadata.role = 'admin'. Só o service role altera app_metadata
--    (o usuário edita user_metadata, nunca app_metadata).
-- ---------------------------------------------------------------------------
create function private.is_admin() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Configurações do serviço (uma linha só)
-- ---------------------------------------------------------------------------
create table public.app_settings (
  id boolean primary key default true check (id),
  -- Modelos (null: variável de ambiente; sem ela, o padrão do código).
  extract_model text,
  -- null: automático, de outro fornecedor que o extrator.
  cross_model text,
  judge_model text,
  -- Teto de gasto do serviço inteiro no mês (null: sem teto).
  monthly_budget_usd numeric(10, 2) check (monthly_budget_usd >= 0),
  -- Limites padrão de cada usuário (cada um pode ter exceção em user_limits).
  user_monthly_budget_usd numeric(10, 2) default 5 check (user_monthly_budget_usd >= 0),
  articles_per_day int not null default 100 check (articles_per_day >= 0),
  extractions_per_day int not null default 150 check (extractions_per_day >= 0),
  max_pdfs int not null default 1000 check (max_pdfs >= 0),
  max_projects int not null default 200 check (max_projects >= 0),
  max_fields_per_project int not null default 20 check (max_fields_per_project between 0 and 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint app_settings_models check (
    (extract_model is null or extract_model ~ '^[a-z0-9-]+/[A-Za-z0-9._:-]{1,100}$')
    and (cross_model is null or cross_model ~ '^[a-z0-9-]+/[A-Za-z0-9._:-]{1,100}$')
    and (judge_model is null or judge_model ~ '^[a-z0-9-]+/[A-Za-z0-9._:-]{1,100}$')
  )
);
insert into public.app_settings default values;

alter table public.app_settings enable row level security;
create policy app_settings_admin_select on public.app_settings for select to authenticated
  using ((select private.is_admin()));
create policy app_settings_admin_update on public.app_settings for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
revoke all on public.app_settings from anon, authenticated;
grant select on public.app_settings to authenticated;
grant update (
  extract_model, cross_model, judge_model, monthly_budget_usd, user_monthly_budget_usd,
  articles_per_day, extractions_per_day, max_pdfs, max_projects, max_fields_per_project,
  updated_at, updated_by
) on public.app_settings to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Exceções por usuário (null: vale o padrão de app_settings)
-- ---------------------------------------------------------------------------
create table public.user_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  monthly_budget_usd numeric(10, 2) check (monthly_budget_usd >= 0),
  -- Sem teto de gasto (ex.: o próprio admin).
  unlimited_budget boolean not null default false,
  articles_per_day int check (articles_per_day >= 0),
  extractions_per_day int check (extractions_per_day >= 0),
  max_pdfs int check (max_pdfs >= 0),
  max_projects int check (max_projects >= 0),
  -- Bloqueado: não envia artigos nem gasta com IA.
  blocked boolean not null default false,
  note text check (length(note) <= 500),
  updated_at timestamptz not null default now()
);

alter table public.user_limits enable row level security;
create policy user_limits_admin on public.user_limits for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
revoke all on public.user_limits from anon, authenticated;
grant select, insert, update, delete on public.user_limits to authenticated;

/** Limites em vigor para o usuário (exceção, senão padrão). */
create function private.effective_limits(uid uuid)
returns table (
  monthly_budget_usd numeric,
  articles_per_day int,
  extractions_per_day int,
  max_pdfs int,
  max_projects int,
  blocked boolean
)
language sql stable security definer set search_path = '' as $$
  select
    case when coalesce(l.unlimited_budget, false) then null
         else coalesce(l.monthly_budget_usd, s.user_monthly_budget_usd) end,
    coalesce(l.articles_per_day, s.articles_per_day),
    coalesce(l.extractions_per_day, s.extractions_per_day),
    coalesce(l.max_pdfs, s.max_pdfs),
    coalesce(l.max_projects, s.max_projects),
    coalesce(l.blocked, false)
  from public.app_settings s
  left join public.user_limits l on l.user_id = uid
$$;
revoke all on function private.effective_limits(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Gasto por usuário: llm_runs ganha user_id e deixa de sumir quando o
--    artigo é excluído (o gasto aconteceu e conta no mês).
-- ---------------------------------------------------------------------------
alter table public.llm_runs add column user_id uuid references auth.users(id) on delete set null;

update public.llm_runs r set user_id = p.owner_id
from public.articles a join public.projects p on p.id = a.project_id
where a.id = r.article_id;

alter table public.llm_runs drop constraint llm_runs_article_id_fkey;
alter table public.llm_runs alter column article_id drop not null;
alter table public.llm_runs add constraint llm_runs_article_id_fkey
  foreign key (article_id) references public.articles(id) on delete set null;

create index llm_runs_user_idx on public.llm_runs (user_id, created_at);
create index llm_runs_created_idx on public.llm_runs (created_at);

-- O worker grava só o artigo; o dono é preenchido aqui.
create function private.llm_runs_fill_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is null and new.article_id is not null then
    select p.owner_id into new.user_id
    from public.articles a join public.projects p on p.id = a.project_id
    where a.id = new.article_id;
  end if;
  return new;
end $$;
revoke all on function private.llm_runs_fill_user() from public, anon, authenticated;
create trigger llm_runs_fill_user before insert on public.llm_runs
  for each row execute function private.llm_runs_fill_user();

drop policy select_own_runs on public.llm_runs;
create policy select_own_runs on public.llm_runs for select to authenticated
  using (user_id = (select auth.uid()));

create function private.month_cost(uid uuid) returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(cost_usd), 0) from public.llm_runs
  where user_id = uid and created_at >= date_trunc('month', now())
$$;
revoke all on function private.month_cost(uuid) from public, anon, authenticated;

create function private.total_month_cost() returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(cost_usd), 0) from public.llm_runs where created_at >= date_trunc('month', now())
$$;
revoke all on function private.total_month_cost() from public, anon, authenticated;

/**
 * Motivo para NÃO gastar com IA agora (null: pode). Usado no envio, na
 * reextração e pelo worker antes de cada chamada.
 */
create function private.llm_block_reason(uid uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  lim record;
  global_budget numeric;
begin
  select * into lim from private.effective_limits(uid);
  if lim.blocked then
    return 'Sua conta está bloqueada para novas extrações. Fale com o administrador.';
  end if;
  if lim.monthly_budget_usd is not null and private.month_cost(uid) >= lim.monthly_budget_usd then
    return 'Limite mensal de gasto com IA da sua conta atingido.';
  end if;
  select monthly_budget_usd into global_budget from public.app_settings;
  if global_budget is not null and private.total_month_cost() >= global_budget then
    return 'O serviço atingiu o limite de gasto com IA deste mês. Tente de novo mais tarde.';
  end if;
  return null;
end $$;
revoke all on function private.llm_block_reason(uuid) from public, anon, authenticated;

/** Para o worker (service role): pode gastar com IA neste artigo? */
create function public.llm_block_reason_for_article(article uuid) returns text
language sql stable security definer set search_path = '' as $$
  select private.llm_block_reason(p.owner_id)
  from public.articles a join public.projects p on p.id = a.project_id
  where a.id = article
$$;
revoke all on function public.llm_block_reason_for_article(uuid) from public, anon, authenticated;
grant execute on function public.llm_block_reason_for_article(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Limites passam a vir da configuração
-- ---------------------------------------------------------------------------
create or replace function private.enforce_article_quota() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  recent int;
  lim record;
  reason text;
begin
  -- Inserções do service role (worker, scripts) não têm auth.uid().
  if uid is null then
    return new;
  end if;
  reason := private.llm_block_reason(uid);
  if reason is not null then
    raise exception '%', reason using errcode = 'P0001';
  end if;
  select * into lim from private.effective_limits(uid);
  select count(*) into recent
  from public.articles a
  join public.projects p on p.id = a.project_id
  where p.owner_id = uid and a.created_at > now() - interval '24 hours';
  if recent >= lim.articles_per_day then
    raise exception 'Limite de % artigos por dia atingido. Tente novamente amanhã.', lim.articles_per_day
      using errcode = 'P0001';
  end if;
  return new;
end $$;

create or replace function private.pdf_quota_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select count(*) < (select max_pdfs from private.effective_limits((select auth.uid())))
  from storage.objects
  where bucket_id = 'pdfs' and owner_id = (select auth.uid())::text
$$;

create or replace function private.enforce_project_quota() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  lim int;
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  select max_projects into lim from private.effective_limits((select auth.uid()));
  if (select count(*) from public.projects where owner_id = (select auth.uid())) >= lim then
    raise exception 'Limite de % projetos atingido.', lim using errcode = 'P0001';
  end if;
  return new;
end $$;

create or replace function private.enforce_project_fields_quota() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  lim int;
begin
  select max_fields_per_project into lim from public.app_settings;
  if (select count(*) from public.project_fields where project_id = new.project_id) >= lim then
    raise exception 'Limite de % campos personalizados por projeto.', lim using errcode = 'P0001';
  end if;
  return new;
end $$;

create or replace function public.request_extract(article uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  runs int;
  lim record;
  reason text;
begin
  if not private.owns_article(article) then
    raise exception 'Artigo não encontrado.' using errcode = 'P0001';
  end if;
  reason := private.llm_block_reason(uid);
  if reason is not null then
    raise exception '%', reason using errcode = 'P0001';
  end if;
  select * into lim from private.effective_limits(uid);
  -- Cada extração é uma chamada paga.
  select count(*) into runs
  from public.llm_runs r
  where r.user_id = uid and r.stage = 'extract' and r.created_at > now() - interval '24 hours';
  if runs >= lim.extractions_per_day then
    raise exception 'Limite diário de extrações atingido. Tente novamente amanhã.' using errcode = 'P0001';
  end if;
  update public.articles set status = 'parsed', error = null
  where id = article and status in ('extracted', 'needs_review', 'verified', 'failed');
  perform pgmq.send('pipeline', jsonb_build_object('article_id', article, 'stage', 'extract'));
end $$;

-- ---------------------------------------------------------------------------
-- 6. Uso: o próprio usuário e, para o admin, todos
-- ---------------------------------------------------------------------------
create function public.my_usage() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  lim record;
begin
  if uid is null then
    return null;
  end if;
  select * into lim from private.effective_limits(uid);
  return jsonb_build_object(
    'month_cost', private.month_cost(uid),
    'monthly_budget', lim.monthly_budget_usd,
    'blocked', lim.blocked,
    'articles_today', (
      select count(*) from public.articles a join public.projects p on p.id = a.project_id
      where p.owner_id = uid and a.created_at > now() - interval '24 hours'),
    'articles_per_day', lim.articles_per_day,
    'extractions_today', (
      select count(*) from public.llm_runs
      where user_id = uid and stage = 'extract' and created_at > now() - interval '24 hours'),
    'extractions_per_day', lim.extractions_per_day,
    'pdfs', (select count(*) from storage.objects where bucket_id = 'pdfs' and owner_id = uid::text),
    'max_pdfs', lim.max_pdfs,
    'projects', (select count(*) from public.projects where owner_id = uid),
    'max_projects', lim.max_projects,
    'month_articles', (
      select count(distinct article_id) from public.llm_runs
      where user_id = uid and stage = 'extract' and created_at >= date_trunc('month', now()))
  );
end $$;
revoke all on function public.my_usage() from public, anon;
grant execute on function public.my_usage() to authenticated;

create function public.admin_users() returns table (
  user_id uuid,
  email text,
  full_name text,
  is_admin boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  projects bigint,
  articles bigint,
  month_cost numeric,
  total_cost numeric,
  month_runs bigint
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'Acesso restrito.' using errcode = '42501';
  end if;
  return query
  select
    u.id,
    u.email::text,
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    coalesce(u.raw_app_meta_data ->> 'role' = 'admin', false),
    u.created_at,
    u.last_sign_in_at,
    (select count(*) from public.projects p where p.owner_id = u.id),
    (select count(*) from public.articles a join public.projects p on p.id = a.project_id where p.owner_id = u.id),
    (select coalesce(sum(r.cost_usd), 0) from public.llm_runs r
      where r.user_id = u.id and r.created_at >= date_trunc('month', now())),
    (select coalesce(sum(r.cost_usd), 0) from public.llm_runs r where r.user_id = u.id),
    (select count(*) from public.llm_runs r
      where r.user_id = u.id and r.created_at >= date_trunc('month', now()))
  from auth.users u
  order by 9 desc, u.created_at;
end $$;
revoke all on function public.admin_users() from public, anon;
grant execute on function public.admin_users() to authenticated;

/** Chamadas de IA de um usuário (admin) — o usuário vê as suas direto em llm_runs. */
create function public.admin_user_runs(uid uuid, max_rows int default 100) returns table (
  id bigint,
  created_at timestamptz,
  stage text,
  model text,
  input_tokens int,
  output_tokens int,
  cost_usd numeric,
  latency_ms int,
  article_id uuid,
  article_title text
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'Acesso restrito.' using errcode = '42501';
  end if;
  return query
  select r.id, r.created_at, r.stage, r.model, r.input_tokens, r.output_tokens, r.cost_usd, r.latency_ms,
         r.article_id, coalesce(a.title, a.original_filename)
  from public.llm_runs r
  left join public.articles a on a.id = r.article_id
  where r.user_id = uid
  order by r.id desc
  limit least(greatest(max_rows, 1), 500);
end $$;
revoke all on function public.admin_user_runs(uuid, int) from public, anon;
grant execute on function public.admin_user_runs(uuid, int) to authenticated;

/** Gasto do mês por modelo (admin). */
create function public.admin_month_by_model() returns table (model text, runs bigint, cost_usd numeric)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'Acesso restrito.' using errcode = '42501';
  end if;
  return query
  select r.model, count(*), coalesce(sum(r.cost_usd), 0)
  from public.llm_runs r
  where r.created_at >= date_trunc('month', now())
  group by r.model
  order by 3 desc;
end $$;
revoke all on function public.admin_month_by_model() from public, anon;
grant execute on function public.admin_month_by_model() to authenticated;
