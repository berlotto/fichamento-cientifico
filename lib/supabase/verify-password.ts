import "server-only";

import { createAdminClient } from "./admin";

/**
 * Confere a senha de quem já está logado (troca de senha, exclusão de conta).
 * Usa a chave secreta porque o Auth dispensa o CAPTCHA para ela: não há widget
 * nessas telas. A sessão criada só para conferir é encerrada em seguida, sem
 * mexer na sessão (cookies) do usuário.
 */
export async function verifyPassword(email: string, password: string): Promise<boolean> {
  const client = createAdminClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) return false;
  await client.auth.signOut({ scope: "local" });
  return true;
}
