"use client";

import { Button } from "@/components/ui/button";

// Exceções inesperadas: mensagem pt-BR, sem detalhes internos.
export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <h1 className="text-2xl leading-none font-medium">Algo deu errado</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Não foi possível carregar esta página. Tente novamente em instantes.
      </p>
      <Button
        onClick={() => retry()}
        className="h-11 rounded-md px-6 text-sm font-semibold tracking-[0.05em] uppercase"
      >
        Tentar novamente
      </Button>
    </main>
  );
}
