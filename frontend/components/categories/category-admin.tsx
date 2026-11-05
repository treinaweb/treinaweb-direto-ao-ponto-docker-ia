"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { useActionState, useState } from "react";
import { toggleCategoryAction } from "@/app/(app)/categorias/actions";
import type { CategoryToggleState } from "@/lib/categories/form-state";
import { CATEGORY_COPY, CATEGORY_TEXT } from "@/lib/categories/messages";
import { cn } from "@/lib/utils";
import { CategoryNameDialog, secondaryButtonClass, type CategoryResult } from "./category-name-dialog";
import { CategoryStatusChip } from "./category-status-chip";

/** DTO enxuto enviado pelo servidor. */
export type CategoryItem = { id: string; name: string; active: boolean };

const TOGGLE_FORM_ID = "category-toggle";
const initialToggle: CategoryToggleState = {};

function toResult(state: CategoryToggleState): CategoryResult | null {
  if (state.error) return { text: state.error, tone: "alert" };
  if (state.notice) return { text: state.notice, tone: "status" };
  return null;
}

/**
 * Administração das categorias (raiz das interações). Uma única região de
 * resultado, fora dos diálogos, recebe a mensagem da última ação (do diálogo
 * ou do toggle) e é substituída a cada nova ação.
 */
export function CategoryAdmin({ categories }: { categories: CategoryItem[] }) {
  const [toggleState, toggleAction, togglePending] = useActionState(
    toggleCategoryAction,
    initialToggle,
  );
  const [result, setResult] = useState<CategoryResult | null>(null);
  // Qual botão de ativar/desativar disparou o envio (só ele mostra o texto de envio).
  const [submitted, setSubmitted] = useState<string | null>(null);

  // Novo resultado do toggle → substitui a mensagem (ajuste de estado na renderização).
  const [seenToggle, setSeenToggle] = useState(toggleState);
  if (toggleState !== seenToggle) {
    setSeenToggle(toggleState);
    setResult(toResult(toggleState));
  }

  return (
    <CategoryAdminView
      categories={categories}
      result={result}
      onResult={(next) => {
        if (next) setResult(next);
      }}
      toggleAction={toggleAction}
      pendingIntent={togglePending ? submitted ?? "" : null}
      onToggleClick={setSubmitted}
    />
  );
}

/** Apresentação da página a partir do estado (separada para os testes). */
export function CategoryAdminView({
  categories,
  result,
  onResult,
  toggleAction,
  pendingIntent,
  onToggleClick,
}: {
  categories: CategoryItem[];
  result: CategoryResult | null;
  onResult: (result: CategoryResult | null) => void;
  toggleAction: (formData: FormData) => void;
  /** `null` sem toggle em andamento; senão, o `intent` do botão acionado. */
  pendingIntent: string | null;
  onToggleClick: (intent: string) => void;
}) {
  const togglePending = pendingIntent !== null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl leading-none font-medium md:text-[2rem]">{CATEGORY_COPY.pageTitle}</h1>
        <CategoryNameDialog
          mode="create"
          onResult={onResult}
          triggerClassName="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold tracking-[0.05em] text-primary-foreground uppercase outline-none active:bg-primary-pressed focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:w-auto"
        />
      </div>
      {/* Sem `gap`: a região vazia não pode abrir espaço; a mensagem traz a própria margem. */}
      <div>
        <p className="text-sm text-muted-foreground">{CATEGORY_TEXT.inactiveExplanation}</p>
        <ResultRegion result={result} />
      </div>

      {/* Formulário vazio: os botões de cada item apontam para ele pelo atributo `form`. */}
      <form id={TOGGLE_FORM_ID} action={toggleAction} className="hidden" />

      <section
        aria-label={CATEGORY_COPY.listLabel}
        className="rounded-panel bg-card p-2 text-card-foreground md:p-4"
      >
        {categories.length === 0 ? (
          <p className="p-2 text-sm">{CATEGORY_TEXT.empty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {categories.map((category) => {
              const intent = `${category.active ? "deactivate" : "activate"}:${category.id}`;
              const mine = pendingIntent === intent;
              const label = category.active ? CATEGORY_COPY.deactivate : CATEGORY_COPY.activate;
              const pendingLabel = category.active ? CATEGORY_COPY.deactivating : CATEGORY_COPY.activating;
              return (
                <li
                  key={category.id}
                  className="grid gap-3 p-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="min-w-0 text-base leading-[1.38] font-medium break-words wrap-anywhere">
                      {category.name}
                    </span>
                    <CategoryStatusChip active={category.active} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:flex">
                    <CategoryNameDialog
                      mode="rename"
                      category={{ id: category.id, name: category.name }}
                      onResult={onResult}
                    />
                    <button
                      type="submit"
                      form={TOGGLE_FORM_ID}
                      name="intent"
                      value={intent}
                      disabled={togglePending}
                      aria-disabled={togglePending}
                      onClick={() => onToggleClick(intent)}
                      className={cn(secondaryButtonClass)}
                    >
                      {mine ? pendingLabel : label}
                      <span className="sr-only"> {category.name}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/**
 * Região única de resultado, no mesmo lugar da página: sucesso em
 * `role="status"`, erro em `role="alert"`. As duas regiões ficam sempre
 * montadas (vazias) para o leitor de tela anunciar o texto quando ele entra, e
 * só uma mostra texto por vez (a mensagem anterior é substituída).
 */
function ResultRegion({ result }: { result: CategoryResult | null }) {
  const success = result?.tone === "status" ? result.text : null;
  const error = result?.tone === "alert" ? result.text : null;
  return (
    <div data-slot="category-result">
      <div role="status" aria-live="polite">
        {success ? (
          <p className="mt-3 flex items-start gap-2 rounded-md bg-info px-3 py-2.5 text-sm text-info-foreground">
            <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
            {success}
          </p>
        ) : null}
      </div>
      <div role="alert">
        {error ? (
          <p className="mt-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-background px-3 py-2.5 text-sm text-destructive">
            <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
