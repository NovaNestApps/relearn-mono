# Monorepo — Codex Instructions

## Structure

Four independent projects. Each has its own dependencies and project-level docs (`AGENTS.md`/`CLAUDE.md`) where applicable.

| Directory | Project | Stack |
|-----------|---------|-------|
| `relearn-chrome-extension/` | Chrome Extension | Vanilla JS, MV3 |
| `relearn-backend/` | API Server | Fastify, TypeScript, Prisma, PostgreSQL |
| `relearn-web/` | Web App | Next.js 14, TypeScript, Tailwind |
| `relearn-mobile/` | Mobile App | Flutter, Dart, Riverpod, go_router |

## Working Across Projects

- Each project is self-contained. When working in a specific project, read its own `AGENTS.md` first.
- Shared data contracts live in backend Prisma schema: `relearn-backend/prisma/schema.prisma`.
- API contracts used by web app are in:
  - `relearn-web/src/types/index.ts`
  - `relearn-web/src/hooks/useApi.ts`
- Extension backend client is:
  - `relearn-chrome-extension/src/services/api-service.js`
- Mobile backend client is:
  - `relearn-mobile/lib/core/network/api_client.dart`
  - `relearn-mobile/lib/core/config/api_endpoints.dart`

## No Build Step at Root

There is no root-level workspace build. Run commands from individual project directories.

## Services Required for Full Stack

Before running web, extension, or mobile with backend features:

```bash
cd relearn-backend/docker && docker-compose up -d
```

This starts PostgreSQL, Redis, Ollama, and Adminer.

## Port Map

| Port | Service |
|------|---------|
| 3000 | relearn-web (Next.js) |
| 3001 | relearn-backend (Fastify) |
| 5432 | PostgreSQL |
| 6379 | Redis |
| 11434 | Ollama |
| 8080 | Adminer |
| 5555 | Prisma Studio |

## Cross-Project Changes

When changing Prisma schema:
1. Run `npm run prisma:migrate` in `relearn-backend/`
2. Update corresponding TypeScript types in `relearn-web/src/types/index.ts` if needed
3. Update `relearn-web/src/hooks/useApi.ts` if endpoint/shape changed
4. Update `relearn-chrome-extension/src/services/api-service.js` if extension uses affected endpoints
5. Update mobile DTO/client parsing in `relearn-mobile/lib/models` and `relearn-mobile/lib/features/*/data` if needed

When changing backend routes:
1. Update web app clients if response shape changes
2. Update extension API service if extension uses that endpoint
3. Update mobile repositories/parsers if mobile uses that endpoint

## Mobile Environment Notes

- Android emulator should use `http://10.0.2.2:3001/api` for backend base URL.
- iOS simulator/macOS can use `http://localhost:3001/api`.
