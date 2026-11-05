import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR_STATUS } from "@/lib/api/errors";
import { jwtExpiringIn } from "@/lib/auth/__tests__/helpers";
import { resetNextState } from "@/lib/auth/__tests__/next-mocks";
import { AssigneePicker } from "@/components/tickets/assignee-picker";

const mocks = vi.hoisted(() => ({ listSupportAgents: vi.fn() }));

vi.mock("next/headers", async () => (await import("@/lib/auth/__tests__/next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("@/lib/auth/__tests__/next-mocks")).nextNavigationMock);
vi.mock("@/lib/api/users", () => ({ listSupportAgents: mocks.listSupportAgents }));

async function render(props: Parameters<typeof AssigneePicker>[0]) {
  return renderToStaticMarkup(await AssigneePicker(props));
}

beforeEach(() => {
  resetNextState({ td_access: jwtExpiringIn(900) });
  mocks.listSupportAgents.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("AssigneePicker", () => {
  it("lista os atendentes sem o atual e mostra Reatribuir", async () => {
    mocks.listSupportAgents.mockResolvedValue([
      { id: "s1", name: "Bia" },
      { id: "s2", name: "Bruno" },
    ]);
    const html = await render({ mode: "reassign", currentAssigneeId: "s1" });
    expect(html).toContain('<option value="s2"');
    expect(html).not.toContain('value="s1"');
    expect(html).toContain("Reatribuir");
    expect(html).toContain('name="assigneeId"');
  });

  it("sem outros atendentes → mensagem de indisponível", async () => {
    mocks.listSupportAgents.mockResolvedValue([{ id: "s1", name: "Bia" }]);
    const html = await render({ mode: "reassign", currentAssigneeId: "s1" });
    expect(html).toContain("Nenhum atendente disponível para atribuição.");
    expect(html).not.toContain("<select");
  });

  it.each([NETWORK_ERROR_STATUS, 500, 403])("falha %s → mensagem isolada, sem botão", async (status) => {
    mocks.listSupportAgents.mockRejectedValue(new ApiError(status));
    const html = await render({ mode: "assign", currentAssigneeId: null });
    expect(html).toContain("Não foi possível carregar os atendentes.");
    expect(html).not.toContain("Atribuir");
  });
});
