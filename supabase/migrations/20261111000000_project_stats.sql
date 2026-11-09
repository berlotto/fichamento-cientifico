-- Números da visão geral do projeto somados no banco: a tela recebe só os
-- totais, em vez de todas as linhas de article_fields e llm_runs do projeto.
-- security definer para não pagar a RLS linha a linha; a posse do projeto é
-- conferida uma vez no início (quem não é dono recebe null).

create function public.project_stats(p_project uuid)
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

revoke all on function public.project_stats(uuid) from public, anon;
grant execute on function public.project_stats(uuid) to authenticated;

-- Índice para as somas de custo por artigo já existe (llm_runs_article_idx);
-- article_fields usa a PK (article_id, key).
