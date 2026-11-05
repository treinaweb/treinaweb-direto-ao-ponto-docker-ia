"use client";

import { useFormStatus } from "react-dom";
import type { ActionTone } from "@/lib/tickets/action-labels";
import { cn } from "@/lib/utils";

/** Botões de ação (44px, rótulo em caixa alta), por estilo do design system. */
export const ACTION_TONES: Record<ActionTone, string> = {
  primary: "bg-primary text-primary-foreground active:bg-primary-pressed",
  secondary: "border border-foreground bg-background text-foreground",
  destructive: "bg-bloom-deep text-white",
};

export const actionButtonClass =
  "inline-flex min-h-11 w-full items-center justify-center rounded-md px-4 text-sm font-semibold tracking-[0.05em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Botão de envio de uma ação do chamado. Enquanto QUALQUER ação do formulário
 * estiver em andamento, todos ficam desabilitados; só o acionado mostra o
 * texto de envio.
 */
export function ActionButton({
  intent,
  label,
  pendingLabel,
  tone,
  className,
}: {
  intent: string;
  label: string;
  pendingLabel: string;
  tone: ActionTone;
  className?: string;
}) {
  const { pending, data } = useFormStatus();
  const mine = pending && data?.get("intent") === intent;

  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      disabled={pending}
      aria-disabled={pending}
      className={cn(actionButtonClass, ACTION_TONES[tone], className)}
    >
      {mine ? pendingLabel : label}
    </button>
  );
}
