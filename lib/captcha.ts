/** Token do Turnstile enviado pelo formulário (campo oculto criado pelo widget). */
export function captchaToken(formData: FormData): string | undefined {
  const token = formData.get("cf-turnstile-response");
  return typeof token === "string" && token ? token : undefined;
}

export const CAPTCHA_MESSAGE = "Aguarde a verificação “não sou robô” terminar e tente de novo.";
