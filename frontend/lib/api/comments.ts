import "server-only";

import { cache } from "react";
import { apiFetch } from "./client";
import type { Comment, CreateCommentDto, Paginated } from "./types";

const ticketPath = (ticketId: string) => `/tickets/${encodeURIComponent(ticketId)}/comments`;

/**
 * `GET /tickets/{id}/comments` → 200 página de comentários, do mais antigo para
 * o mais recente (`limit` máx. 100; sem notas internas para o CUSTOMER) |
 * 400 | 401 | 404.
 */
export function listComments(
  accessToken: string,
  ticketId: string,
  { page = 1, limit = 20 }: { page?: number; limit?: number } = {},
): Promise<Paginated<Comment>> {
  return apiFetch<Paginated<Comment>>(`${ticketPath(ticketId)}?page=${page}&limit=${limit}`, {
    accessToken,
  });
}

/**
 * `POST /tickets/{id}/comments` → 201 comentário | 400 | 401 | 403 nota interna
 * de CUSTOMER | 404 | 409 concorrência na retomada automática | 422 chamado
 * fechado ou SUPPORT não atribuído. `isInternal` só vai no corpo quando `true`.
 */
export function createComment(
  accessToken: string,
  ticketId: string,
  { body, isInternal }: { body: string; isInternal?: boolean },
): Promise<Comment> {
  const dto: CreateCommentDto = isInternal ? { body, isInternal: true } : { body };
  return apiFetch<Comment>(ticketPath(ticketId), { method: "POST", body: dto, accessToken });
}

/** Itens por página na leitura da conversa (máximo da API). */
export const COMMENTS_PAGE_SIZE = 100;
/** Teto de páginas da conversa (100 por página → até 2.000 comentários). */
export const COMMENTS_MAX_PAGES = 20;
export const COMMENTS_MAX = COMMENTS_PAGE_SIZE * COMMENTS_MAX_PAGES;

/** DTO enxuto de um comentário da conversa (sem ids de usuário). */
export type ThreadComment = {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  authorName: string;
  /** `SUPPORT` ou `ADMIN` → selo "Equipe". */
  authorIsStaff: boolean;
};

export type CommentThreadData = {
  comments: ThreadComment[];
  /** Total informado pela API (para o CUSTOMER, sem notas internas). */
  total: number;
  /** `true` quando a conversa passou do teto e só os mais recentes vieram. */
  truncated: boolean;
};

function toThreadComment(comment: Comment): ThreadComment {
  return {
    id: comment.id,
    body: comment.body,
    isInternal: comment.isInternal,
    createdAt: comment.createdAt,
    authorName: comment.author.name,
    authorIsStaff: comment.author.role !== "CUSTOMER",
  };
}

/**
 * Conversa inteira de um chamado, do mais antigo para o mais recente. Lê as
 * páginas em sequência (100 por vez) até cobrir o `total`; acima do teto, lê
 * só as páginas finais e devolve os 2.000 mais recentes (`truncated`). Para
 * cedo numa página vazia e remove ids repetidos (um comentário novo entre as
 * leituras desloca as páginas). Memorizado por renderização.
 */
export const listTicketComments = cache(
  async (accessToken: string, ticketId: string): Promise<CommentThreadData> => {
    const limit = COMMENTS_PAGE_SIZE;
    const first = await listComments(accessToken, ticketId, { page: 1, limit });
    const total = first.total;
    const totalPages = Math.ceil(total / limit);
    const truncated = totalPages > COMMENTS_MAX_PAGES;
    const firstPage = truncated ? Math.floor((total - COMMENTS_MAX) / limit) + 1 : 1;

    const collected: Comment[] = [];
    const seen = new Set<string>();
    const add = (items: Comment[]) => {
      for (const item of items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        collected.push(item);
      }
    };

    if (firstPage === 1) add(first.data);
    const startPage = firstPage === 1 ? 2 : firstPage;
    if (first.data.length > 0) {
      for (let page = startPage; page <= totalPages; page += 1) {
        const result = await listComments(accessToken, ticketId, { page, limit });
        if (result.data.length === 0) break;
        add(result.data);
      }
    }

    const kept = truncated ? collected.slice(-COMMENTS_MAX) : collected;
    return { comments: kept.map(toThreadComment), total, truncated };
  },
);
