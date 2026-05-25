# Monorepo — Codex Instructions

## Structure

Three independent projects. Each has its own `package.json`, dependencies, and AGENTS.md with project-specific instructions.

| Directory | Project | Stack |
|-----------|---------|-------|
| `ai-webpage-reader/` | Chrome Extension | Vanilla JS, MV3 |
| `webpage-reader-backend/` | API Server | Fastify, TypeScript, Prisma, PostgreSQL |
| `webpage-reader-web/` | Web App | Next.js 14, TypeScript, Tailwind |

## Working Across Projects

- Each project is self-contained. When working in a specific project, read its own AGENTS.md for detailed instructions.
- Shared data contracts live in the backend Prisma schema (`webpage-reader-backend/prisma/schema.prisma`). Changes there affect all consumers.
- API contracts between backend and web are defined in `webpage-reader-web/src/types/index.ts` and `webpage-reader-web/src/hooks/useApi.ts`.
- The extension communicates with backend via `ai-webpage-reader/src/services/api-service.js`.

## No Build Step at Root

There is no root-level `package.json`, workspace config, or shared build. Run all commands from within individual project directories.

## Services Required for Full Stack

Before running web or extension: start Docker services from `webpage-reader-backend/docker/`:
```bash
cd webpage-reader-backend/docker && docker-compose up -d
```

This starts PostgreSQL, Redis, Ollama, and Adminer.

## Port Map

| Port | Service |
|------|---------|
| 3000 | webpage-reader-web (Next.js) |
| 3001 | webpage-reader-backend (Fastify) |
| 5432 | PostgreSQL |
| 6379 | Redis |
| 11434 | Ollama |
| 8080 | Adminer |
| 5555 | Prisma Studio |

## Cross-Project Changes

When changing the Prisma schema:
1. Run `npm run prisma:migrate` in `webpage-reader-backend/`
2. Update corresponding TypeScript types in `webpage-reader-web/src/types/index.ts`
3. Update API client methods in `webpage-reader-web/src/hooks/useApi.ts` if endpoints change
4. Update extension API client at `ai-webpage-reader/src/services/api-service.js` if needed

When changing API routes in backend:
1. Update types in web app if response shape changes
2. Update `api-service.js` in extension if extension uses that endpoint
