import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoryAdmin } from "@/components/categories/category-admin";
import { PanelError } from "@/components/dashboard/panel-error";
import { listCategories } from "@/lib/api/categories";
import { getAccessToken, requireRole } from "@/lib/auth/dal";
import { CATEGORY_COPY, CATEGORY_TEXT } from "@/lib/categories/messages";
import { loadPanel } from "@/lib/dashboard/load-panel";

export const metadata: Metadata = { title: "Categorias" };

export default function Page() {
  return (
    <Suspense fallback={<CategoriesSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  // Demais papéis recebem "não encontrado" antes de qualquer chamada a
  // /categories; por isso o título também fica aqui dentro.
  await requireRole("ADMIN");
  const token = await getAccessToken();
  const result = await loadPanel(() => listCategories(token));

  if (!result.ok) {
    // Sem a lista e sem "Nova categoria": só a falha e "Tentar novamente".
    return (
      <section className="grid gap-4">
        <h1 className="text-2xl leading-none font-medium md:text-[2rem]">{CATEGORY_COPY.pageTitle}</h1>
        <p className="text-sm text-muted-foreground">{CATEGORY_TEXT.inactiveExplanation}</p>
        <div className="rounded-panel bg-card p-4 text-card-foreground md:p-6">
          <PanelError message={CATEGORY_TEXT.loadError} />
        </div>
      </section>
    );
  }

  // DTO enxuto, na ordem da API (por nome). `active` ausente conta como ativa.
  const categories = result.data.map((c) => ({ id: c.id, name: c.name, active: c.active !== false }));
  return <CategoryAdmin categories={categories} />;
}

function CategoriesSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando categorias" className="grid gap-4">
      <div className="h-8 w-56 max-w-full animate-pulse rounded-md bg-muted" />
      <div className="h-5 w-full max-w-xl animate-pulse rounded-md bg-muted" />
      <div className="grid gap-3 rounded-panel bg-card p-4 md:p-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-11 animate-pulse rounded-md bg-muted-foreground/20" />
        ))}
      </div>
    </div>
  );
}
