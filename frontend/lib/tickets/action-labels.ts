import type { StatusTarget, TicketAction } from "./actions";

/** Estilo do botão: primário (ação principal), secundário ou destrutivo (fechar). */
export type ActionTone = "primary" | "secondary" | "destructive";

type ActionCopy = { label: string; pending: string; tone: ActionTone };

const STATUS_COPY: Record<StatusTarget, ActionCopy & { success: string }> = {
  RESOLVED: { label: "Resolver", pending: "Resolvendo...", tone: "primary", success: "Chamado resolvido." },
  WAITING_CUSTOMER: {
    label: "Aguardar cliente",
    pending: "Salvando...",
    tone: "secondary",
    success: "Chamado aguardando o cliente.",
  },
  IN_PROGRESS: { label: "Reabrir", pending: "Reabrindo...", tone: "primary", success: "Chamado reaberto." },
  CLOSED: { label: "Fechar chamado", pending: "Fechando...", tone: "destructive", success: "Chamado fechado." },
};

/** Rótulo, texto de envio e estilo de cada ação. */
export function actionCopy(action: TicketAction): ActionCopy {
  switch (action.kind) {
    case "assume":
      return { label: "Assumir", pending: "Assumindo...", tone: "primary" };
    case "assign":
      return action.mode === "assign"
        ? { label: "Atribuir", pending: "Atribuindo...", tone: "primary" }
        : { label: "Reatribuir", pending: "Reatribuindo...", tone: "secondary" };
    case "status":
      return STATUS_COPY[action.to];
  }
}

/** Mensagem de sucesso (atribuição usa o nome do atendente devolvido pela API). */
export function successMessage(
  action: { kind: "assume" } | { kind: "assign"; assigneeName: string } | { kind: "status"; to: StatusTarget },
): string {
  switch (action.kind) {
    case "assume":
      return "Chamado assumido.";
    case "assign":
      return `Chamado atribuído a ${action.assigneeName}.`;
    case "status":
      return STATUS_COPY[action.to].success;
  }
}

export const ACTION_ERRORS = {
  conflict: "Este chamado foi alterado por outra pessoa. Confira a situação atual e tente novamente.",
  notAllowed: "Esta ação não está mais disponível para a situação atual do chamado.",
  gone: "Este chamado não está mais disponível para você.",
} as const;

export const CLOSE_CONFIRMATION = "Fechar este chamado? Depois de fechado, ele não pode ser reaberto.";
