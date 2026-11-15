import "server-only";

import { displayTitle, shortCite } from "@/lib/citation";
import { fieldDefs, OPTIONAL_KEYS } from "@/lib/fields";
import type { createClient } from "@/lib/supabase/server";
import { tagFamily } from "@/lib/tags";
import type { TagArticle, TagContent, TagItem } from "./tag-export";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Tudo o que está marcado com a tag (e com os subtemas dela), agrupado por
 * artigo em ordem de autor e ano. RLS: só o que é do usuário.
 */
export async function loadTagContent(supabase: Client, projectId: string, tagId: string): Promise<TagContent | null> {
  const [{ data: tags }, { data: custom }] = await Promise.all([
    supabase.from("tags").select("id, name, parent_id, color, description").eq("project_id", projectId),
    supabase.from("project_fields").select("key, label").eq("project_id", projectId),
  ]);
  const tag = tags?.find((t) => t.id === tagId);
  if (!tag || !tags) return null;

  const family = [...tagFamily(tagId, tags)];
  const names = new Map(tags.map((t) => [t.id, t.name]));
  const labels = new Map(fieldDefs(custom ?? [], OPTIONAL_KEYS).map((d) => [d.key, d.label]));

  const { data: taggings } = await supabase
    .from("taggings")
    .select(
      "tag_id, article_id, field_key, quote_id, created_at, articles(id, title, subtitle, original_filename, authors, year), quotes(text, pdf_page, printed_page, comment)",
    )
    .in("tag_id", family)
    .order("created_at");

  const fieldKeys = [...new Set((taggings ?? []).flatMap((t) => (t.field_key ? [`${t.article_id}:${t.field_key}`] : [])))];
  const articleIds = [...new Set(fieldKeys.map((k) => k.split(":")[0]))];
  const { data: fields } = articleIds.length
    ? await supabase
        .from("article_fields")
        .select("article_id, key, value, quote, pdf_page, printed_page, status")
        .in("article_id", articleIds)
    : { data: [] };
  const fieldMap = new Map((fields ?? []).map((f) => [`${f.article_id}:${f.key}`, f]));

  const byArticle = new Map<string, TagArticle>();
  for (const t of taggings ?? []) {
    const a = t.articles;
    if (!a) continue;
    const entry =
      byArticle.get(a.id) ??
      ({
        ...a,
        displayTitle: displayTitle(a) ?? a.original_filename ?? "Sem título",
        items: [],
      } as TagArticle);
    const taggedTag = names.get(t.tag_id) ?? "";
    let item: TagItem;
    if (t.quote_id && t.quotes) {
      item = {
        kind: "quote",
        taggedTag,
        quoteId: t.quote_id,
        text: t.quotes.text,
        pdfPage: t.quotes.pdf_page,
        printedPage: t.quotes.printed_page,
        comment: t.quotes.comment,
      };
    } else if (t.field_key) {
      const f = fieldMap.get(`${t.article_id}:${t.field_key}`);
      const live = f && f.status !== "rejected";
      item = {
        kind: "field",
        taggedTag,
        fieldKey: t.field_key,
        label: labels.get(t.field_key) ?? t.field_key,
        value: live ? f.value : null,
        quote: live ? f.quote : null,
        pdfPage: live ? f.pdf_page : null,
        printedPage: live ? f.printed_page : null,
      };
    } else {
      item = { kind: "article", taggedTag };
    }
    entry.items.push(item);
    byArticle.set(a.id, entry);
  }

  // Dentro do artigo: o artigo inteiro, depois os campos, depois as citações por página.
  const order = { article: 0, field: 1, quote: 2 } as const;
  const articles = [...byArticle.values()];
  for (const a of articles) {
    a.items.sort(
      (x, y) =>
        order[x.kind] - order[y.kind] ||
        (x.kind === "quote" && y.kind === "quote" ? x.pdfPage - y.pdfPage : 0),
    );
  }
  articles.sort((x, y) =>
    (shortCite(x) ?? x.displayTitle).localeCompare(shortCite(y) ?? y.displayTitle, "pt-BR"),
  );
  return { tag: { id: tag.id, name: tag.name, description: tag.description }, articles };
}
