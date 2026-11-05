import type { TicketPriority, TicketStatus } from "@/lib/api/types";

/**
 * Cores de status e prioridade (design system: `chip-status`, `chip-priority`
 * e paleta de gráficos). Os chips usam fundos sólidos e iguais nos dois temas,
 * com texto escuro (contraste AA ≥ 4.5 conferido para 14px bold).
 */
type Tone = { chip: string; dot: string; fill: string };

export const STATUS_TONES: Record<TicketStatus, Tone> = {
  OPEN: { chip: "bg-primary-soft text-primary-deep", dot: "bg-primary-deep", fill: "var(--ds-primary-bright)" },
  IN_PROGRESS: { chip: "bg-storm-mist text-ink", dot: "bg-storm-deep", fill: "var(--ds-storm-deep)" },
  WAITING_CUSTOMER: { chip: "bg-chart-violet text-ink", dot: "bg-ink", fill: "var(--ds-chart-violet)" },
  RESOLVED: { chip: "bg-chart-green text-ink", dot: "bg-ink", fill: "var(--ds-chart-green)" },
  CLOSED: { chip: "bg-fog text-graphite", dot: "bg-graphite", fill: "var(--muted-foreground)" },
};

export const PRIORITY_TONES: Record<TicketPriority, Tone> = {
  // O design pede texto branco no coral, mas 3.2:1 não passa no AA; texto ink dá 5.4:1.
  URGENT: { chip: "bg-bloom-coral text-ink", dot: "bg-ink", fill: "var(--ds-bloom-coral)" },
  HIGH: { chip: "bg-bloom-rose text-bloom-deep", dot: "bg-bloom-deep", fill: "var(--ds-chart-violet)" },
  MEDIUM: { chip: "bg-primary-soft text-primary-deep", dot: "bg-primary-deep", fill: "var(--ds-chart-blue)" },
  LOW: { chip: "bg-cloud text-graphite", dot: "bg-graphite", fill: "var(--ds-chart-mint)" },
};
