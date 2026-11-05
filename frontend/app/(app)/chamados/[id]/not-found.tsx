import Link from "next/link";
import { LIST_HREF } from "@/lib/tickets/list";

/**
 * Chamado inexistente, fora da visibilidade do usuário ou com id inválido:
 * os três casos são iguais para quem vê (mesma semântica da API).
 */
export default function TicketNotFound() {
  return (
    <section className="flex flex-col items-center gap-4 py-20 text-center">
      <h1 className="text-2xl leading-none font-medium">Chamado não encontrado.</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Ele pode não existir ou não estar disponível para você.
      </p>
      <Link
        href={LIST_HREF}
        className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline"
      >
        Voltar aos chamados
      </Link>
    </section>
  );
}
