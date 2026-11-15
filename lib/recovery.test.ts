import { describe, expect, it } from "vitest";
import { isRecentRecovery, RECOVERY_WINDOW_SECONDS } from "./recovery";

const now = 1_800_000_000;
const claims = (amr: unknown) => ({ amr }) as never;

describe("isRecentRecovery", () => {
  it("aceita sessão aberta pelo link de recuperação há pouco", () => {
    expect(isRecentRecovery(claims([{ method: "recovery", timestamp: now - 60 }]), now)).toBe(true);
  });
  it("aceita a sessão do link do e-mail (verifyOtp gera amr otp)", () => {
    expect(isRecentRecovery(claims([{ method: "otp", timestamp: now - 30 }]), now)).toBe(true);
  });
  it("recusa link aberto há mais tempo que a janela", () => {
    expect(isRecentRecovery(claims([{ method: "recovery", timestamp: now - RECOVERY_WINDOW_SECONDS - 1 }]), now)).toBe(false);
  });
  it("recusa sessão comum de senha", () => {
    expect(isRecentRecovery(claims([{ method: "password", timestamp: now - 10 }]), now)).toBe(false);
  });
  it("recusa sem claims ou com amr em texto", () => {
    expect(isRecentRecovery(null, now)).toBe(false);
    expect(isRecentRecovery(claims(["recovery"]), now)).toBe(false);
  });
});
