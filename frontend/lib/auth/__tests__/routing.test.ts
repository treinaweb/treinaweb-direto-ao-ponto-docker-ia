import { describe, expect, it } from "vitest";
import { getNotice, loginUrl } from "@/lib/auth/notices";
import { safeNext } from "@/lib/auth/redirect";
import { isGuestRoute, isProtectedRoute } from "@/lib/auth/routes";

describe("safeNext", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/dashboard/tickets?page=2#topo", "/dashboard/tickets?page=2#topo"],
  ])("aceita caminho interno %s", (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });

  it.each([
    ["//exemplo.com"],
    ["https://exemplo.com"],
    ["/\\exemplo.com"],
    ["/\texemplo.com"],
    ["dashboard"],
    ["javascript:alert(1)"],
    [""],
    [null],
    [undefined],
    [["/dashboard"]],
    ["/login"],
    ["/cadastro?x=1"],
  ])("rejeita %j e usa /dashboard", (input) => {
    expect(safeNext(input)).toBe("/dashboard");
  });
});

describe("avisos", () => {
  it("código conhecido → texto fixo", () => {
    expect(getNotice("logout")?.text).toBe("Você saiu da sua conta.");
    expect(getNotice("sessao-expirada")?.text).toBe("Sua sessão expirou. Entre novamente.");
    expect(getNotice("conta-criada")?.text).toBe("Conta criada. Entre para continuar.");
  });

  it.each(["<script>", "toString", "__proto__", "", undefined, ["logout"]])(
    "código desconhecido %j → nada",
    (code) => {
      expect(getNotice(code)).toBeNull();
    },
  );

  it("loginUrl monta a query", () => {
    expect(loginUrl()).toBe("/login");
    expect(loginUrl({ notice: "logout" })).toBe("/login?aviso=logout");
    expect(loginUrl({ next: "/dashboard", notice: "sessao-expirada" })).toBe(
      "/login?next=%2Fdashboard&aviso=sessao-expirada",
    );
  });
});

describe("rotas", () => {
  it.each([
    ["/dashboard", true],
    ["/dashboard/x", true],
    ["/dashboards", false],
    ["/chamados", true],
    ["/chamados/novo", true],
    ["/categorias", true],
    ["/usuarios/x", true],
    ["/chamadosx", false],
    ["/", false],
    ["/login", false],
  ])("isProtectedRoute(%s) = %s", (path, expected) => {
    expect(isProtectedRoute(path)).toBe(expected);
  });

  it.each([
    ["/login", true],
    ["/cadastro", true],
    ["/cadastro/x", true],
    ["/loginx", false],
    ["/dashboard", false],
  ])("isGuestRoute(%s) = %s", (path, expected) => {
    expect(isGuestRoute(path)).toBe(expected);
  });
});
