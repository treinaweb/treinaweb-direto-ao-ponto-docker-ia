import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <h1 className="text-2xl leading-none font-medium">Página não encontrada</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Não encontramos o que você procurava.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline"
      >
        Voltar ao início
      </Link>
    </main>
  );
}
