"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { ACTION_TONES, actionButtonClass } from "./action-button";

const INTENT = "status:CLOSED";

/**
 * "Fechar chamado" é definitivo: o botão só abre a confirmação, e o envio
 * parte do botão de confirmar (que aponta para o formulário pelo atributo
 * `form`, já que o diálogo é renderizado num portal fora dele).
 */
export function CloseTicketButton({ formId }: { formId: string }) {
  const [open, setOpen] = useState(false);
  const { pending, data } = useFormStatus();
  const mine = pending && data?.get("intent") === INTENT;

  return (
    <>
      <button
        type="button"
        disabled={pending}
        aria-disabled={pending}
        onClick={() => setOpen(true)}
        className={cn(actionButtonClass, ACTION_TONES.destructive)}
      >
        {mine ? "Fechando..." : "Fechar chamado"}
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar este chamado?</AlertDialogTitle>
            <AlertDialogDescription>Depois de fechado, ele não pode ser reaberto.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-md px-4 text-sm font-semibold tracking-[0.05em] uppercase">
              Cancelar
            </AlertDialogCancel>
            <button
              type="submit"
              form={formId}
              name="intent"
              value={INTENT}
              onClick={() => setOpen(false)}
              className={cn(actionButtonClass, ACTION_TONES.destructive, "sm:w-auto")}
            >
              Fechar chamado
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
