/** Rotas que exigem sessão (o prefixo e suas subrotas). */
export const PROTECTED_ROUTES = ["/dashboard", "/chamados", "/categorias", "/usuarios"] as const;

/** Rotas só para visitantes: quem tem sessão é levado ao dashboard. */
export const GUEST_ROUTES = ["/login", "/cadastro"] as const;

function matches(pathname: string, routes: readonly string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function isProtectedRoute(pathname: string) {
  return matches(pathname, PROTECTED_ROUTES);
}

export function isGuestRoute(pathname: string) {
  return matches(pathname, GUEST_ROUTES);
}
