import type { Role } from "@/lib/api/types";

/**
 * Fonte única de "o que cada papel vê" e "quem acessa cada rota" na área
 * autenticada. Módulo puro (sem React nem `server-only`): usado pelo layout
 * (servidor), pela navegação (cliente) e pelos testes.
 */

/** Ícones viajam como chave: Server Components não passam funções ao cliente. */
export type IconKey = "dashboard" | "tickets" | "categories" | "users" | "new-ticket";

export type NavLink = { href: string; label: string; icon: IconKey };
export type NavGroup = { label: string | null; items: NavLink[] };
export type Navigation = { groups: NavGroup[]; primaryAction: NavLink | null };
export type Crumb = { label: string; href?: string };

const ALL_ROLES: Role[] = ["CUSTOMER", "SUPPORT", "ADMIN"];

type NavItemConfig = NavLink & {
  roles: Role[];
  /** Rótulo diferente por papel (ex.: "Meus chamados" para o cliente). */
  labelByRole?: Partial<Record<Role, string>>;
};

export const DASHBOARD_HREF = "/dashboard";
export const DASHBOARD_LABEL = "Painel";

export const NAV_GROUPS: Array<{ label: string | null; items: NavItemConfig[] }> = [
  {
    label: null,
    items: [
      { href: DASHBOARD_HREF, label: DASHBOARD_LABEL, icon: "dashboard", roles: ALL_ROLES },
      {
        href: "/chamados",
        label: "Chamados",
        labelByRole: { CUSTOMER: "Meus chamados" },
        icon: "tickets",
        roles: ALL_ROLES,
      },
    ],
  },
  {
    label: "Administração",
    items: [
      { href: "/categorias", label: "Categorias", icon: "categories", roles: ["ADMIN"] },
      { href: "/usuarios", label: "Usuários", icon: "users", roles: ["ADMIN"] },
    ],
  },
];

export const PRIMARY_ACTION: NavItemConfig = {
  href: "/chamados/novo",
  label: "Abrir chamado",
  icon: "new-ticket",
  roles: ["CUSTOMER"],
};

/** Rotas restritas a alguns papéis. As demais rotas autenticadas valem para todos. */
export const ROUTE_ACCESS: Record<string, Role[]> = {
  "/chamados/novo": ["CUSTOMER"],
  "/categorias": ["ADMIN"],
  "/usuarios": ["ADMIN"],
};

/**
 * Subpáginas com breadcrumb de três níveis ("Painel / {pai} / {subpágina}").
 * O rótulo do pai vem do item de navegação. As demais subrotas (ex.:
 * `/chamados/novo`, `/chamados/{id}`) continuam com dois níveis.
 */
export const SUBPAGES: Record<string, { parent: string; label: string }> = {
  "/usuarios/novo": { parent: "/usuarios", label: "Novo usuário" },
};

function subpageFor(path: string) {
  return Object.hasOwn(SUBPAGES, path) ? SUBPAGES[path] : null;
}

function resolve(item: NavItemConfig, role: Role): NavLink {
  return { href: item.href, label: item.labelByRole?.[role] ?? item.label, icon: item.icon };
}

/** Navegação visível para o papel: grupos sem itens somem. */
export function getNavigation(role: Role): Navigation {
  const groups = NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => item.roles.includes(role)).map((i) => resolve(i, role)),
  })).filter((group) => group.items.length > 0);

  const primaryAction = PRIMARY_ACTION.roles.includes(role) ? resolve(PRIMARY_ACTION, role) : null;
  return { groups, primaryAction };
}

function stripQuery(pathname: string) {
  return pathname.split(/[?#]/, 1)[0] || "/";
}

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** O papel pode abrir a rota? O prefixo mais específico de `ROUTE_ACCESS` vence. */
export function canAccess(role: Role, pathname: string): boolean {
  const path = stripQuery(pathname);
  const rule = Object.keys(ROUTE_ACCESS)
    .filter((prefix) => matchesPrefix(path, prefix))
    .sort((a, b) => b.length - a.length)[0];
  return rule ? ROUTE_ACCESS[rule].includes(role) : true;
}

/** O item `href` corresponde à página atual (subrotas ativam o item pai)? */
export function isActive(pathname: string, href: string): boolean {
  return matchesPrefix(stripQuery(pathname), href);
}

/** Título da página autenticada conforme o papel (`null` se desconhecida). */
export function pageTitleFor(role: Role, pathname: string): string | null {
  const path = stripQuery(pathname);
  if (path === DASHBOARD_HREF) return DASHBOARD_LABEL;
  if (path === PRIMARY_ACTION.href) return PRIMARY_ACTION.label;
  const subpage = subpageFor(path);
  if (subpage) return subpage.label;
  if (path.startsWith("/chamados/")) return "Chamado";

  const item = NAV_GROUPS.flatMap((g) => g.items).find((i) => matchesPrefix(path, i.href));
  return item ? resolve(item, role).label : null;
}

export const NOT_FOUND_LABEL = "Página não encontrada";

/**
 * "Painel" na raiz; "Painel / {página}" nas demais páginas autenticadas e
 * "Painel / {pai} / {subpágina}" nas `SUBPAGES`. Rota vetada ao papel não
 * revela o nome da página.
 */
export function breadcrumbFor(role: Role, pathname: string): Crumb[] {
  if (!canAccess(role, pathname)) {
    return [{ label: DASHBOARD_LABEL, href: DASHBOARD_HREF }, { label: NOT_FOUND_LABEL }];
  }
  const subpage = subpageFor(stripQuery(pathname));
  if (subpage) {
    return [
      { label: DASHBOARD_LABEL, href: DASHBOARD_HREF },
      { label: pageTitleFor(role, subpage.parent) ?? subpage.parent, href: subpage.parent },
      { label: subpage.label },
    ];
  }
  const title = pageTitleFor(role, pathname);
  if (!title || title === DASHBOARD_LABEL) return [{ label: DASHBOARD_LABEL }];
  return [{ label: DASHBOARD_LABEL, href: DASHBOARD_HREF }, { label: title }];
}
