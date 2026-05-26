# Monorepo — Codex / Agent Instructions

## Structure

Four independent projects. Each has its own dependencies and project-level docs (`AGENTS.md`/`CLAUDE.md`) where applicable.

| Directory | Project | Stack |
|-----------|---------|-------|
| `relearn-chrome-extension/` | Chrome Extension | Vanilla JS, MV3 |
| `relearn-backend/` | API Server | Fastify 5, TypeScript, Prisma, PostgreSQL |
| `relearn-web/` | Web App | Next.js 14, TypeScript, Tailwind, React Flow |
| `relearn-mobile/` | Mobile App | Flutter, Dart, Riverpod, go_router |

## Working Across Projects

- Each project is self-contained. Read its own `AGENTS.md` first.
- Shared data contracts: `relearn-backend/prisma/schema.prisma`
- Web API contracts: `relearn-web/src/types/index.ts` and `relearn-web/src/hooks/useApi.ts`
- Extension backend client: `relearn-chrome-extension/src/services/api-service.js`
- Mobile backend client: `relearn-mobile/lib/core/network/api_client.dart` and `relearn-mobile/lib/core/config/api_endpoints.dart`

## No Build Step at Root

No root-level workspace build. Run commands from individual project directories.

## Services Required for Full Stack

```bash
cd relearn-backend/docker && docker-compose up -d
```

Starts PostgreSQL, Redis, Ollama, Adminer.

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

## Active API Routes (all require Bearer token except auth)

```
Auth:       POST /api/auth/register|login|logout|refresh   GET /api/auth/me
Pages:      CRUD /api/pages   POST /api/pages/bulk-delete
Summaries:  POST/GET /api/summaries   GET /api/summaries/:id|page/:pageId|job/:jobId
Flashcards: POST/GET/PATCH/DELETE /api/flashcards   POST /api/flashcards/generate
Quizzes:    POST/GET/DELETE /api/quizzes
Reviews:    POST /api/flashcard-reviews
Study:      GET /api/study/session   POST /api/study/session/:id/complete
Teachback:  POST/GET /api/pages/:pageId/teachback
Pretest:    POST /api/pretest/generate   POST /api/pretest/:id/submit
Analytics:  GET /api/analytics/weakspots   POST /api/analytics/remediation
Graph:      GET /api/graph   GET /api/graph/page/:pageId
```

## Background Workers

Workers initialize when `queue.ts` loads (server startup). All close gracefully via `closeQueues()`.

| Worker | Queue | Trigger |
|--------|-------|---------|
| summaryWorker | `summary-generation` | Explicit summary request |
| flashcardWorker | `flashcard-generation` | Explicit flashcard request |
| quizWorker | `quiz-generation` | Explicit quiz request |
| remediationWorker | `remediation` | `POST /api/analytics/remediation` |
| conceptWorker | `concepts` | Automatic on every `POST /api/pages` |

## Cross-Project Changes

When changing Prisma schema:
1. `npm run prisma:migrate` in `relearn-backend/`
2. Update `relearn-web/src/types/index.ts`
3. Update `relearn-web/src/hooks/useApi.ts` if endpoint/shape changed
4. Update `relearn-chrome-extension/src/services/api-service.js` if extension uses endpoint
5. Update `relearn-mobile/lib/core/config/api_endpoints.dart` and affected `lib/features/*/data` repositories

When changing backend routes:
1. Update web app clients if response shape changes
2. Update extension API service if extension uses that endpoint
3. Update mobile repositories/parsers if mobile uses that endpoint

## Known Latent Gaps (flag-gated off by default)

These web API clients target unimplemented backend routes:
- `StudyApi.recordEvent/getQueue/recomputeMemory` → `NEXT_PUBLIC_FEATURE_ADAPTIVE_MEMORY`
- `ConceptMapApi` (`/concept-map`) → `NEXT_PUBLIC_FEATURE_CONCEPT_MAP`
- `RoomsApi` (`/rooms`) → `NEXT_PUBLIC_FEATURE_STUDY_ROOMS`
- `VoiceApi` (`/voice/sessions`) → `NEXT_PUBLIC_FEATURE_VOICE_STUDY`

Implement backend routes before enabling these flags.

## Mobile Environment Notes

- Android emulator: `http://10.0.2.2:3001/api`
- iOS simulator/macOS: `http://localhost:3001/api`
