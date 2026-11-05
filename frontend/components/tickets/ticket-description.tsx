/** Descrição como texto simples: quebras de linha preservadas, nenhum HTML interpretado. */
export function TicketDescription({ text }: { text: string }) {
  return (
    <section aria-labelledby="ticket-description" className="grid gap-3 rounded-panel bg-card p-4 text-card-foreground md:p-6">
      <h2 id="ticket-description" className="text-base leading-[1.38] font-medium">
        Descrição
      </h2>
      <p className="text-base leading-[1.38] break-words whitespace-pre-wrap">{text}</p>
    </section>
  );
}
