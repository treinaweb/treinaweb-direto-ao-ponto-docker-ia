import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CommentComposerView } from "@/components/tickets/comment-composer";
import type { CommentAccess } from "@/lib/tickets/comments";
import type { CommentFormState } from "@/lib/tickets/form-state";

vi.mock("@/app/(app)/chamados/[id]/comment-actions", () => ({ commentAction: vi.fn() }));

const TICKET = "2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11";

function render(access: CommentAccess, state: CommentFormState = {}, pending = false) {
  return renderToStaticMarkup(
    <CommentComposerView
      ticketId={TICKET}
      access={access}
      state={state}
      formAction={() => {}}
      pending={pending}
    />,
  );
}

const staff: CommentAccess = { kind: "composer", canInternal: true };
const customer: CommentAccess = { kind: "composer", canInternal: false };

describe("CommentComposerView — conforme o acesso", () => {
  it("cliente: campo com rótulo, limite e ajuda, sem opção de nota interna", () => {
    const html = render(customer);
    expect(html).toContain('<label data-slot="label"');
    expect(html).toContain(">Comentário<");
    expect(html).toContain('id="field-body"');
    expect(html).toContain('maxLength="5000"');
    expect(html).toContain("Até 5000 caracteres.");
    expect(html).toContain(`value="${TICKET}"`);
    expect(html).not.toContain("Nota interna");
    expect(html).not.toContain('name="isInternal"');
    expect(html).toContain("Enviar resposta");
  });

  it("equipe: caixa de seleção de nota interna, desmarcada", () => {
    const html = render(staff);
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("Nota interna (visível só para a equipe)");
    expect(html).not.toMatch(/type="checkbox"[^>]*checked/);
    expect(html).toContain("Enviar resposta");
  });

  it("atendente não atribuído: texto no lugar do campo", () => {
    const html = render({ kind: "blocked", reason: "assume" });
    expect(html).toContain("Assuma o chamado para responder.");
    expect(html).not.toContain("<textarea");
  });

  it("chamado fechado: texto no lugar do campo", () => {
    const html = render({ kind: "blocked", reason: "closed" });
    expect(html).toContain("Chamado fechado não aceita novos comentários.");
    expect(html).not.toContain("<textarea");
  });

  it("sem acesso: nada", () => {
    expect(render({ kind: "none" })).toBe('<div class="grid gap-3"></div>');
  });
});

describe("CommentComposerView — estados da action", () => {
  it("erro preserva o texto e a opção marcada, e o botão segue a opção", () => {
    const html = render(staff, {
      formError: "Você não tem permissão para esta ação.",
      values: { body: "Meu texto <b>", isInternal: "on" },
    });
    expect(html).toContain("Meu texto &lt;b&gt;</textarea>");
    expect(html).toMatch(/type="checkbox"[^>]*checked/);
    expect(html).toContain("Adicionar nota interna");
    expect(html).toContain('role="alert"');
    expect(html).toContain("Você não tem permissão para esta ação.");
  });

  it("erro de campo fica ligado ao campo", () => {
    const html = render(customer, {
      fieldErrors: { body: "Escreva um comentário." },
      values: { body: "   ", isInternal: "" },
    });
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="field-body-error field-body-help"');
    expect(html).toContain('id="field-body-error"');
    expect(html).toContain("Escreva um comentário.");
  });

  it("sucesso: mensagem anunciada e campo vazio", () => {
    const html = render(customer, { notice: "Resposta enviada.", submission: 1 });
    expect(html).toContain('role="status"');
    expect(html).toContain("Resposta enviada.");
    expect(html).toMatch(/<textarea[^>]*><\/textarea>/);
  });

  it("enviando: botão desabilitado com texto de envio e campo somente leitura", () => {
    const html = render(customer, {}, true);
    expect(html).toContain("Enviando...");
    expect(html).toMatch(/<button[^>]*disabled/);
    expect(html).toMatch(/<textarea[^>]*readOnly/);
    expect(html).toContain("Enviando resposta...");
  });

  it("enviando nota interna: Adicionando...", () => {
    const html = render(staff, { values: { body: "x", isInternal: "on" } }, true);
    expect(html).toContain("Adicionando...");
  });

  it("422 depois do refresh: mensagem continua junto do texto de bloqueio", () => {
    const html = render(
      { kind: "blocked", reason: "closed" },
      { formError: "Este chamado foi fechado e não aceita novos comentários.", values: { body: "x", isInternal: "" } },
    );
    expect(html).toContain("Este chamado foi fechado e não aceita novos comentários.");
    expect(html).toContain("Chamado fechado não aceita novos comentários.");
  });

  it("404: chamado indisponível com Voltar aos chamados", () => {
    const html = render(staff, { gone: true, formError: "Este chamado não está mais disponível para você." });
    expect(html).toContain("Este chamado não está mais disponível para você.");
    expect(html).toContain('href="/chamados"');
    expect(html).toContain("Voltar aos chamados");
    expect(html).not.toContain("<textarea");
  });
});
