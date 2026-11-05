import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatNumber, formatPercent } from "@/lib/format";
import {
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  STATUS_LABELS,
  STATUS_LABELS_PLURAL,
  STATUS_ORDER,
} from "@/lib/tickets/labels";

describe("formatação pt-BR", () => {
  it("milhar com ponto", () => {
    expect(formatNumber(1234)).toBe("1.234");
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(1234567)).toBe("1.234.567");
  });

  it("percentual sem casas", () => {
    expect(formatPercent(0.5)).toBe("50%");
    expect(formatPercent(1 / 3)).toBe("33%");
    expect(formatPercent(0)).toBe("0%");
  });

  it("data no horário de Brasília", () => {
    expect(formatDate("2026-10-14T02:00:00.000Z")).toBe("13/10/2026");
    expect(formatDate("2026-10-14T15:00:00.000Z")).toBe("14/10/2026");
    expect(formatDateTime("2026-10-14T15:30:00.000Z")).toBe("14/10/2026, 12:30");
    expect(formatDateTime("2026-10-14T02:05:00.000Z")).toBe("13/10/2026, 23:05");
  });
});

describe("rótulos de chamados", () => {
  it("todo status tem rótulo singular e plural, na ordem do ciclo de vida", () => {
    expect(STATUS_ORDER).toEqual(["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"]);
    for (const status of STATUS_ORDER) {
      expect(STATUS_LABELS[status]).toBeTruthy();
      expect(STATUS_LABELS_PLURAL[status]).toBeTruthy();
    }
    expect(STATUS_LABELS.WAITING_CUSTOMER).toBe("Aguardando cliente");
    expect(STATUS_LABELS_PLURAL.CLOSED).toBe("Fechados");
  });

  it("toda prioridade tem rótulo, da mais urgente para a menos", () => {
    expect(PRIORITY_ORDER.map((p) => PRIORITY_LABELS[p])).toEqual([
      "Urgente",
      "Alta",
      "Média",
      "Baixa",
    ]);
  });
});
