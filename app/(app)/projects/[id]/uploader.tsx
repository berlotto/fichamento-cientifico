"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlusIcon } from "@/components/icons";
import { pdfStoragePath, sha256Hex } from "@/lib/sha256";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 50 * 1024 * 1024;

type Line = { name: string; status: "enviando" | "enviado" | "duplicado" | "erro"; detail?: string };

function alreadyExists(error: unknown): boolean {
  const e = error as { statusCode?: string; status?: number; message?: string };
  return e?.statusCode === "409" || e?.status === 409 || /already exists/i.test(e?.message ?? "");
}

/**
 * Botão "Adicionar artigo". Upload direto para o Supabase Storage (não passa pela
 * Function da Vercel); depois insere o artigo e um trigger no banco enfileira o parse.
 */
export function Uploader({ projectId, userId }: { projectId: string; userId: string }) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);

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
      <label
        className={`btn btn-primary px-3 ${busy ? "cursor-default opacity-65" : "cursor-pointer"}`}
        aria-label="Adicionar artigo"
        title="Adicionar artigo (PDF)"
      >
        <PlusIcon />
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
        <div
          aria-live="polite"
          className="absolute top-full right-0 left-0 z-10 mt-2 flex flex-col gap-1 rounded-lg border border-line bg-surface p-3 text-sm shadow-lg"
        >
          {lines.map((l) => (
            <div key={l.name} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">{l.name}</span>
              <span className={l.status === "erro" || l.status === "duplicado" ? "text-warn" : "text-muted"}>
                {l.status}
                {l.detail ? ` (${l.detail})` : ""}
              </span>
            </div>
          ))}
          {!busy && (
            <button type="button" className="mt-1 self-end text-[13px] text-muted underline" onClick={() => setLines([])}>
              Fechar
            </button>
          )}
        </div>
      )}
    </>
  );
}
