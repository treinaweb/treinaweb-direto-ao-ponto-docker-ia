import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CategoryAdmin, CategoryAdminView, type CategoryItem } from "@/components/categories/category-admin";
import type { CategoryResult } from "@/components/categories/category-name-dialog";

vi.mock("@/app/(app)/categorias/actions", () => ({
  createCategoryAction: vi.fn(),
  renameCategoryAction: vi.fn(),
  toggleCategoryAction: vi.fn(),
}));

const ACESSO = "11111111-1111-4111-8111-111111111111";
const HARDWARE = "22222222-2222-4222-8222-222222222222";
const CATEGORIES: CategoryItem[] = [
  { id: ACESSO, name: "Acesso", active: true },
  { id: HARDWARE, name: "Hardware", active: false },
];
const noop = () => {};

function view(
  props: Partial<{ categories: CategoryItem[]; result: CategoryResult | null; pendingIntent: string | null }>,
) {
  return renderToStaticMarkup(
    <CategoryAdminView
      categories={props.categories ?? CATEGORIES}
      result={props.result ?? null}
      onResult={noop}
      toggleAction={noop}
      pendingIntent={props.pendingIntent ?? null}
      onToggleClick={noop}
    />,
  );
}

/** Texto de um botão sem as tags (nome acessível = visível + sr-only). */
function buttonNames(html: string) {
  return [...html.matchAll(/<button[^>]*>(.*?)<\/button>/g)].map((m) => m[1].replace(/<[^>]+>/g, ""));
}

describe("CategoryAdminView", () => {
  it("título, explicação fixa e botão Nova categoria", () => {
    const html = view({});
    expect(html).toContain(">Categorias</h1>");
    expect(html).toContain(
      "Categorias inativas não aparecem para quem abre chamados. Os chamados que já usam a categoria continuam com ela.",
    );
    expect(buttonNames(html)).toContain("Nova categoria");
  });

  it("lista na ordem recebida, com estado em texto e ação oposta", () => {
    const html = view({});
    expect(html.indexOf("Acesso")).toBeLessThan(html.indexOf("Hardware"));
    expect(html).toContain(">Ativa</span>");
    expect(html).toContain(">Inativa</span>");
    expect(buttonNames(html)).toEqual([
      "Nova categoria",
      "Renomear Acesso",
      "Desativar Acesso",
      "Renomear Hardware",
      "Ativar Hardware",
    ]);
    expect(html).toContain(`value="deactivate:${ACESSO}"`);
    expect(html).toContain(`value="activate:${HARDWARE}"`);
    expect(html).toContain('form="category-toggle"');
    expect(html).toContain('<form id="category-toggle"');
  });

  it("nunca oferece Excluir", () => {
    expect(view({})).not.toMatch(/Excluir/i);
  });

  it("lista vazia → mensagem e Nova categoria", () => {
    const html = view({ categories: [] });
    expect(html).toContain(
      "Nenhuma categoria cadastrada ainda. Crie a primeira para que os clientes possam abrir chamados.",
    );
    expect(html).not.toContain("<ul");
    expect(buttonNames(html)).toEqual(["Nova categoria"]);
  });

  it("toggle em andamento: todos desabilitados, texto de envio só no acionado", () => {
    const html = view({ pendingIntent: `deactivate:${ACESSO}` });
    expect(buttonNames(html)).toContain("Desativando... Acesso");
    expect(buttonNames(html)).toContain("Ativar Hardware");
    const toggles = [...html.matchAll(/<button type="submit"[^>]*>/g)].map((m) => m[0]);
    expect(toggles).toHaveLength(2);
    for (const tag of toggles) expect(tag).toContain('disabled=""');
  });

  it("sem envio: toggles habilitados", () => {
    const toggles = [...view({}).matchAll(/<button type="submit"[^>]*>/g)].map((m) => m[0]);
    for (const tag of toggles) expect(tag).not.toContain('disabled=""');
  });

  it("sucesso na região de status; erro na região de alerta", () => {
    const ok = view({ result: { text: "Categoria desativada.", tone: "status" } });
    expect(ok).toMatch(/<div role="status" aria-live="polite"><p[^>]*>.*Categoria desativada\.<\/p><\/div><div role="alert"><\/div>/);

    const error = view({
      result: { text: "Não foi possível conectar ao servidor. Tente novamente em instantes.", tone: "alert" },
    });
    expect(error).toMatch(/<div role="status" aria-live="polite"><\/div><div role="alert"><p[^>]*>.*Não foi possível conectar/);
  });

  it("sem resultado: as duas regiões existem vazias", () => {
    expect(view({})).toContain('<div role="status" aria-live="polite"></div><div role="alert"></div>');
  });
});

describe("CategoryAdmin", () => {
  it("renderiza a lista sem mensagem inicial", () => {
    const html = renderToStaticMarkup(<CategoryAdmin categories={CATEGORIES} />);
    expect(buttonNames(html)).toContain("Desativar Acesso");
    expect(html).toContain('<div role="status" aria-live="polite"></div>');
  });
});
