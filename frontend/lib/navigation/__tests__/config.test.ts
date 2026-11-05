import { describe, expect, it } from "vitest";
import {
  breadcrumbFor,
  canAccess,
  getNavigation,
  isActive,
  pageTitleFor,
} from "@/lib/navigation/config";

const labels = (role: Parameters<typeof getNavigation>[0]) =>
  getNavigation(role).groups.map((g) => ({ group: g.label, items: g.items.map((i) => i.label) }));

describe("getNavigation", () => {
  it("cliente: Painel, Meus chamados e o botão Abrir chamado", () => {
    expect(labels("CUSTOMER")).toEqual([{ group: null, items: ["Painel", "Meus chamados"] }]);
    expect(getNavigation("CUSTOMER").primaryAction).toEqual({
      href: "/chamados/novo",
      label: "Abrir chamado",
      icon: "new-ticket",
    });
  });

  it("atendente: só Painel e Chamados, sem ação primária", () => {
    expect(labels("SUPPORT")).toEqual([{ group: null, items: ["Painel", "Chamados"] }]);
    expect(getNavigation("SUPPORT").primaryAction).toBeNull();
  });

  it("administrador: grupo Administração com Categorias e Usuários", () => {
    expect(labels("ADMIN")).toEqual([
      { group: null, items: ["Painel", "Chamados"] },
      { group: "Administração", items: ["Categorias", "Usuários"] },
    ]);
    expect(getNavigation("ADMIN").primaryAction).toBeNull();
  });

  it("todos os itens apontam para as rotas certas", () => {
    const hrefs = getNavigation("ADMIN").groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toEqual(["/dashboard", "/chamados", "/categorias", "/usuarios"]);
  });
});

describe("canAccess", () => {
  it.each([
    ["CUSTOMER", "/categorias", false],
    ["CUSTOMER", "/usuarios", false],
    ["CUSTOMER", "/chamados/novo", true],
    ["SUPPORT", "/categorias", false],
    ["SUPPORT", "/chamados/novo", false],
    ["ADMIN", "/chamados/novo", false],
    ["ADMIN", "/categorias", true],
    ["ADMIN", "/usuarios/123", true],
    ["SUPPORT", "/chamados", true],
    ["SUPPORT", "/chamados/2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11", true],
    ["CUSTOMER", "/dashboard", true],
    ["CUSTOMER", "/categorias?x=1", false],
  ] as const)("%s em %s → %s", (role, path, expected) => {
    expect(canAccess(role, path)).toBe(expected);
  });

  it("prefixo parecido não herda a regra", () => {
    expect(canAccess("CUSTOMER", "/categoriasx")).toBe(true);
  });
});

describe("isActive", () => {
  it("página exata", () => {
    expect(isActive("/dashboard", "/dashboard")).toBe(true);
    expect(isActive("/dashboard", "/chamados")).toBe(false);
  });

  it("subrota e query ativam o item pai", () => {
    expect(isActive("/chamados/novo", "/chamados")).toBe(true);
    expect(isActive("/chamados?status=OPEN", "/chamados")).toBe(true);
  });

  it("prefixo parecido não ativa", () => {
    expect(isActive("/chamadosx", "/chamados")).toBe(false);
  });
});

describe("breadcrumbFor / pageTitleFor", () => {
  it("painel tem só a raiz, sem link", () => {
    expect(breadcrumbFor("ADMIN", "/dashboard")).toEqual([{ label: "Painel" }]);
  });

  it("subpágina: Painel (link) / página", () => {
    expect(breadcrumbFor("ADMIN", "/categorias")).toEqual([
      { label: "Painel", href: "/dashboard" },
      { label: "Categorias" },
    ]);
  });

  it("rótulo de chamados conforme o papel", () => {
    expect(pageTitleFor("CUSTOMER", "/chamados")).toBe("Meus chamados");
    expect(pageTitleFor("SUPPORT", "/chamados?status=OPEN")).toBe("Chamados");
    expect(pageTitleFor("CUSTOMER", "/chamados/novo")).toBe("Abrir chamado");
    expect(pageTitleFor("ADMIN", "/chamados/2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11")).toBe("Chamado");
  });

  it("rota vetada ao papel não revela o nome da página", () => {
    expect(breadcrumbFor("CUSTOMER", "/usuarios")).toEqual([
      { label: "Painel", href: "/dashboard" },
      { label: "Página não encontrada" },
    ]);
  });

  it("subpágina de Usuários: três níveis para o ADMIN, com os dois primeiros como links", () => {
    expect(breadcrumbFor("ADMIN", "/usuarios/novo")).toEqual([
      { label: "Painel", href: "/dashboard" },
      { label: "Usuários", href: "/usuarios" },
      { label: "Novo usuário" },
    ]);
    expect(breadcrumbFor("ADMIN", "/usuarios/novo?x=1")).toHaveLength(3);
    expect(pageTitleFor("ADMIN", "/usuarios/novo")).toBe("Novo usuário");
    expect(pageTitleFor("ADMIN", "/usuarios")).toBe("Usuários");
  });

  it.each([["CUSTOMER"], ["SUPPORT"]] as const)("%s em /usuarios/novo → Página não encontrada", (role) => {
    expect(breadcrumbFor(role, "/usuarios/novo")).toEqual([
      { label: "Painel", href: "/dashboard" },
      { label: "Página não encontrada" },
    ]);
  });

  it("/chamados/novo e /chamados/{id} continuam com dois níveis", () => {
    expect(breadcrumbFor("CUSTOMER", "/chamados/novo")).toEqual([
      { label: "Painel", href: "/dashboard" },
      { label: "Abrir chamado" },
    ]);
    expect(breadcrumbFor("ADMIN", "/chamados/2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11")).toEqual([
      { label: "Painel", href: "/dashboard" },
      { label: "Chamado" },
    ]);
  });

  it("Usuários fica ativo na sidebar em /usuarios/novo", () => {
    expect(isActive("/usuarios/novo", "/usuarios")).toBe(true);
    expect(isActive("/usuarios/novo", "/categorias")).toBe(false);
  });

  it("página desconhecida cai na raiz", () => {
    expect(breadcrumbFor("ADMIN", "/qualquer")).toEqual([{ label: "Painel" }]);
  });
});
