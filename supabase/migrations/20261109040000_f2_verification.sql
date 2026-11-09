-- F2: verificação automática. Segundo extrator (outro fornecedor), juiz,
-- aprovação automática opcional por projeto e auditoria às cegas.

alter table public.projects
  -- Rodar o segundo extrator + juiz depois da extração.
  add column cross_check boolean not null default true,
  -- Aprovar sozinho o campo que passou em todas as verificações (opt-in).
  add column auto_approve boolean not null default false,
  -- Campos que nunca são aprovados sozinhos.
  add column critical_fields text[] not null default array['results']::text[],
  -- Fração das aprovações automáticas que vai para auditoria às cegas.
  add column audit_rate numeric(3, 2) not null default 0.10 check (audit_rate between 0 and 1);

alter table public.article_fields
  -- Segundo extrator.
  add column value_b text,
  add column model_b text,
  -- Juiz: os dois valores dizem o mesmo? o trecho sustenta o valor? é deste estudo?
  add column agrees boolean,
  add column supported boolean,
  add column from_study boolean,
  add column judge_note text,
  -- Aprovado pelo sistema (sem revisão humana).
  add column auto_approved boolean not null default false,
  -- Auditoria às cegas de uma aprovação automática.
  add column audit_pending boolean not null default false,
  add column audit_result text check (audit_result in ('correct', 'incorrect')),
  add column audit_answer text,
  add column audited_at timestamptz,
  add constraint article_fields_f2_sizes check (
    coalesce(length(value_b), 0) <= 20000 and coalesce(length(judge_note), 0) <= 2000
    and coalesce(length(audit_answer), 0) <= 5000
  );

grant update (cross_check, auto_approve, critical_fields, audit_rate) on public.projects to authenticated;
-- Revisão humana pode tirar a marca de aprovação automática; auditoria grava o resultado.
grant update (auto_approved, audit_pending, audit_result, audit_answer, audited_at)
  on public.article_fields to authenticated;

create index article_fields_audit_idx on public.article_fields (article_id) where audit_pending;
