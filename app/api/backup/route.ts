import { createClient } from "@/lib/supabase/server";

/**
 * Backup em JSON dos dados do usuário (RLS: só o que é dele).
 * Inclui os campos da ficha (article_fields) com trecho e página, os comentários
 * por campo e a análise crítica (spec 001).
 * O texto das páginas e os PDFs ficam de fora: são reconstruíveis a partir do PDF.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return Response.json({ error: "unauthorized" }, { status: 401 });

  const [projects, articles, fields, comments] = await Promise.all([
    supabase.from("projects").select("id, name, created_at").order("created_at"),
    supabase
      .from("articles")
      .select(
        "id, project_id, sha256, original_filename, source_url, doi, citekey, title, subtitle, authors, year, venue, volume, issue, pages, language, metadata_source, status, page_count, notes, crit_strengths, crit_weaknesses, crit_relevance, created_at, updated_at",
      )
      .order("created_at"),
    supabase
      .from("article_fields")
      .select("article_id, key, value, quote, pdf_page, printed_page, verified, source, model, created_at"),
    supabase.from("field_comments").select("article_id, field_key, body, updated_at"),
  ]);
  if (projects.error || articles.error || fields.error || comments.error) {
    return Response.json({ error: "backup failed" }, { status: 500 });
  }

  const now = new Date();
  const body = {
    format: "fichamento-backup",
    version: 3,
    exported_at: now.toISOString(),
    projects: projects.data,
    articles: articles.data,
    article_fields: fields.data,
    field_comments: comments.data,
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
