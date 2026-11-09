import "server-only";

import { redirect } from "next/navigation";
import {
  projectDefaultsFrom,
  validCitationStyle,
  type CitationStyleChoice,
  type ProjectDefaults,
} from "@/lib/project-defaults";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string | null };

export type Profile = CurrentUser & {
  fullName: string | null;
  institution: string | null;
  /** Fontes escolhidas no perfil (null: nunca escolheu; vale o que está no navegador). */
  fontUi: string | null;
  fontArticle: string | null;
  /** Idioma padrão das fichas em projetos novos. */
  defaultLanguage: string | null;
  /** Norma de referência preferida. */
  citationStyle: string | null;
  /** Padrões de verificação para projetos novos. */
  projectDefaults: ProjectDefaults;
  /** Administrador do serviço (app_metadata.role, que só o servidor altera). */
  isAdmin: boolean;
};

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

/** Norma de referência preferida, lida do JWT (as ações que a salvam renovam a sessão). */
export async function preferredCitationStyle(): Promise<CitationStyleChoice> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return validCitationStyle((data?.claims.user_metadata as Record<string, unknown> | undefined)?.citation_style);
}

/** Exige admin (app_metadata.role); o banco confere de novo pelo JWT (RLS). */
export async function requireAdmin(): Promise<CurrentUser> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  const role = (claims.app_metadata as { role?: unknown } | undefined)?.role;
  if (role !== "admin") {
    // Promovido depois do login: o JWT ainda é o antigo. Confere no servidor e renova a sessão.
    const { data: fresh } = await supabase.auth.getUser();
    if (fresh.user?.app_metadata?.role !== "admin") throw new Error("Acesso restrito ao administrador.");
    const { error } = await supabase.auth.refreshSession();
    if (error) throw new Error("Entre de novo para usar a área de administração.");
  }
  return { id: claims.sub, email: (claims.email as string | undefined) ?? null };
}

/**
 * Perfil lido do JWT, verificado localmente (sem ida ao servidor de autenticação).
 * As ações que alteram o perfil renovam a sessão para o JWT refletir a mudança.
 */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  const meta = (claims.user_metadata as Record<string, unknown> | undefined) ?? {};
  const app = (claims.app_metadata as Record<string, unknown> | undefined) ?? {};
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    id: claims.sub,
    email: (claims.email as string | undefined) ?? null,
    fullName: str(meta.full_name),
    institution: str(meta.institution),
    fontUi: str(meta.font_ui),
    fontArticle: str(meta.font_article),
    defaultLanguage: str(meta.default_output_language),
    citationStyle: str(meta.citation_style),
    projectDefaults: projectDefaultsFrom(meta),
    isAdmin: app.role === "admin",
  };
}
