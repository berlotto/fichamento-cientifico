import "server-only";

import type { AdminClient } from "@/lib/supabase/admin";
import { DEFAULT_MODEL } from "./extract";
import { DEFAULT_CROSS_MODEL, DEFAULT_JUDGE_MODEL } from "./judge";

export const MODEL_ID = /^[a-z0-9-]+\/[A-Za-z0-9._:-]{1,100}$/;

export type ModelChoice = {
  /** Modelo em uso. */
  model: string;
  /** De onde veio: tela de configuração, variável de ambiente, padrão do código ou escolha automática. */
  source: "settings" | "env" | "default" | "auto";
};

export type ModelSettings = {
  extract: ModelChoice;
  /** null: automático (outro fornecedor que o extrator). */
  cross: ModelChoice | null;
  judge: ModelChoice | null;
};

type Row = { extract_model: string | null; cross_model: string | null; judge_model: string | null } | null;

/** Precedência: configuração do admin > variável de ambiente > padrão (ou automático). */
export function resolveModels(row: Row, env: Record<string, string | undefined> = process.env): ModelSettings {
  const pick = (fromDb: string | null | undefined, fromEnv: string | undefined): ModelChoice | null =>
    fromDb ? { model: fromDb, source: "settings" } : fromEnv ? { model: fromEnv, source: "env" } : null;
  return {
    extract: pick(row?.extract_model, env.EXTRACT_MODEL) ?? { model: DEFAULT_MODEL, source: "default" },
    cross: pick(row?.cross_model, env.CROSS_MODEL),
    judge: pick(row?.judge_model, env.JUDGE_MODEL),
  };
}

export async function loadModelSettings(db: AdminClient): Promise<ModelSettings> {
  const { data, error } = await db
    .from("app_settings")
    .select("extract_model, cross_model, judge_model")
    .maybeSingle();
  // Sem a tabela (ou fora do ar) vale o que está no ambiente.
  if (error) console.error(`[models] app_settings: ${error.message}`);
  return resolveModels(data);
}

export const AUTO_DEFAULTS = { cross: DEFAULT_CROSS_MODEL, judge: DEFAULT_JUDGE_MODEL };
