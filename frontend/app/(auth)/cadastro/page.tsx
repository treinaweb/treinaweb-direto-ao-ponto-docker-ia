import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignupPage() {
  return (
    <>
      <header className="mb-6 grid gap-2">
        <h1 className="text-2xl leading-none font-medium sm:text-[2rem]">Criar conta</h1>
        <p className="text-sm text-muted-foreground">
          Abra e acompanhe seus chamados no TreinaDesk.
        </p>
      </header>

      <SignupForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </>
  );
}
