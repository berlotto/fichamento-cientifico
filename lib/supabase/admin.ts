import "server-only";

import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Cliente com a chave secreta: IGNORA RLS. Só para o worker e para ações de servidor
 * que já conferiram quem é o usuário (registro de teste de modelo, exclusão de conta).
 * Sempre derive o escopo do article_id da mensagem da fila, nunca de input do cliente.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Variável de ambiente ausente: SUPABASE_SECRET_KEY");
  return createClient<Database>(publicEnv.supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type AdminClient = ReturnType<typeof createAdminClient>;
