"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { pdfStoragePath, sha256Hex } from "@/lib/sha256";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 50 * 1024 * 1024;

type Line = { name: string; status: "enviando" | "ok" | "duplicado" | "erro"; detail?: string };

function alreadyExists(error: unknown): boolean {
  const e = error as { statusCode?: string; status?: number; message?: string };
  return e?.statusCode === "409" || e?.status === 409 || /already exists/i.test(e?.message ?? "");
}

/**
 * Upload direto para o Supabase Storage (não passa pela Function da Vercel).
 * Depois insere o artigo; um trigger no banco enfileira o parse.
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
    update(file.name, { status: "ok" });
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
    <div className="flex flex-col gap-2">
      <label className="flex w-fit cursor-pointer items-center gap-2 rounded bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900">
        {busy ? "Enviando…" : "Enviar PDFs"}
        <input
          type="file"
          accept="application/pdf"
          multiple
          disabled={busy}
          onChange={onChange}
          className="hidden"
        />
      </label>
      {lines.length > 0 && (
        <ul className="text-sm">
          {lines.map((l) => (
            <li
              key={l.name}
              className={
                l.status === "erro"
                  ? "text-red-600"
                  : l.status === "duplicado"
                    ? "text-amber-600"
                    : "text-zinc-600 dark:text-zinc-400"
              }
            >
              {l.name}: {l.status}
              {l.detail ? ` (${l.detail})` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
