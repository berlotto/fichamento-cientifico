import { abntList, bibFile, loadProjectTable, tableRows } from "@/lib/export/project-table";
import { buildCsv, buildXlsx } from "@/lib/export/xlsx";
import { createClient } from "@/lib/supabase/server";

/** Exporta o projeto: ?format=xlsx | csv | bib | abnt. RLS: só projetos do usuário. */
export async function GET(request: Request, { params }: RouteContext<"/api/export/[projectId]">) {
  const { projectId } = await params;
  const format = new URL(request.url).searchParams.get("format") ?? "xlsx";

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return Response.json({ error: "unauthorized" }, { status: 401 });

  const table = await loadProjectTable(supabase, projectId);
  if (!table) return Response.json({ error: "not found" }, { status: 404 });

  const base =
    table.name
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 60) || "projeto";

  const send = (body: BodyInit, type: string, ext: string) =>
    new Response(body, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="${base}.${ext}"`,
        "Cache-Control": "no-store",
      },
    });

  switch (format) {
    case "csv":
      return send(buildCsv(tableRows(table).rows), "text/csv; charset=utf-8", "csv");
    case "bib":
      return send(bibFile(table), "application/x-bibtex; charset=utf-8", "bib");
    case "abnt":
      return send(abntList(table), "text/plain; charset=utf-8", "referencias-abnt.txt");
    case "xlsx": {
      const { rows, widths } = tableRows(table);
      const bytes = buildXlsx(table.name, rows, widths);
      return send(
        new Blob([bytes.buffer as ArrayBuffer]),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "xlsx",
      );
    }
    default:
      return Response.json({ error: "formato inválido" }, { status: 400 });
  }
}
