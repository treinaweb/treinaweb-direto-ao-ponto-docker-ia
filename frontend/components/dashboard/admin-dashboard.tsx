import { Suspense } from "react";
import { getAccessToken } from "@/lib/auth/dal";
import {
  getAdminKpis,
  getCategorySummary,
  getPriorityCounts,
  getStatusCounts,
  getUserSummary,
} from "@/lib/dashboard/admin";
import { sum } from "@/lib/dashboard/chart-math";
import { loadPanel } from "@/lib/dashboard/load-panel";
import { formatNumber } from "@/lib/format";
import { PRIORITY_TONES, STATUS_TONES } from "@/lib/tickets/colors";
import { PRIORITY_LABELS, STATUS_LABELS_PLURAL } from "@/lib/tickets/labels";
import { BarChart, DonutChart } from "./charts";
import { KpiGrid, KpiGridError, KpiGridSkeleton } from "./kpi";
import { Panel, PanelMessage, PanelSkeleton } from "./panel";
import { PanelError } from "./panel-error";

const KPI_LABELS = {
  OPEN: "Sem atendente",
  IN_PROGRESS: "Em andamento",
  WAITING_CUSTOMER: "Aguardando cliente",
  RESOLVED: "Resolvidos",
};

const BY_STATUS = "Chamados por status";
const BY_PRIORITY = "Chamados por prioridade";
const CATEGORIES = "Categorias";
const USERS = "Usuários";

/** Painel do administrador: "como está a operação?". */
export function AdminDashboard() {
  return (
    <>
      <Suspense fallback={<KpiGridSkeleton />}>
        <Kpis />
      </Suspense>
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<PanelSkeleton title={BY_STATUS} />}>
          <StatusPanel />
        </Suspense>
        <Suspense fallback={<PanelSkeleton title={BY_PRIORITY} />}>
          <PriorityPanel />
        </Suspense>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<PanelSkeleton title={CATEGORIES} />}>
          <CategoriesPanel />
        </Suspense>
        <Suspense fallback={<PanelSkeleton title={USERS} />}>
          <UsersPanel />
        </Suspense>
      </div>
    </>
  );
}

async function Kpis() {
  const result = await loadPanel(async () => getAdminKpis(await getAccessToken()));
  return result.ok ? <KpiGrid counts={result.data} labels={KPI_LABELS} /> : <KpiGridError />;
}

async function StatusPanel() {
  const result = await loadPanel(async () => getStatusCounts(await getAccessToken()));
  return (
    <Panel title={BY_STATUS} className="@container">
      {!result.ok ? (
        <PanelError />
      ) : sum(result.data.map((c) => c.count)) === 0 ? (
        <PanelMessage>Nenhum chamado registrado.</PanelMessage>
      ) : (
        <DonutChart
          title={BY_STATUS}
          items={result.data.map((c) => ({
            label: STATUS_LABELS_PLURAL[c.status],
            value: c.count,
            color: STATUS_TONES[c.status].fill,
          }))}
        />
      )}
    </Panel>
  );
}

async function PriorityPanel() {
  const result = await loadPanel(async () => getPriorityCounts(await getAccessToken()));
  return (
    <Panel title={BY_PRIORITY}>
      {result.ok ? (
        <BarChart
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

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <p className="flex items-baseline gap-2">
      <span className="text-2xl leading-[1.17] font-medium tabular-nums">{formatNumber(value)}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </p>
  );
}

async function CategoriesPanel() {
  const result = await loadPanel(async () => getCategorySummary(await getAccessToken()));
  return (
    <Panel title={CATEGORIES} action={{ href: "/categorias", label: "Gerenciar categorias" }}>
      {result.ok ? (
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <Stat value={result.data.active} label={result.data.active === 1 ? "ativa" : "ativas"} />
          <Stat
            value={result.data.inactive}
            label={result.data.inactive === 1 ? "inativa" : "inativas"}
          />
        </div>
      ) : (
        <PanelError />
      )}
    </Panel>
  );
}

async function UsersPanel() {
  const result = await loadPanel(async () => getUserSummary(await getAccessToken()));
  return (
    <Panel title={USERS} action={{ href: "/usuarios", label: "Gerenciar usuários" }}>
      {result.ok ? (
        <Stat
          value={result.data.total}
          label={result.data.total === 1 ? "usuário cadastrado" : "usuários cadastrados"}
        />
      ) : (
        <PanelError />
      )}
    </Panel>
  );
}
