import "server-only";

import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * A11: apaga do Storage os PDFs que nenhum artigo do usuário usa mais.
 * O mesmo arquivo (mesmo sha256) pode estar em mais de um projeto, então só
 * remove depois de conferir que não sobrou referência. Falha aqui não desfaz a
 * exclusão do artigo: no pior caso fica um arquivo órfão.
 */
export async function removeUnreferencedPdfs(supabase: Client, paths: string[]): Promise<void> {
  const unique = [...new Set(paths)];
  if (unique.length === 0) return;
  const { data: still } = await supabase.from("articles").select("storage_path").in("storage_path", unique);
  const used = new Set((still ?? []).map((r) => r.storage_path));
  const orphans = unique.filter((p) => !used.has(p));
  if (orphans.length) await supabase.storage.from("pdfs").remove(orphans);
}
