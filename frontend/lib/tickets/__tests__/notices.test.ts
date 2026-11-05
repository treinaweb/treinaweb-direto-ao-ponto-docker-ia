import { describe, expect, it } from "vitest";
import { getTicketNotice, withNotice } from "@/lib/tickets/notices";

describe("getTicketNotice", () => {
  it("código conhecido → texto pt-BR", () => {
    expect(getTicketNotice("chamado-aberto")).toBe("Chamado aberto.");
  });

  it.each(["<script>", "toString", "__proto__", "", "Chamado aberto."])(
    "código desconhecido %j → nenhum aviso",
    (code) => {
      expect(getTicketNotice(code)).toBeNull();
    },
  );

  it.each([undefined, null, 42, {}])("valor não string %j → nenhum aviso", (code) => {
    expect(getTicketNotice(code)).toBeNull();
  });

  it("valor repetido usa o primeiro", () => {
    expect(getTicketNotice(["chamado-aberto", "x"])).toBe("Chamado aberto.");
  });
});

describe("withNotice", () => {
  it("acrescenta o aviso com ? ou &", () => {
    expect(withNotice("/chamados", "chamado-aberto")).toBe("/chamados?aviso=chamado-aberto");
    expect(withNotice("/chamados?status=OPEN", "chamado-aberto")).toBe(
      "/chamados?status=OPEN&aviso=chamado-aberto",
    );
  });
});
