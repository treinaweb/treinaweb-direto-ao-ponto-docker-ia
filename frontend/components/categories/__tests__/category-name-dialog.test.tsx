import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CategoryNameDialog, CategoryNameFormView } from "@/components/categories/category-name-dialog";
import type { CategoryNameState } from "@/lib/categories/form-state";

vi.mock("@/app/(app)/categorias/actions", () => ({
  createCategoryAction: vi.fn(),
  renameCategoryAction: vi.fn(),
  toggleCategoryAction: vi.fn(),
}));

const ID = "2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11";
const noop = () => {};

function view(props: {
  mode?: "create" | "rename";
  name?: string;
  state?: CategoryNameState;
  pending?: boolean;
}) {
  const mode = props.mode ?? "create";
  return renderToStaticMarkup(
    <CategoryNameFormView
      mode={mode}
      category={mode === "rename" ? { id: ID, name: "Acesso" } : undefined}
      name={props.name ?? ""}
      onNameChange={noop}
      state={props.state ?? {}}
      pending={props.pending ?? false}
      formAction={noop}
      onCancel={noop}
    />,
  );
}

describe("CategoryNameDialog (gatilho)", () => {
  it("criar: botão 'Nova categoria', diálogo fechado", () => {
    const html = renderToStaticMarkup(<CategoryNameDialog mode="create" onResult={noop} />);
    expect(html).toContain(">Nova categoria</button>");
    expect(html).not.toContain('role="dialog"');
  });

  it("renomear: nome acessível inclui a categoria", () => {
    const html = renderToStaticMarkup(
      <CategoryNameDialog mode="rename" category={{ id: ID, name: "Acesso" }} onResult={noop} />,
    );
    expect(html).toContain('Renomear<span class="sr-only"> Acesso</span>');
  });
});

describe("CategoryNameFormView", () => {
  it("criar: campo Nome vazio, Criar e Cancelar, sem campos ocultos", () => {
    const html = view({});
    expect(html).toContain('<label data-slot="label"');
    expect(html).toContain(">Nome</label>");
    expect(html).toContain('name="name"');
    expect(html).toContain('value=""');
    expect(html).toContain(">Criar</button>");
    expect(html).toContain(">Cancelar</button>");
    expect(html).not.toContain('name="categoryId"');
    expect(html).not.toContain("Excluir");
  });

  it("renomear: nome atual preenchido, id e nome atual ocultos, Salvar", () => {
    const html = view({ mode: "rename", name: "Acesso" });
    expect(html).toContain(`<input type="hidden" name="categoryId" value="${ID}"/>`);
    expect(html).toContain('<input type="hidden" name="currentName" value="Acesso"/>');
    expect(html).toMatch(/name="name"[^>]*value="Acesso"/);
    expect(html).toContain(">Salvar</button>");
  });

  it("erro no campo: valor exatamente como digitado, marcado e descrito", () => {
    const html = view({
      name: "Acesso ",
      state: { fieldErrors: { name: "Já existe uma categoria com esse nome." }, values: { name: "Acesso " } },
    });
    expect(html).toContain('value="Acesso "');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="field-name-error"');
    expect(html).toContain('id="field-name-error"');
    expect(html).toContain("Já existe uma categoria com esse nome.");
  });

  it("erro geral aparece dentro do diálogo como alerta", () => {
    const html = view({ name: "Rede", state: { formError: "Você não tem permissão para esta ação." } });
    expect(html).toContain('role="alert"');
    expect(html).toContain("Você não tem permissão para esta ação.");
  });

  it("estado novo (reabrir): sem mensagem de erro", () => {
    const html = view({});
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('aria-invalid="true"');
    expect(html).not.toContain("field-name-error");
  });

  it.each([
    ["create", "Criando...", "Criando categoria..."],
    ["rename", "Salvando...", "Salvando categoria..."],
  ] as const)("%s em andamento: envio único, Cancelar desabilitado e anúncio", (mode, label, announce) => {
    const html = view({ mode, name: "Rede", pending: true });
    expect(html).toMatch(new RegExp(`<button type="submit"[^>]*disabled[^>]*>${label}</button>`));
    expect(html).toMatch(/<button type="button" disabled="" aria-disabled="true"[^>]*>Cancelar<\/button>/);
    expect(html).toContain(`<p role="status" aria-live="polite" class="sr-only">${announce}</p>`);
    expect(html).toContain("readOnly");
  });
});
