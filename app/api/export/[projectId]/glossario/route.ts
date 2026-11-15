import { loadGlossary } from "@/lib/export/glossary";
import { glossaryMarkdown, glossaryRows } from "@/lib/export/glossary-export";
import { buildXlsx } from "@/lib/export/xlsx";
import { createClient } from "@/lib/supabase/server";

/** Exporta o glossário do projeto (spec 006): ?format=xlsx | md. RLS: só o que é do usuário. */
export async function GET(request: Request, { params }: RouteContext<"/api/export/[projectId]/glossario">) {
  const { projectId } = await params;
  const format = new URL(request.url).searchParams.get("format") ?? "xlsx";

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return Response.json({ error: "unauthorized" }, { status: 401 });

  const glossary = await loadGlossary(supabase, projectId);
  if (!glossary) return Response.json({ error: "not found" }, { status: 404 });

  const send = (body: BodyInit, type: string, ext: string) =>
    new Response(body, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="glossario.${ext}"`,
        "Cache-Control": "no-store",
      },
    });

  if (format === "md") return send(glossaryMarkdown(glossary.name, glossary.concepts), "text/markdown; charset=utf-8", "md");
  if (format === "xlsx") {
    const { rows, widths } = glossaryRows(glossary.concepts);
    const bytes = buildXlsx("Glossário", rows, widths);
    return send(new Blob([bytes.buffer as ArrayBuffer]), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx");
  }
  return Response.json({ error: "formato inválido" }, { status: 400 });
}
