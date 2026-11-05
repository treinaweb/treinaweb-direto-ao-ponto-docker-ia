import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PanelError } from "@/components/dashboard/panel-error";
import { listCategories } from "@/lib/api/categories";
import { getAccessToken, requireRole } from "@/lib/auth/dal";
import { loadPanel } from "@/lib/dashboard/load-panel";
import { LIST_HREF } from "@/lib/tickets/list";
import { NewTicketForm } from "./new-ticket-form";

export const metadata: Metadata = { title: "Abrir chamado" };

export default function Page() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  // Equipe recebe "não encontrado" antes de qualquer chamada a /categories; por
  // isso o título também fica aqui dentro, e não no HTML estático da página.
  await requireRole("CUSTOMER");
  return (
    <section className="grid max-w-3xl gap-6">
      <h1 className="text-2xl leading-none font-medium md:text-[2rem]">Abrir chamado</h1>
      <Suspense fallback={<FormSkeleton />}>
        <FormContent />
      </Suspense>
    </section>
  );
}

async function FormContent() {
  const token = await getAccessToken();
  const result = await loadPanel(() => listCategories(token));

  if (!result.ok) {
    return (
      <Panel>
        <PanelError message="Não foi possível carregar o formulário." />
      </Panel>
    );
  }

  if (result.data.length === 0) {
    return (
      <Panel>
        <p className="text-sm">
          Ainda não há categorias disponíveis para abrir chamados. Tente novamente mais tarde.
        </p>
        <Link
          href={LIST_HREF}
          className="inline-flex min-h-11 w-fit items-center font-medium text-primary underline-offset-4 hover:underline"
        >
          Voltar aos chamados
        </Link>
      </Panel>
    );
  }

  // DTO enxuto: só id e nome (o cliente já recebe apenas as ativas, em ordem alfabética).
  const categories = result.data.map(({ id, name }) => ({ id, name }));
  return (
    <Panel>
      <NewTicketForm categories={categories} />
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 rounded-panel bg-card p-4 text-card-foreground md:p-6">{children}</div>
  );
}

function FormSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando formulário" className="grid gap-4 rounded-panel bg-card p-4 md:p-6">
      {[44, 128, 44].map((h, i) => (
        <div key={i} style={{ height: h }} className="animate-pulse rounded-md bg-muted-foreground/20" />
      ))}
    </div>
  );
}
