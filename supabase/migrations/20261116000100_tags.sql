-- Spec 003: tags (temas) por projeto e marcações em artigo, campo da ficha
-- ou citação à mão.

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  -- Um nível só (tema > subtema). Excluir o tema solta os subtemas.
  parent_id uuid references public.tags(id) on delete set null,
  name text not null check (length(trim(name)) between 1 and 60),
  color text not null default 'green'
    check (color in ('green', 'blue', 'amber', 'red', 'violet', 'gray')),
  description text check (length(description) <= 500),
  created_at timestamptz not null default now(),
  check (parent_id is distinct from id)
);

create unique index tags_project_name on public.tags (project_id, lower(trim(name)));
create index tags_parent on public.tags (parent_id);

-- Alvo: o artigo sempre (para o cascade e a RLS); mais o campo OU a citação.
-- Sem campo e sem citação, a marcação vale para o artigo inteiro.
create table public.taggings (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references public.tags(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  field_key text check (field_key ~ '^[a-z][a-z0-9_]{1,39}$'),
  quote_id uuid references public.quotes(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (field_key is null or quote_id is null)
);

create unique index taggings_target on public.taggings (
  tag_id, article_id, coalesce(field_key, ''), coalesce(quote_id, '00000000-0000-0000-0000-000000000000'::uuid)
);
create index taggings_article on public.taggings (article_id);

alter table public.tags enable row level security;
create policy own_tags on public.tags for all to authenticated
  using (private.owns_project(project_id))
  with check (private.owns_project(project_id));

alter table public.taggings enable row level security;
create policy own_taggings on public.taggings for all to authenticated
  using (private.owns_article(article_id))
  with check (private.owns_article(article_id));

revoke all on public.tags, public.taggings from anon;
revoke update on public.tags, public.taggings from authenticated;
grant select, insert, delete on public.tags, public.taggings to authenticated;
grant update (name, color, description, parent_id) on public.tags to authenticated;
grant update (tag_id) on public.taggings to authenticated;

-- Regras que a RLS não cobre: subtema no mesmo projeto e sem netos; limite
-- de 300 tags por projeto.
create function private.tags_check() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent public.tags%rowtype;
begin
  if tg_op = 'UPDATE' and new.project_id <> old.project_id then
    raise exception 'a tag não muda de projeto' using errcode = 'check_violation';
  end if;
  if new.parent_id is not null then
    select * into parent from public.tags where id = new.parent_id;
    if parent.project_id is distinct from new.project_id then
      raise exception 'tema de outro projeto' using errcode = 'check_violation';
    end if;
    if parent.parent_id is not null then
      raise exception 'só um nível de subtema' using errcode = 'check_violation';
    end if;
    if exists (select 1 from public.tags where parent_id = new.id) then
      raise exception 'uma tag com subtemas não pode virar subtema' using errcode = 'check_violation';
    end if;
  end if;
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtextextended(new.project_id::text, 1));
    if (select count(*) from public.tags where project_id = new.project_id) >= 300 then
      raise exception 'limite de 300 tags por projeto' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger tags_check before insert or update on public.tags
  for each row execute function private.tags_check();

-- A tag e o alvo precisam ser do mesmo projeto; a citação, do mesmo artigo.
create function private.taggings_check() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.tags t join public.articles a on a.project_id = t.project_id
    where t.id = new.tag_id and a.id = new.article_id
  ) then
    raise exception 'tag e artigo de projetos diferentes' using errcode = 'check_violation';
  end if;
  if new.quote_id is not null
     and not exists (select 1 from public.quotes where id = new.quote_id and article_id = new.article_id) then
    raise exception 'citação de outro artigo' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger taggings_check before insert or update on public.taggings
  for each row execute function private.taggings_check();

-- Juntar a tag `src` em `dst`: move as marcações (sem duplicar), passa os
-- subtemas para `dst` (ou para o tema de `dst`, se ela já for subtema) e
-- apaga `src`. security invoker: tudo passa pela RLS de quem chama.
create function public.merge_tags(src uuid, dst uuid) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  s public.tags%rowtype;
  d public.tags%rowtype;
begin
  select * into s from public.tags where id = src;
  select * into d from public.tags where id = dst;
  if s.id is null or d.id is null or s.project_id <> d.project_id or s.id = d.id then
    raise exception 'tags inválidas para juntar' using errcode = 'check_violation';
  end if;

  update public.taggings t set tag_id = dst
  where t.tag_id = src
    and not exists (
      select 1 from public.taggings x
      where x.tag_id = dst and x.article_id = t.article_id
        and x.field_key is not distinct from t.field_key
        and x.quote_id is not distinct from t.quote_id
    );
  delete from public.taggings where tag_id = src;

  if d.parent_id = src then
    update public.tags set parent_id = null where id = dst;
    d.parent_id := null;
  end if;
  update public.tags set parent_id = coalesce(d.parent_id, dst)
  where parent_id = src and id <> dst;

  delete from public.tags where id = src;
end;
$$;

revoke all on function public.merge_tags(uuid, uuid) from public, anon;
grant execute on function public.merge_tags(uuid, uuid) to authenticated;
