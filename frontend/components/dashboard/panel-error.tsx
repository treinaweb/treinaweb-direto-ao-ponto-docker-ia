"use client";

import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** Falha isolada de um painel: os demais continuam visíveis. */
export function PanelError({
  message = "Não foi possível carregar estes dados.",
}: {
  message?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div role="alert" className="flex flex-col items-start gap-3">
      <p className="text-sm">{message}</p>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-foreground px-4 text-sm font-semibold tracking-[0.05em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        <RotateCw aria-hidden className="size-4" />
        {pending ? "Tentando..." : "Tentar novamente"}
      </button>
    </div>
  );
}
