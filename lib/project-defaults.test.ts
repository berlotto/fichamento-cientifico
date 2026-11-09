import { describe, expect, it } from "vitest";
import { projectDefaultsFrom, validCitationStyle } from "./project-defaults";

describe("projectDefaultsFrom", () => {
  it("padrão: verificação ligada, sem aprovação automática, resultados críticos, 10% de auditoria", () => {
    expect(projectDefaultsFrom({})).toEqual({ crossCheck: true, autoApprove: false, critical: ["results"], auditRate: 0.1 });
  });

  it("aprovação automática exige verificação; taxa e chaves inválidas são descartadas", () => {
    const d = projectDefaultsFrom({
      default_cross_check: false,
      default_auto_approve: true,
      default_critical_fields: ["method", "DROP TABLE", "method", 3],
      default_audit_rate: 0.33,
    });
    expect(d).toEqual({ crossCheck: false, autoApprove: false, critical: ["method"], auditRate: 0.1 });
  });
});

describe("validCitationStyle", () => {
  it("aceita só as normas conhecidas", () => {
    expect(validCitationStyle("apa")).toBe("apa");
    expect(validCitationStyle("chicago")).toBe("abnt");
    expect(validCitationStyle(undefined)).toBe("abnt");
  });
});
