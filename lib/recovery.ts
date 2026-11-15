import type { JwtPayload } from "@supabase/supabase-js";

/** Quanto tempo depois de abrir o link do e-mail a pessoa pode definir a senha nova. */
export const RECOVERY_WINDOW_SECONDS = 15 * 60;

/**
 * A sessão veio do link de recuperação de senha, aberto há pouco? Só assim a
 * senha pode ser trocada sem informar a atual; numa sessão comum, a troca
 * continua exigindo a senha atual (Configurações > Conta).
 *
 * O link do e-mail (verifyOtp com token_hash) gera `amr` "otp"; a troca por
 * código (PKCE) gera "recovery". O app não tem login por link mágico, então
 * "otp" só vem da recuperação ou da confirmação de cadastro, ambos recentes.
 */
export function isRecentRecovery(claims: JwtPayload | null | undefined, now = Date.now() / 1000): boolean {
  const amr = claims?.amr ?? [];
  return amr.some(
    (e) => typeof e === "object" && (e.method === "recovery" || e.method === "otp") && now - e.timestamp <= RECOVERY_WINDOW_SECONDS,
  );
}
