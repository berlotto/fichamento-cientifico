"use client";

import { useState } from "react";
import { DownloadIcon } from "@/components/icons";

type State = { kind: "idle" | "running" | "done" | "error"; file?: string };

export function BackupButton() {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function run() {
    setState({ kind: "running" });
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error(String(res.status));
      const file =
        /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "fichamento-backup.json";
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = file;
      a.click();
      URL.revokeObjectURL(url);
      setState({ kind: "done", file });
    } catch {
      setState({ kind: "error" });
    }
  }

  const msg = {
    idle: "Nenhum backup nesta sessão",
    running: "Reunindo seus dados",
    done: `Backup gerado agora: ${state.file}`,
    error: "Não foi possível gerar o backup. Tente de novo.",
  }[state.kind];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="btn btn-primary" onClick={run} disabled={state.kind === "running"}>
        <DownloadIcon />
        {state.kind === "running" ? "Gerando backup" : "Fazer backup"}
      </button>
      <span aria-live="polite" className={`text-[13px] ${state.kind === "error" ? "text-warn" : "text-muted"}`}>
        {msg}
      </span>
    </div>
  );
}
