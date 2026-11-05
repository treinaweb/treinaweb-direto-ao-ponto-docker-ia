<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Referências do projeto

- **API (TreinaDesk):** `docs/api-reference.md`. Rotas, papéis, transições de status, validações e erros. Fonte da verdade: Swagger em `http://localhost:3000/docs` (spec em `/docs-json`).
- **Design system:** `components/ui/references/design-system.md`.
- **Diretrizes do frontend:** `docs/frontend-guidelines.md`. Regras obrigatórias para toda spec/change: API de terceiros, BFF server-first, cookies httpOnly, zod em pt-BR, testes, responsividade e convenção de tasks.
