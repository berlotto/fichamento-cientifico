import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string | null };

export type Profile = CurrentUser & { fullName: string | null; institution: string | null };

/**
 * Camada de acesso: lê e valida a sessão. Lê cookies, então quem chama
 * precisa estar dentro de <Suspense> (cacheComponents).
 */
export async function requireUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  return { id: claims.sub, email: (claims.email as string | undefined) ?? null };
}

/** Perfil com metadados atuais (o JWT pode estar desatualizado logo após editar). */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  const meta = data.user.user_metadata ?? {};
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    fullName: str(meta.full_name),
    institution: str(meta.institution),
  };
}
