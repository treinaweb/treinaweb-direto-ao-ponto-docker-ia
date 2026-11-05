"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { createContext, use, useActionState, useLayoutEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { changeRoleAction } from "@/app/(app)/usuarios/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { secondaryButtonClass } from "@/components/categories/category-name-dialog";
import { SelectField } from "@/components/forms/select-field";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Role } from "@/lib/api/types";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { RoleChangeState } from "@/lib/users/form-state";
import { USER_TEXT, changeRoleTitle, demotionWarning } from "@/lib/users/messages";
import { isDemotionToCustomer, rolesOfferedFor } from "@/lib/users/roles";
import { cn } from "@/lib/utils";

/** Usuário escolhido na lista (DTO enxuto já serializado pelo servidor). */
export type RoleChangeTarget = { id: string; name: string; role: Role };

type OpenDialog = (target: RoleChangeTarget, trigger: HTMLButtonElement) => void;

const RoleChangeContext = createContext<OpenDialog | null>(null);

const initialState: RoleChangeState = {};

const primaryButtonClass =
  "inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold tracking-[0.05em] text-primary-foreground uppercase outline-none active:bg-primary-pressed focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:bg-input disabled:text-primary-foreground sm:w-auto";

/**
 * Mudança de papel: um único diálogo e um único `useActionState` para toda a
 * lista (renderizada no servidor e recebida em `children`). A região de
 * resultado fica fora do diálogo e sempre montada, então "Papel alterado."
 * sobrevive ao `refresh()` e ao fechamento do diálogo.
 *
 * - Fecha só com `notice` (sucesso) ou `gone` (404); nos demais erros fica
 *   aberto com a escolha feita e o erro dentro dele. A reação a um novo estado
 *   da action é um ajuste de estado durante a renderização (padrão do React
 *   para "estado derivado de outro estado"), não um `useEffect`.
 * - Foco preso no diálogo (Base UI), Esc e "Cancelar" fecham sem alterar nada,
 *   e o foco volta ao botão da linha (`finalFocus`). Durante o envio, não fecha.
 * - Activity (Next 16): ao esconder a página, a limpeza do `useLayoutEffect`
 *   fecha o diálogo, para ele não reaparecer aberto ao voltar.
 */
