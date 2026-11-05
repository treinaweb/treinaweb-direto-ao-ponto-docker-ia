import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getAccessToken } from "@/lib/auth/dal";
import { getAttentionTickets, getCustomerKpis, getRecentTickets } from "@/lib/dashboard/customer";
import { loadPanel } from "@/lib/dashboard/load-panel";
import { KpiGrid, KpiGridError, KpiGridSkeleton } from "./kpi";
import { Panel, PanelMessage, PanelSkeleton } from "./panel";
import { PanelError } from "./panel-error";
import { TicketList } from "./ticket-list";

const KPI_LABELS = {
  OPEN: "Abertos",
  IN_PROGRESS: "Em andamento",
  WAITING_CUSTOMER: "Aguardando sua resposta",
  RESOLVED: "Resolvidos",
};

const ATTENTION = "Precisam da sua atenção";
const RECENT = "Chamados recentes";
const ACTION_NOTES = { reply: "Responder", confirm: "Confirmar solução" } as const;

/** Painel do cliente: "o que eu preciso fazer?". */
export function CustomerDashboard() {
  return (
    <>
      <Suspense fallback={<KpiGridSkeleton />}>
        <Kpis />
      </Suspense>
      <Suspense fallback={<ListsSkeleton />}>
        <Lists />
      </Suspense>
    </>
  );
}

async function Kpis() {
  const result = await loadPanel(async () => getCustomerKpis(await getAccessToken()));
  return result.ok ? <KpiGrid counts={result.data} labels={KPI_LABELS} /> : <KpiGridError />;
}

/** Sem nenhum chamado, as listas dão lugar ao convite para abrir o primeiro. */
async function Lists() {
  const recent = await loadPanel(async () => getRecentTickets(await getAccessToken()));

  if (recent.ok && recent.data.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Suspense fallback={<PanelSkeleton title={ATTENTION} />}>
        <AttentionPanel />
      </Suspense>
      <Panel title={RECENT} action={{ href: "/chamados", label: "Ver todos" }}>
        {recent.ok ? <TicketList items={recent.data} show={{ chip: "status" }} /> : <PanelError />}
      </Panel>
    </div>
  );
}

async function AttentionPanel() {
  const result = await loadPanel(async () => getAttentionTickets(await getAccessToken()));
  return (
    <Panel title={ATTENTION}>
      {!result.ok ? (
        <PanelError />
      ) : result.data.length === 0 ? (
        <PanelMessage>Nada pendente com você.</PanelMessage>
      ) : (
        <TicketList
          items={result.data.map((t) => ({ ...t, note: ACTION_NOTES[t.action] }))}
          show={{ chip: "status" }}
        />
      )}
    </Panel>
  );
}

function EmptyState() {
  return (
    <section className="flex flex-col items-start gap-4 rounded-panel bg-card p-6 text-card-foreground md:p-8">
      <h2 className="text-xl leading-none font-medium">Você ainda não abriu chamados.</h2>
      <p className="text-sm text-muted-foreground">
        Conte o que está acontecendo e nossa equipe vai ajudar.
      </p>
      {/* button-ink: o azul fica reservado ao CTA da sidebar e ao item ativo. */}
      <Link
        href="/chamados/novo"
        className="inline-flex min-h-11 items-center gap-2 rounded-md bg-foreground px-6 text-sm font-semibold tracking-[0.05em] text-background uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Plus aria-hidden className="size-4" />
        Abrir chamado
      </Link>
    </section>
  );
}

function ListsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <PanelSkeleton title={ATTENTION} />
      <PanelSkeleton title={RECENT} />
    </div>
  );
}
