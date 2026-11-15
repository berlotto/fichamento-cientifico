import { createClient } from "@/lib/supabase/server";

/**
 * Backup em JSON dos dados do usuário (RLS: só o que é dele).
 * Inclui os campos da ficha (article_fields) com trecho e página, os comentários
 * por campo, a análise crítica (spec 001), as citações à mão (spec 002), as tags
 * (spec 003), a situação de leitura (spec 004), os campos opcionais (spec 005), o
 * glossário (spec 006) e os campos personalizados.
 * O texto das páginas e os PDFs ficam de fora: são reconstruíveis a partir do PDF.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return Response.json({ error: "unauthorized" }, { status: 401 });

  const [projects, articles, fields, comments, quotes, tags, taggings, concepts, definitions, projectFields] = await Promise.all([
    supabase.from("projects").select("id, name, optional_fields, created_at").order("created_at"),
    supabase
      .from("articles")
      .select(
        "id, project_id, sha256, original_filename, source_url, doi, citekey, title, subtitle, authors, year, venue, volume, issue, pages, language, metadata_source, status, page_count, notes, crit_strengths, crit_weaknesses, crit_relevance, reading_status, relevance, starred, created_at, updated_at",
      )
      .order("created_at"),
    supabase
      .from("article_fields")
      .select("article_id, key, value, quote, pdf_page, printed_page, verified, source, model, created_at"),
    supabase.from("field_comments").select("article_id, field_key, body, updated_at"),
    supabase.from("quotes").select("id, article_id, text, pdf_page, printed_page, comment, created_at, updated_at"),
    supabase.from("tags").select("id, project_id, parent_id, name, color, description, created_at"),
    supabase.from("taggings").select("tag_id, article_id, field_key, quote_id, created_at"),
    supabase.from("concepts").select("id, project_id, name, notes, created_at"),
    supabase
      .from("definitions")
      .select("concept_id, article_id, text, text_translated, pdf_page, printed_page, origin, cited_ref, kind, verified, status, source, created_at"),
    supabase.from("project_fields").select("project_id, key, label, instructions, position"),
  ]);
  if ([projects, articles, fields, comments, quotes, tags, taggings, concepts, definitions, projectFields].some((r) => r.error)) {
    return Response.json({ error: "backup failed" }, { status: 500 });
  }

  const now = new Date();
  const body = {
    format: "fichamento-backup",
    version: 6,
    exported_at: now.toISOString(),
    projects: projects.data,
    articles: articles.data,
    article_fields: fields.data,
    field_comments: comments.data,
    quotes: quotes.data,
    tags: tags.data,
    taggings: taggings.data,
    concepts: concepts.data,
    definitions: definitions.data,
    project_fields: projectFields.data,
  };
  const file = `fichamento-backup-${now.toISOString().slice(0, 10)}.json`;

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "no-store",
    },
  });
}
