import { createClient } from "@/lib/supabase/server";

/**
 * Backup em JSON dos dados do usuário (RLS: só o que é dele).
 * Fichas e citações entram aqui quando existirem (F1: field_templates, cells).
 * O texto das páginas e os PDFs ficam de fora: são reconstruíveis a partir do PDF.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return Response.json({ error: "unauthorized" }, { status: 401 });

  const [projects, articles] = await Promise.all([
    supabase.from("projects").select("id, name, created_at").order("created_at"),
    supabase
      .from("articles")
      .select(
        "id, project_id, sha256, original_filename, doi, citekey, title, authors, year, venue, metadata_source, status, page_count, notes, created_at, updated_at",
      )
      .order("created_at"),
  ]);
  if (projects.error || articles.error) {
    return Response.json({ error: "backup failed" }, { status: 500 });
  }

  const now = new Date();
  const body = {
    format: "fichamento-backup",
    version: 1,
    exported_at: now.toISOString(),
    projects: projects.data,
    articles: articles.data,
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
