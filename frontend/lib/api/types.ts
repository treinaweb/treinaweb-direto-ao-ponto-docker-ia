// Modelos da API TreinaDesk usados pelo frontend (ver docs/api-reference.md).

export type Role = "CUSTOMER" | "SUPPORT" | "ADMIN";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
}

/** `POST /users/staff` (só ADMIN): cadastro de atendente ou administrador. */
export interface CreateStaffDto extends CreateUserDto {
  role: "SUPPORT" | "ADMIN";
}

/** `PATCH /users/{id}/role` (só ADMIN). */
export interface ChangeRoleDto {
  role: Role;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_CUSTOMER" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export interface UserSummary {
  id: string;
  name: string;
  role: Role;
}

export interface CategorySummary {
  id: string;
  name: string;
}

/** `active` só vem para o ADMIN; para os demais papéis a lista já é só de ativas. */
export interface Category {
  id: string;
  name: string;
  active?: boolean;
}

/** `POST /categories` (só ADMIN). */
export interface CreateCategoryDto {
  name: string;
}

/** `PATCH /categories/{id}` (só ADMIN): `name` e/ou `active`, pelo menos um. */
export interface UpdateCategoryDto {
  name?: string;
  active?: boolean;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: CategorySummary;
  customer: UserSummary;
  assignee: UserSummary | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface CreateTicketDto {
  title: string;
  description: string;
  priority: TicketPriority;
  categoryId: string;
}

/** ADMIN: obrigatório (usuário SUPPORT). SUPPORT: proibido (assume para si). */
export interface AssignTicketDto {
  assigneeId?: string;
}

export interface UpdateStatusDto {
  status: TicketStatus;
}

/** `CommentResponse`: notas internas nunca vêm para o CUSTOMER. */
export interface Comment {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author: UserSummary;
}

/** `isInternal` só para SUPPORT e ADMIN (CUSTOMER com `true` recebe 403). */
export interface CreateCommentDto {
  body: string;
  isInternal?: boolean;
}
