"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { statusSignature } from "@/lib/article-status";
import { createClient } from "@/lib/supabase/client";

/**
 * Enquanto houver artigo em processamento, consulta só os status (direto no
 * Supabase, com RLS) e recarrega a página apenas quando algum deles mudar.
 * Antes, a página inteira era refeita a cada 5 s.
 */
export function AutoRefresh({
  projectId,
  signature,
  active,
  intervalMs = 5000,
}: {
  projectId: string;
  signature: string;
  active: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const supabase = createClient();
    let busy = false;
    const t = setInterval(async () => {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const { data, error } = await supabase.from("articles").select("id, status").eq("project_id", projectId);
        if (!error && data && statusSignature(data) !== signature) router.refresh();
      } finally {
        busy = false;
      }
    }, intervalMs);
    return () => clearInterval(t);
  }, [active, projectId, signature, intervalMs, router]);
  return null;
}
