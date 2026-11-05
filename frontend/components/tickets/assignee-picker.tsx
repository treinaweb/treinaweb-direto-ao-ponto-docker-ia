import { listSupportAgents } from "@/lib/api/users";
import { getAccessToken } from "@/lib/auth/dal";
import { loadPanel } from "@/lib/dashboard/load-panel";
import { actionCopy } from "@/lib/tickets/action-labels";
import { ActionButton } from "./action-button";

/**
 * Escolha do atendente para o ADMIN (Server Component em `Suspense` próprio).
 * Todos os SUPPORT em ordem alfabética, sem o atendente atual. A falha fica
 * isolada aqui: as demais ações do chamado continuam disponíveis.
 */
export async function AssigneePicker({
  mode,
  currentAssigneeId,
}: {
  mode: "assign" | "reassign";
  currentAssigneeId: string | null;
}) {
  // O token é lido aqui, nunca recebido por props.
  const accessToken = await getAccessToken();
  const result = await loadPanel(() => listSupportAgents(accessToken));

  if (!result.ok) {
    return <Message>Não foi possível carregar os atendentes.</Message>;
  }

  const options = result.data.filter((agent) => agent.id !== currentAssigneeId);
  if (options.length === 0) {
    return <Message>Nenhum atendente disponível para atribuição.</Message>;
  }

  const copy = actionCopy({ kind: "assign", mode });
  return (
    <div className="grid gap-2">
      <label htmlFor="field-assigneeId" className="text-sm font-medium">
        Atendente
      </label>
      {/* Pré-seleciona o primeiro: o envio nunca sai sem atendente. */}
      <select
        id="field-assigneeId"
        name="assigneeId"
        defaultValue={options[0].id}
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
      >
        {options.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name}
          </option>
        ))}
      </select>
      <ActionButton intent="assign" label={copy.label} pendingLabel={copy.pending} tone={copy.tone} />
    </div>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export function AssigneePickerSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando atendentes" className="grid gap-2">
      <div className="h-4 w-20 animate-pulse rounded bg-muted-foreground/20" />
      <div className="h-11 animate-pulse rounded-md bg-muted-foreground/20" />
    </div>
  );
}
