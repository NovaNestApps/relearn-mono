# Backend — Claude Instructions

## Stack

Fastify 5 + TypeScript (strict) + Prisma + PostgreSQL + Redis + BullMQ + Ollama + Socket.io. Dev server: `npm run dev` on port 3001. Requires Docker services running (see below).

## Before Starting

```bash
cd docker && docker-compose up -d && cd ..
```

## Key Files

| File | Purpose |
|------|---------|
| `src/server.ts` | Fastify app init, plugin registration, route mounting, graceful shutdown |
| `src/config/env.ts` | Zod-validated env schema — all config accessed via this module |
| `src/config/database.ts` | Prisma singleton — import `prisma` from here everywhere |
| `src/config/redis.ts` | ioredis clients — `redis` (BullMQ), `pubClient`/`subClient` (Socket.io) |
| `src/auth/middleware.ts` | `authMiddleware` hook — add as `preHandler` on protected routes |
| `src/llm/queue.ts` | BullMQ queue definitions + all 5 worker initializations + `closeQueues()` |
| `src/llm/ollama.ts` | `generateChat(messages, opts)` and `DEFAULT_MODEL` — use these, not `ollamaClient` |
| `src/utils/errors.ts` | Custom error classes + global Fastify error handler |
| `prisma/schema.prisma` | Single source of truth for DB schema |

## Route Files

| File | Prefix |
|------|--------|
| `src/api/routes/auth.routes.ts` | `/api/auth` |
| `src/api/routes/pages.routes.ts` | `/api/pages` |
| `src/api/routes/summary.routes.ts` | `/api/summaries` |
| `src/api/routes/flashcard.routes.ts` | `/api/flashcards` |
| `src/api/routes/quiz.routes.ts` | `/api/quizzes` |
| `src/api/routes/flashcard-review.routes.ts` | `/api/flashcard-reviews` |
| `src/api/routes/study-session.routes.ts` | `/api/study` |
| `src/api/routes/teachback.routes.ts` | `/api/pages` (`:pageId/teachback`) |
| `src/api/routes/pretest.routes.ts` | `/api/pretest` |
| `src/api/routes/analytics.routes.ts` | `/api/analytics` |
| `src/api/routes/graph.routes.ts` | `/api/graph` |

## Worker Processors

| File | Queue | Notes |
|------|-------|-------|
| `src/llm/processors/summarizer.ts` | `summary-generation` | |
| `src/llm/processors/flashcard-generator.ts` | `flashcard-generation` | Adds `conceptTags` to cards |
| `src/llm/processors/quiz-generator.ts` | `quiz-generation` | |
| `src/llm/processors/remediation-generator.ts` | `remediation` | Drill cards for weak concepts |
| `src/llm/processors/concept-extractor.ts` | `concepts` | Auto-fires on page save |

All processors import `generateChat` and `DEFAULT_MODEL` from `../ollama`. Do NOT use `ollamaClient` — it is not exported.

Workers are imported into `queue.ts` and closed in `closeQueues()`. Do NOT add separate side-effect imports in `server.ts`.

## Auth Pattern

```typescript
// All protected routes use authMiddleware as preHandler hook:
app.addHook('preHandler', authMiddleware);
const userId = request.user.userId; // typed via src/types/fastify.d.ts
```

## Adding a New Route

1. Create `src/api/routes/my-feature.routes.ts`
2. Export default Fastify plugin function
3. Register in `src/server.ts` under `/api/my-feature`
4. Validate all input with Zod at route level

## Adding a New Background Worker

1. Create `src/llm/processors/my-processor.ts`
2. Use `generateChat(messages, { model: DEFAULT_MODEL })` for LLM calls
3. Use `redis` from `../../config/redis` for worker connection
4. Export worker as named export (e.g. `export const myWorker`)
5. Add queue in `queue.ts`; import worker in `queue.ts`; add `myWorker.close()` to `closeQueues()`

## Database Changes

```bash
# Edit prisma/schema.prisma, then:
npm run prisma:migrate   # creates and applies migration
```

Always cascade deletes on child relations. Every model needs `userId` and a `User` relation.

## Testing Patterns

- Test file: `src/__tests__/*.routes.test.ts`
- Mock: `jest.mock('../config/database')` uses `src/__mocks__/database.ts`
- Always mock `authMiddleware`: `jest.mock('../auth/middleware', () => ({ authMiddleware: jest.fn(async () => {}) }))`
- Inject user: `app.addHook('preHandler', async (req) => { (req as any).user = { userId: 'u1' } })`
- Register error handler: `app.setErrorHandler(errorHandler)` — required for 4xx/5xx to return correct codes
- POST requests need `headers: { 'content-type': 'application/json' }`
- Zod v4: use `error.issues[0]` not `error.errors[0]`

## Error Handling

```typescript
throw new NotFoundError('Page not found');      // 404
throw new UnauthorizedError('Invalid token');   // 401
throw new ValidationError('Bad input');         // 400
throw new ForbiddenError('Not your resource');  // 403
```

## Logging

`logger.info('msg', { userId, pageId })` — never `console.log`.

## TypeScript

Strict mode. No `any` — use `unknown` and narrow. All Prisma types from `@prisma/client`.

## BullMQ Workers

- 2 concurrent jobs per queue
- Truncate content to 4,000–10,000 chars before LLM calls
- Graceful shutdown: `closeQueues()` closes all queues + all 5 workers

## Socket.io

User rooms by `userId`. `io.to(userId).emit(event, data)`. WebSocket auth: JWT in `socket.handshake.auth.token`.

## Available Scripts

```bash
npm run dev              # Hot-reload dev server
npm run build            # Compile to dist/
npm run start            # Production
npm run prisma:migrate   # Apply migrations
npm run prisma:studio    # DB GUI at localhost:5555
npm run lint             # ESLint
npm test                 # Jest (requires jest/ts-jest in devDependencies)
```
