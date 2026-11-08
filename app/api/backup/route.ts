import { createClient } from "@/lib/supabase/server";

/**
 * Backup em JSON dos dados do usuário (RLS: só o que é dele).
 * Inclui os campos da ficha (article_fields) com trecho e página.
 * O texto das páginas e os PDFs ficam de fora: são reconstruíveis a partir do PDF.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return Response.json({ error: "unauthorized" }, { status: 401 });

  const [projects, articles, fields] = await Promise.all([
    supabase.from("projects").select("id, name, created_at").order("created_at"),
    supabase
      .from("articles")
      .select(
        "id, project_id, sha256, original_filename, source_url, doi, citekey, title, subtitle, authors, year, venue, volume, issue, pages, language, metadata_source, status, page_count, notes, created_at, updated_at",
      )
      .order("created_at"),
    supabase
      .from("article_fields")
      .select("article_id, key, value, quote, pdf_page, printed_page, verified, source, model, created_at"),
  ]);
  if (projects.error || articles.error || fields.error) {
    return Response.json({ error: "backup failed" }, { status: 500 });
  }

  const now = new Date();
  const body = {
    format: "fichamento-backup",
    version: 2,
    exported_at: now.toISOString(),
    projects: projects.data,
    articles: articles.data,
    article_fields: fields.data,
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
