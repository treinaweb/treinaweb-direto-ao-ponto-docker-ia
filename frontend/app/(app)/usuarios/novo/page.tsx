import type { Metadata } from "next";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth/dal";
import { USER_TEXT } from "@/lib/users/messages";
import { NewStaffForm } from "./new-staff-form";

export const metadata: Metadata = { title: "Novo usuário" };

export default function Page() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  // Demais papéis recebem "não encontrado"; por isso o título também fica
  // aqui dentro, e não no HTML estático da página.
  await requireRole("ADMIN");
  return (
    <section className="grid max-w-2xl gap-6">
      <div className="grid gap-3">
        <h1 className="text-2xl leading-none font-medium md:text-[2rem]">{USER_TEXT.newUser}</h1>
        <p className="text-sm text-muted-foreground">{USER_TEXT.publicSignup}</p>
      </div>
      <div className="grid gap-4 rounded-panel bg-card p-4 text-card-foreground md:p-6">
        <NewStaffForm />
      </div>
    </section>
  );
}

function FormSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando formulário" className="grid max-w-2xl gap-6">
      <div className="h-8 w-56 max-w-full animate-pulse rounded-md bg-muted" />
      <div className="grid gap-4 rounded-panel bg-card p-4 md:p-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-11 animate-pulse rounded-md bg-muted-foreground/20" />
        ))}
      </div>
    </div>
  );
}
