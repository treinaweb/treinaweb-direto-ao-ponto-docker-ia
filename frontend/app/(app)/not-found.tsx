import Link from "next/link";
import { DASHBOARD_HREF } from "@/lib/navigation/config";

/** "Não encontrado" dentro da moldura (inclui páginas vetadas ao papel). */
export default function NotFound() {
  return (
    <section className="flex flex-col items-center gap-4 py-20 text-center">
      <h1 className="text-2xl leading-none font-medium">Página não encontrada</h1>
      <p className="max-w-md text-sm text-muted-foreground">Não encontramos o que você procurava.</p>
      <Link
        href={DASHBOARD_HREF}
        className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline"
      >
        Voltar ao painel
      </Link>
    </section>
  );
}
