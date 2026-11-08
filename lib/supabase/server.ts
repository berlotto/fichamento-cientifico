import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/** Cliente com o JWT do usuário (RLS ativa). Criar um por requisição. */
export async function createClient() {
  // Dados por requisição: o supabase-js usa Date.now() ao validar a sessão, o que
  // o Cache Components recusa em prerender. connection() marca o trecho como dinâmico.
  await connection();
  const cookieStore = await cookies();

  return createServerClient<Database>(publicEnv.supabaseUrl(), publicEnv.supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component não pode gravar cookie; o proxy.ts renova a sessão.
        }
      },
    },
  });
}
