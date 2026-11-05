import type { Role } from "@/lib/api/types";
import { ROLE_ORDER } from "@/lib/validation/users";

/** Os dois papéis diferentes do atual, na ordem Cliente → Atendente → Administrador. */
export function rolesOfferedFor(current: Role): Role[] {
  return ROLE_ORDER.filter((role) => role !== current);
}

/** Rebaixamento de atendente ou administrador para cliente (mostra o aviso de chamados atribuídos). */
export function isDemotionToCustomer(current: Role, next: Role | "" | null | undefined): boolean {
  return current !== "CUSTOMER" && next === "CUSTOMER";
}
