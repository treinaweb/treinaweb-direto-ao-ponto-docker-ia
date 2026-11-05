"use client";

import {
  useActionState,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createCategoryAction, renameCategoryAction } from "@/app/(app)/categorias/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CategoryNameState } from "@/lib/categories/form-state";
import { CATEGORY_COPY, CATEGORY_TEXT } from "@/lib/categories/messages";
import { cn } from "@/lib/utils";
import { CATEGORY_NAME_MAX } from "@/lib/validation/categories";

export type CategoryResult = { text: string; tone: "status" | "alert" };

type Mode = "create" | "rename";
type Target = { id: string; name: string };

const initialState: CategoryNameState = {};

/** Botão secundário (contorno, 44px, caixa alta), como as ações do chamado. */
export const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-foreground bg-background px-4 text-sm font-semibold tracking-[0.05em] text-foreground uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold tracking-[0.05em] text-primary-foreground uppercase outline-none active:bg-primary-pressed focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/**
 * Botão + diálogo de nome da categoria (criar ou renomear).
 *
 * - `open` é controlado; o gatilho fica fora do popup e é o `finalFocus`, e o
 *   campo "Nome" é o `initialFocus` (Base UI prende o foco e fecha com Esc).
 * - O formulário, com o seu `useActionState`, só monta com o diálogo aberto e
 *   ganha `key` por abertura: reabrir começa sem erro e sem valor anterior.
 * - Com `done`/`gone`, o diálogo fecha e entrega a mensagem a `onResult`.
 * - Activity (Next 16): ao esconder a página, a limpeza do `useLayoutEffect`
 *   fecha o diálogo, para ele não reaparecer aberto ao voltar.
 */
export function CategoryNameDialog({
  mode,
  category,
  onResult,
  triggerClassName,
}: {
  mode: Mode;
  /** Categoria a renomear (só no modo `rename`). */
  category?: Target;
  onResult: (result: CategoryResult | null) => void;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Durante o envio o diálogo não fecha (Esc, clique fora): a resposta ainda vem.
  const pendingRef = useRef(false);

  useLayoutEffect(() => () => setOpen(false), []);

  function finish(result: CategoryResult | null) {
    pendingRef.current = false;
    setOpen(false);
    onResult(result);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpening((n) => n + 1);
          setOpen(true);
        }}
        className={triggerClassName ?? (mode === "create" ? primaryButtonClass : secondaryButtonClass)}
      >
        {mode === "create" ? (
          CATEGORY_COPY.newCategory
        ) : (
          <>
            {CATEGORY_COPY.rename}
            <span className="sr-only"> {category?.name}</span>
          </>
        )}
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next && pendingRef.current) return;
          setOpen(next);
        }}
      >
        <DialogContent initialFocus={inputRef} finalFocus={triggerRef}>
          <DialogHeader>
            <DialogTitle>{CATEGORY_COPY.dialog[mode].title}</DialogTitle>
          </DialogHeader>
          <CategoryNameForm
            key={opening}
            mode={mode}
            category={category}
            inputRef={inputRef}
            pendingRef={pendingRef}
            onCancel={() => setOpen(false)}
            onFinish={finish}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function CategoryNameForm({
  mode,
  category,
  inputRef,
  pendingRef,
  onCancel,
  onFinish,
}: {
  mode: Mode;
  category?: Target;
  inputRef: React.RefObject<HTMLInputElement | null>;
  pendingRef: React.RefObject<boolean>;
  onCancel: () => void;
  onFinish: (result: CategoryResult | null) => void;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createCategoryAction : renameCategoryAction,
    initialState,
  );
  // Campo controlado: o React reinicia os campos não controlados depois de
  // uma action, e o nome precisa continuar exatamente como foi digitado.
  const [name, setName] = useState(category?.name ?? "");

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending, pendingRef]);

  // Só reage a um novo resultado da action (não a uma nova `onFinish`).
  const handleResult = useEffectEvent((result: CategoryNameState) => {
    if (result.done) {
      onFinish(result.done.notice ? { text: result.done.notice, tone: "status" } : null);
    } else if (result.gone) {
      onFinish({ text: CATEGORY_TEXT.gone, tone: "alert" });
    } else if (result.fieldErrors || result.formError) {
      // Erro: o diálogo continua aberto, com o foco de volta no campo.
      inputRef.current?.focus();
    }
  });

  useEffect(() => {
    handleResult(state);
  }, [state]);

  return (
    <CategoryNameFormView
      mode={mode}
      category={category}
      name={name}
      onNameChange={setName}
      state={state}
      pending={pending}
      formAction={formAction}
      onCancel={onCancel}
      inputRef={inputRef}
    />
  );
}

/** Apresentação do formulário do diálogo (separada para os testes). */
export function CategoryNameFormView({
  mode,
  category,
  name,
  onNameChange,
  state,
  pending,
  formAction,
  onCancel,
  inputRef,
}: {
  mode: Mode;
  category?: Target;
  name: string;
  onNameChange: (name: string) => void;
  state: CategoryNameState;
  pending: boolean;
  formAction: (formData: FormData) => void;
  onCancel: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const copy = CATEGORY_COPY.dialog[mode];

  return (
    <form action={formAction} noValidate className="grid gap-4">
      {state.formError ? <FormAlert tone="error">{state.formError}</FormAlert> : null}
      {mode === "rename" && category ? (
        <>
          <input type="hidden" name="categoryId" value={category.id} />
          <input type="hidden" name="currentName" value={category.name} />
        </>
      ) : null}

      <FormField
        ref={inputRef}
        name="name"
        label={CATEGORY_COPY.nameLabel}
        autoComplete="off"
        // Folga além do limite: a validação (no servidor) explica o erro.
        maxLength={CATEGORY_NAME_MAX + 20}
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        readOnly={pending}
        error={state.fieldErrors?.name}
      />

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={pending}
          aria-disabled={pending}
          onClick={onCancel}
          className={cn(secondaryButtonClass, "w-full sm:w-auto")}
        >
          {CATEGORY_COPY.cancel}
        </button>
        <SubmitButton
          pending={pending}
          label={copy.submit}
          pendingLabel={copy.pending}
          className="sm:w-auto"
        />
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {pending ? copy.announce : ""}
      </p>
    </form>
  );
}