export function RoleChangeProvider({ children }: { children: React.ReactNode }) {
  const [state, formAction, pending] = useActionState(changeRoleAction, initialState);
  const [target, setTarget] = useState<RoleChangeTarget | null>(null);
  // Cada abertura ganha um número: o formulário remonta limpo, e o erro só
  // aparece na abertura em que aconteceu.
  const [opening, setOpening] = useState(0);
  const [errorOpening, setErrorOpening] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useLayoutEffect(() => () => setTarget(null), []);

  // Novo resultado da action (só ele, nunca uma nova renderização qualquer).
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.notice || state.gone) {
      setTarget(null);
    } else if (state.error) {
      setErrorOpening(opening);
    }
  }

  const open: OpenDialog = (next, trigger) => {
    triggerRef.current = trigger;
    setOpening((n) => n + 1);
    setTarget(next);
  };

  const dialogError = target && errorOpening === opening && !state.gone ? state.error : undefined;

  return (
    <RoleChangeContext value={open}>
      <RoleChangeResult state={state} />
      {children}

      <AlertDialog
        open={target !== null}
        onOpenChange={(next) => {
          // Durante o envio o diálogo não fecha (Esc, clique fora): a resposta ainda vem.
          if (!next && pending) return;
          if (!next) setTarget(null);
        }}
      >
        <AlertDialogContent finalFocus={triggerRef}>
          {target ? (
            <RoleChangeForm
              key={opening}
              target={target}
              error={dialogError}
              formAction={formAction}
              onCancel={() => setTarget(null)}
            />
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </RoleChangeContext>
  );
}

function RoleChangeForm({
  target,
  error,
  formAction,
  onCancel,
}: {
  target: RoleChangeTarget;
  error?: string;
  formAction: (formData: FormData) => void;
  onCancel: () => void;
}) {
  // Controlado: o React reinicia os campos não controlados depois de uma
  // action, e a escolha precisa continuar feita quando o envio falha.
  const [choice, setChoice] = useState<Role | "">("");
  return (
    <RoleChangeFormView
      target={target}
      choice={choice}
      onChoiceChange={setChoice}
      error={error}
      formAction={formAction}
      onCancel={onCancel}
    />
  );
}

/** Conteúdo do diálogo (separado para os testes). */
export function RoleChangeFormView({
  target,
  choice,
  onChoiceChange,
  error,
  formAction,
  onCancel,
}: {
  target: RoleChangeTarget;
  choice: Role | "";
  onChoiceChange: (choice: Role | "") => void;
  error?: string;
  formAction: (formData: FormData) => void;
  onCancel: () => void;
}) {
  const options = rolesOfferedFor(target.role).map((role) => ({ value: role, label: ROLE_LABELS[role] }));

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className="break-words wrap-anywhere">{changeRoleTitle(target.name)}</AlertDialogTitle>
        <AlertDialogDescription>Papel atual: {ROLE_LABELS[target.role]}</AlertDialogDescription>
      </AlertDialogHeader>

      <form action={formAction} noValidate className="grid gap-4">
        <input type="hidden" name="userId" value={target.id} />
        <SelectField
          name="role"
          label={USER_TEXT.newRoleLabel}
          placeholder={USER_TEXT.newRolePlaceholder}
          options={options}
          value={choice}
          onChange={(event) => onChoiceChange(event.target.value as Role | "")}
        />

        {isDemotionToCustomer(target.role, choice) ? (
          <FormAlert tone="warning" className="break-words wrap-anywhere">
            {demotionWarning(target.name)}
          </FormAlert>
        ) : null}

        {error ? <FormAlert tone="error">{error}</FormAlert> : null}

        <RoleChangeFooter onCancel={onCancel} />
      </form>
    </>
  );
}

/** "Cancelar" e "Mudar papel" ("Alterando..." e desabilitados durante o envio). */
function RoleChangeFooter({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();
  return (
    <>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={pending}
          aria-disabled={pending}
          onClick={onCancel}
          className={cn(secondaryButtonClass, "w-full sm:w-auto")}
        >
          {USER_TEXT.cancel}
        </button>
        <button type="submit" disabled={pending} aria-disabled={pending} className={primaryButtonClass}>
          {pending ? USER_TEXT.changingRole : USER_TEXT.changeRole}
        </button>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {pending ? USER_TEXT.changingRole : ""}
      </p>
    </>
  );
}

/**
 * Resultado da última mudança, fora do diálogo: sucesso em `role="status"`,
 * 404 em `role="alert"`. As duas regiões ficam sempre montadas (vazias), para
 * o leitor de tela anunciar o texto quando ele entra.
 */
export function RoleChangeResult({ state }: { state: RoleChangeState }) {
  const success = state.notice ?? null;
  const gone = state.gone ? state.error : null;
  return (
    <div data-slot="role-change-result" className="empty:hidden">
      <div role="status" aria-live="polite">
        {success ? (
          <p className="mb-4 flex items-start gap-2 rounded-md bg-info px-3 py-2.5 text-sm text-info-foreground">
            <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
            {success}
          </p>
        ) : null}
      </div>
      <div role="alert">
        {gone ? (
          <p className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-background px-3 py-2.5 text-sm text-destructive">
            <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            {gone}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Botão "Mudar papel" de uma linha; nome acessível "Mudar papel de {nome}". */
export function RoleChangeButton({ id, name, role }: RoleChangeTarget) {
  const open = use(RoleChangeContext);
  return (
    <button
      type="button"
      disabled={!open}
      onClick={(event) => open?.({ id, name, role }, event.currentTarget)}
      className={cn(secondaryButtonClass, "w-full whitespace-nowrap md:w-auto md:px-3 lg:px-4")}
    >
      {USER_TEXT.changeRole}
      <span className="sr-only"> de {name}</span>
    </button>
  );
}
