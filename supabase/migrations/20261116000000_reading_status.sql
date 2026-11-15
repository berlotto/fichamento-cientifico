-- Spec 004: situação de leitura, relevância e prioridade (estrela).
-- São do pesquisador e independentes do status do pipeline (articles.status).

alter table public.articles
  add column reading_status text not null default 'to_read'
    check (reading_status in ('to_read', 'reading', 'read', 'noted', 'discarded')),
  add column relevance text check (relevance in ('central', 'support', 'peripheral')),
  add column starred boolean not null default false;

-- Só estas colunas: o status do pipeline continua fora do alcance do usuário.
grant update (reading_status, relevance, starred) on public.articles to authenticated;

create index articles_project_reading on public.articles (project_id, reading_status);

-- Totais da visão do projeto: acrescenta situação de leitura, relevância e estrela.
create or replace function public.project_stats(p_project uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when not private.owns_project(p_project) then null else jsonb_build_object(
    'total', (select count(*) from public.articles where project_id = p_project),
    'extracted', (select count(*) from public.articles
                  where project_id = p_project
                    and status in ('extracted', 'needs_review', 'verified', 'failed')),
    'reviewed', (select count(*) from public.articles where project_id = p_project and status = 'verified'),
    'cost', (select coalesce(sum(r.cost_usd), 0) from public.llm_runs r
             join public.articles a on a.id = r.article_id where a.project_id = p_project),
    'costed_articles', (select count(distinct r.article_id) from public.llm_runs r
                        join public.articles a on a.id = r.article_id where a.project_id = p_project),
    'audit_queue', (select count(*) from public.article_fields f
                    join public.articles a on a.id = f.article_id
                    where a.project_id = p_project and f.audit_pending),
    'reading', coalesce((
      select jsonb_object_agg(reading_status, n) from (
        select reading_status, count(*) as n from public.articles
        where project_id = p_project group by reading_status
      ) r
    ), '{}'::jsonb),
    'relevance', coalesce((
      select jsonb_object_agg(relevance, n) from (
        select relevance, count(*) as n from public.articles
        where project_id = p_project and relevance is not null and reading_status <> 'discarded'
        group by relevance
      ) r
    ), '{}'::jsonb),
    'starred', (select count(*) from public.articles
                where project_id = p_project and starred and reading_status <> 'discarded'),
    'quality', coalesce((
      select jsonb_agg(q) from (
        select f.key,
          count(*) as total,
          count(*) filter (where f.status <> 'pending') as reviewed,
          -- Aprovação automática não conta como revisão humana.
          count(*) filter (where f.status = 'accepted' and not f.edited and not f.auto_approved) as as_is,
          count(*) filter (where f.auto_approved) as auto,
          count(*) filter (where f.agrees is not null) as checked,
          count(*) filter (where f.agrees) as agree,
          count(*) filter (where f.audit_result is not null) as audited,
          count(*) filter (where f.audit_result = 'incorrect') as audit_wrong,
          count(*) filter (where f.status <> 'pending' and f.edited) as edited,
          count(*) filter (where f.status = 'rejected') as rejected,
          count(*) filter (where f.verified) as verified
        from public.article_fields f
        join public.articles a on a.id = f.article_id
        where a.project_id = p_project
        group by f.key
      ) q
    ), '[]'::jsonb)
  ) end
$$;
