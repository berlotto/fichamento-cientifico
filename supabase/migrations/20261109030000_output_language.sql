-- Idioma da ficha por projeto (a extração escreve nesse idioma, qualquer que
-- seja o idioma do artigo). Trechos citados continuam no original, porque são
-- conferidos no texto do PDF; a tradução fica ao lado.

alter table public.projects
  add column output_language text not null default 'pt-BR'
    check (output_language in ('pt-BR', 'pt-PT', 'en', 'es', 'fr', 'de', 'it'));

alter table public.article_fields
  -- Idioma em que o valor foi escrito.
  add column language text,
  -- Trecho traduzido para o idioma da ficha (null quando o artigo já está nele).
  add column quote_translated text,
  -- Texto original quando o valor é tradução de texto do artigo (resumo do autor).
  add column source_value text,
  add constraint article_fields_translation_sizes check (
    coalesce(length(quote_translated), 0) <= 5000 and coalesce(length(source_value), 0) <= 20000
  );

-- Editar o trecho original invalida a tradução (o app limpa).
grant update (quote_translated) on public.article_fields to authenticated;
