import { Suspense } from "react";
import { getAccessToken } from "@/lib/auth/dal";
import { loadPanel } from "@/lib/dashboard/load-panel";
import { getQueueByPriority, getQueueTickets, getSupportKpis } from "@/lib/dashboard/support";
import { PRIORITY_TONES } from "@/lib/tickets/colors";
import { PRIORITY_LABELS } from "@/lib/tickets/labels";
import { Meter } from "./charts";
import { KpiGrid, KpiGridError, KpiGridSkeleton } from "./kpi";
import { Panel, PanelMessage, PanelSkeleton } from "./panel";
import { PanelError } from "./panel-error";
import { TicketList } from "./ticket-list";

const KPI_LABELS = {
  OPEN: "Na fila",
  IN_PROGRESS: "Em atendimento",
  WAITING_CUSTOMER: "Aguardando cliente",
  RESOLVED: "Resolvidos",
};

const QUEUE = "Próximos da fila";
const BY_PRIORITY = "Fila por prioridade";

/** Painel do atendente: "o que pego agora?". */
export function SupportDashboard() {
  return (
    <>
      <Suspense fallback={<KpiGridSkeleton />}>
        <Kpis />
      </Suspense>
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Suspense fallback={<PanelSkeleton title={QUEUE} />}>
          <QueuePanel />
        </Suspense>
        <Suspense fallback={<PanelSkeleton title={BY_PRIORITY} />}>
          <PriorityPanel />
        </Suspense>
      </div>
    </>
  );
}

async function Kpis() {
  const result = await loadPanel(async () => getSupportKpis(await getAccessToken()));
  return result.ok ? <KpiGrid counts={result.data} labels={KPI_LABELS} /> : <KpiGridError />;
}

async function QueuePanel() {
  const result = await loadPanel(async () => getQueueTickets(await getAccessToken()));
  return (
    <Panel title={QUEUE} action={{ href: "/chamados?status=OPEN", label: "Ver fila" }}>
      {!result.ok ? (
        <PanelError />
      ) : result.data.length === 0 ? (
        <PanelMessage>A fila está vazia.</PanelMessage>
      ) : (
        <TicketList items={result.data} show={{ chip: "priority", customer: true }} />
      )}
    </Panel>
  );
}

async function PriorityPanel() {
  const result = await loadPanel(async () => getQueueByPriority(await getAccessToken()));
  return (
    <Panel title={BY_PRIORITY}>
      {result.ok ? (
        <Meter
          title={BY_PRIORITY}
          items={result.data.map((c) => ({
            label: PRIORITY_LABELS[c.priority],
            value: c.count,
            color: PRIORITY_TONES[c.priority].fill,
          }))}
        />
      ) : (
        <PanelError />
      )}
    </Panel>
  );
}
