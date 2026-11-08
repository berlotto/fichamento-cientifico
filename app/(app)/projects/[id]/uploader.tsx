"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { FileIcon, LinkIcon, PlusIcon } from "@/components/icons";
import { pdfStoragePath, sha256Hex } from "@/lib/sha256";
import { createClient } from "@/lib/supabase/client";
import { importFromUrl, type ImportUrlState } from "./actions";

const MAX_BYTES = 50 * 1024 * 1024;

type Line = { name: string; status: "enviando" | "enviado" | "duplicado" | "erro"; detail?: string };

function alreadyExists(error: unknown): boolean {
  const e = error as { statusCode?: string; status?: number; message?: string };
  return e?.statusCode === "409" || e?.status === 409 || /already exists/i.test(e?.message ?? "");
}

/**
 * Botão "Adicionar artigo": abre um painel para enviar PDFs do computador ou
 * importar por link. O upload vai direto para o Supabase Storage (não passa
 * pela Function da Vercel); o link é baixado no servidor. Nos dois casos o
 * insert do artigo dispara o pipeline (parse → extração).
 */
export function Uploader({ projectId, userId }: { projectId: string; userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [urlState, urlAction, urlPending] = useActionState<ImportUrlState, FormData>(importFromUrl, {});

  useEffect(() => {
    if (urlState.ok) router.refresh();
  }, [urlState, router]);

  const update = (name: string, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.name === name ? { ...l, ...patch } : l)));

  async function uploadOne(file: File) {
    if (file.type !== "application/pdf") {
      return update(file.name, { status: "erro", detail: "não é PDF" });
    }
    if (file.size > MAX_BYTES) {
      return update(file.name, { status: "erro", detail: "maior que 50 MB" });
    }

    const supabase = createClient();
    const sha256 = await sha256Hex(await file.arrayBuffer());
    const path = pdfStoragePath(userId, sha256);

    const up = await supabase.storage
      .from("pdfs")
      .upload(path, file, { contentType: "application/pdf", upsert: false });
    // Mesmo PDF já enviado para outro projeto: reaproveita o arquivo.
    if (up.error && !alreadyExists(up.error)) {
      return update(file.name, { status: "erro", detail: up.error.message });
    }

    const ins = await supabase.from("articles").insert({
      project_id: projectId,
      sha256,
      storage_path: path,
      original_filename: file.name,
    });
    if (ins.error?.code === "23505") {
      return update(file.name, { status: "duplicado", detail: "já está neste projeto" });
    }
    if (ins.error) return update(file.name, { status: "erro", detail: ins.error.message });
    update(file.name, { status: "enviado" });
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setBusy(true);
    setLines(files.map((f) => ({ name: f.name, status: "enviando" })));
    for (const f of files) {
      try {
        await uploadOne(f);
      } catch (err) {
        update(f.name, { status: "erro", detail: err instanceof Error ? err.message : String(err) });
      }
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-primary px-3"
        aria-label="Adicionar artigo"
        aria-expanded={open}
        title="Adicionar artigo"
        onClick={() => setOpen(!open)}
      >
        <PlusIcon />
      </button>

      {open && (
        <div
          className="absolute top-full right-0 left-0 z-10 mt-2 flex flex-col gap-4 rounded-lg border border-line bg-surface p-4 text-sm shadow-lg"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <div className="flex flex-col gap-2">
            <span className="label">Do computador</span>
            <label className={`btn justify-center ${busy ? "cursor-default opacity-65" : "cursor-pointer"}`}>
              <FileIcon />
              {busy ? "Enviando…" : "Escolher PDFs"}
              <input
                type="file"
                accept="application/pdf"
                multiple
                disabled={busy}
                onChange={onChange}
                className="sr-only"
              />
            </label>
            {lines.length > 0 && (
              <div aria-live="polite" className="flex flex-col gap-1">
                {lines.map((l) => (
                  <div key={l.name} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">{l.name}</span>
                    <span className={l.status === "erro" || l.status === "duplicado" ? "text-warn" : "text-muted"}>
                      {l.status}
                      {l.detail ? ` (${l.detail})` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form action={urlAction} className="flex flex-col gap-2 border-t border-line pt-4">
            <label htmlFor="fx-import-url" className="label">
              Por link
            </label>
            <input type="hidden" name="projectId" value={projectId} />
            <div className="flex gap-2">
              <input
                id="fx-import-url"
                name="url"
                type="url"
                inputMode="url"
                required
                placeholder="https://…"
                className="field min-w-0 flex-1"
              />
              <button type="submit" className="btn btn-primary" disabled={urlPending} aria-label="Importar link">
                <LinkIcon />
                {urlPending ? "Baixando…" : "Importar"}
              </button>
            </div>
            <p aria-live="polite" className={`m-0 text-[13px] ${urlState.error ? "text-warn" : "text-muted"}`}>
              {urlPending
                ? "Baixando o PDF…"
                : urlState.error ??
                  (urlState.ok
                    ? `Importado: ${urlState.filename}`
                    : "Funciona com o link direto do PDF ou com a página do artigo na editora.")}
            </p>
          </form>

          <button type="button" className="self-end text-[13px] text-muted underline" onClick={() => setOpen(false)}>
            Fechar
          </button>
        </div>
      )}
    </>
  );
}
