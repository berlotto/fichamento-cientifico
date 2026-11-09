import Link from "next/link";
import { Suspense } from "react";
import { BackIcon } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { displayTitle, shortCite } from "@/lib/citation";
import { BUILTIN_DEFINITIONS, fieldDefs } from "@/lib/fields";
import { createClient } from "@/lib/supabase/server";
import { AuditCard } from "./audit-card";

type Props = PageProps<"/projects/[id]/audit">;

/** Fila de auditoria às cegas das aprovações automáticas do projeto. */
async function Audit({ params }: Pick<Props, "params">) {
  const { id } = await params;
  await requireUser();
  const supabase = await createClient();

  const [{ data: queue }, { data: custom }] = await Promise.all([
    supabase
      .from("article_fields")
      .select(
        "article_id, key, value, quote, quote_translated, pdf_page, printed_page, articles!inner(project_id, title, subtitle, original_filename, authors, year)",
      )
      .eq("articles.project_id", id)
      .eq("audit_pending", true)
      .order("created_at"),
    supabase.from("project_fields").select("key, label, instructions").eq("project_id", id).order("position"),
  ]);

  const labels = new Map(fieldDefs(custom ?? []).map((d) => [d.key, d.label]));
  const instructions = new Map((custom ?? []).map((c) => [c.key, c.instructions]));
  const first = queue?.[0];

  return (
    <div data-pane="detail" className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-8 pt-5 pb-14 max-[860px]:px-5">
      <header className="flex flex-col gap-2">
        <div className="flex min-h-11 items-center">
          <Link href={`/projects/${id}`} className="icon-btn -ml-3" aria-label="Voltar ao projeto">
            <BackIcon />
          </Link>
        </div>
        <span className="eyebrow">Auditoria às cegas</span>
        <p className="m-0 text-sm text-muted">
          Algumas aprovações automáticas são sorteadas para conferência. Você lê o trecho e escreve o que entende antes
          de ver o valor aprovado, para não ser influenciado por ele. O resultado mede a taxa de erro real da aprovação
          automática, por campo.
        </p>
      </header>

      {first ? (
        <AuditCard
          key={`${first.article_id}:${first.key}`}
          remaining={queue!.length}
          item={{
            articleId: first.article_id,
            key: first.key,
            label: labels.get(first.key) ?? first.key,
            definition: BUILTIN_DEFINITIONS[first.key] ?? instructions.get(first.key) ?? "",
            cite: shortCite(first.articles) ?? "",
            title: displayTitle(first.articles) ?? first.articles.original_filename ?? "Sem título",
            value: first.value,
            quote: first.quote,
            quote_translated: first.quote_translated,
            pdf_page: first.pdf_page,
            printed_page: first.printed_page,
          }}
        />
      ) : (
        <p className="m-0 rounded-xl bg-page p-5 text-sm text-muted">Nada para auditar agora.</p>
      )}
    </div>
  );
}

export default function AuditPage(props: Props) {
  return (
    <Suspense fallback={<p data-pane="detail" className="m-0 p-8 text-sm text-muted">Carregando…</p>}>
      <Audit params={props.params} />
    </Suspense>
  );
}
