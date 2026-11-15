import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Só caminhos internos ("/x"), nunca "//host" ou URL absoluta (redirecionamento aberto). */
function safeNext(next: string | null): string {
  return next && /^\/(?!\/)[\w\-/]*$/.test(next) ? next : "/projects";
}

/**
 * Links de e-mail do Supabase (confirmação de conta e recuperação de senha).
 *
 * Templates recomendados no painel do Supabase:
 * - Confirm signup: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 * - Reset password: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha
 *
 * Também aceita `?code=` (template padrão do Supabase com PKCE), que só funciona
 * no mesmo navegador em que o link foi pedido.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next") ?? (type === "recovery" ? "/redefinir-senha" : null));

  const supabase = await createClient();
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(new URL("/login?link=invalido", request.url));
}
