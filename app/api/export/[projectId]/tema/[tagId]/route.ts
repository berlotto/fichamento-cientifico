import { tagMarkdown, tagRows } from "@/lib/export/tag-export";
import { loadTagContent } from "@/lib/export/tag-view";
import { buildXlsx } from "@/lib/export/xlsx";
import { createClient } from "@/lib/supabase/server";

/** Exporta um tema (spec 003): ?format=xlsx | md. RLS: só o que é do usuário. */
export async function GET(request: Request, { params }: RouteContext<"/api/export/[projectId]/tema/[tagId]">) {
  const { projectId, tagId } = await params;
  const format = new URL(request.url).searchParams.get("format") ?? "xlsx";

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return Response.json({ error: "unauthorized" }, { status: 401 });

  const content = await loadTagContent(supabase, projectId, tagId);
  if (!content) return Response.json({ error: "not found" }, { status: 404 });

  const base =
    content.tag.name
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 60) || "tema";
  const send = (body: BodyInit, type: string, ext: string) =>
    new Response(body, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="tema-${base}.${ext}"`,
        "Cache-Control": "no-store",
      },
    });

  if (format === "md") return send(tagMarkdown(content), "text/markdown; charset=utf-8", "md");
  if (format === "xlsx") {
    const { rows, widths } = tagRows(content);
    const bytes = buildXlsx(content.tag.name.slice(0, 31), rows, widths);
    return send(new Blob([bytes.buffer as ArrayBuffer]), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx");
  }
  return Response.json({ error: "formato inválido" }, { status: 400 });
}
