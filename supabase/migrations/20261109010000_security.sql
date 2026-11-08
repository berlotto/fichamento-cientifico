-- Segurança: recomendações do Supabase (Security Advisor) e limites contra abuso.

-- ---------------------------------------------------------------------------
-- 1. Funções auxiliares de RLS fora da API
-- Tudo em `public` vira /rest/v1/rpc/<função>. owns_project/owns_article só
-- servem às políticas; num schema não exposto deixam de ser chamáveis pela API.
-- As políticas referenciam a função pelo OID e continuam funcionando.
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

alter function public.owns_project(uuid) set schema private;
alter function public.owns_article(uuid) set schema private;
revoke all on function private.owns_project(uuid) from public, anon;
revoke all on function private.owns_article(uuid) from public, anon;
grant execute on function private.owns_project(uuid) to authenticated, service_role;
grant execute on function private.owns_article(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. pg_net fora de `public` (lint 0014). As funções continuam no schema `net`,
-- então tick_worker() não muda. Perde só o histórico de respostas HTTP.
-- ---------------------------------------------------------------------------
drop extension if exists pg_net;
create extension pg_net schema extensions;

-- ---------------------------------------------------------------------------
-- 3. Limites por usuário (cada artigo custa uma chamada de LLM)
-- ---------------------------------------------------------------------------
create function private.enforce_article_quota() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  recent int;
begin
  -- Inserções do service role (worker, scripts) não têm auth.uid().
  if uid is null then
    return new;
  end if;
  select count(*) into recent
  from public.articles a
  join public.projects p on p.id = a.project_id
  where p.owner_id = uid and a.created_at > now() - interval '24 hours';
  if recent >= 100 then
    raise exception 'Limite de 100 artigos por dia atingido. Tente novamente amanhã.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;

revoke all on function private.enforce_article_quota() from public, anon, authenticated;

create trigger articles_quota before insert on public.articles
  for each row execute function private.enforce_article_quota();

-- Arquivos no Storage: no máximo 1000 PDFs por usuário (50 MB cada).
create function private.pdf_quota_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select count(*) < 1000 from storage.objects
  where bucket_id = 'pdfs' and owner_id = (select auth.uid())::text
$$;
revoke all on function private.pdf_quota_ok() from public, anon;
grant execute on function private.pdf_quota_ok() to authenticated;

drop policy pdfs_insert_own on storage.objects;
create policy pdfs_insert_own on storage.objects for insert to authenticated
  with check (
    bucket_id = 'pdfs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.pdf_quota_ok()
  );

-- Projetos: no máximo 200 por usuário.
create function private.enforce_project_quota() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null
     and (select count(*) from public.projects where owner_id = (select auth.uid())) >= 200 then
    raise exception 'Limite de 200 projetos atingido.' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function private.enforce_project_quota() from public, anon, authenticated;

create trigger projects_quota before insert on public.projects
  for each row execute function private.enforce_project_quota();

-- ---------------------------------------------------------------------------
-- 4. Validação de dados gravados pelo cliente
-- ---------------------------------------------------------------------------
-- source_url vira link na ficha: só http(s), nunca javascript: ou data:.
alter table public.articles add constraint articles_source_url_http
  check (source_url is null or source_url ~* '^https?://');

-- Tamanhos máximos dos campos que o usuário pode editar.
alter table public.articles add constraint articles_text_sizes check (
  coalesce(length(title), 0) <= 1000
  and coalesce(length(subtitle), 0) <= 1000
  and coalesce(length(venue), 0) <= 500
  and coalesce(length(notes), 0) <= 20000
  and coalesce(length(original_filename), 0) <= 300
  and coalesce(length(source_url), 0) <= 2000
);
alter table public.projects add constraint projects_name_size check (length(name) <= 200);
