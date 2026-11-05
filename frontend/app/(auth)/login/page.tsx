import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormAlert } from "@/components/auth/form-alert";
import { getNotice } from "@/lib/auth/notices";
import { safeNext } from "@/lib/auth/redirect";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

type SearchParams = PageProps<"/login">["searchParams"];

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <header className="mb-6 grid gap-2">
        <h1 className="text-2xl leading-none font-medium sm:text-[2rem]">Entrar</h1>
        <p className="text-sm text-muted-foreground">Acesse sua conta do TreinaDesk.</p>
      </header>

      {/*
        O formulário fica no shell estático (o usuário pode digitar de imediato).
        Só o aviso e o destino dependem de searchParams (dado da requisição),
        por isso entram em Suspense próprios, sem recriar os campos.
      */}
      <LoginForm
        notice={
          <Suspense fallback={null}>
            <LoginNotice searchParams={searchParams} />
          </Suspense>
        }
        nextField={
          <Suspense fallback={null}>
            <NextField searchParams={searchParams} />
          </Suspense>
        }
      />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link
          href="/cadastro"
          className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline"
        >
          Criar conta
        </Link>
      </p>
    </>
  );
}

async function LoginNotice({ searchParams }: { searchParams: SearchParams }) {
  const notice = getNotice((await searchParams).aviso);
  if (!notice) return null;
  return <FormAlert tone={notice.tone === "warning" ? "warning" : "info"}>{notice.text}</FormAlert>;
}

async function NextField({ searchParams }: { searchParams: SearchParams }) {
  const { next } = await searchParams;
  if (typeof next !== "string" || !next) return null;
  return <input type="hidden" name="next" value={safeNext(next)} />;
}
