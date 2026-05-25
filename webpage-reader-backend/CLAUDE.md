# Backend — Claude Instructions

## Stack

Fastify 5 + TypeScript (strict) + Prisma + PostgreSQL + Redis + BullMQ + Ollama + Socket.io. Dev server: `npm run dev` on port 3001. Requires Docker services running (see below).

## Before Starting

Docker services must be running:
```bash
cd docker && docker-compose up -d && cd ..
```

## Key Files

| File | Purpose |
|------|---------|
| `src/server.ts` | Fastify app init, plugin registration (CORS, JWT, cookies), route mounting |
| `src/config/env.ts` | Zod-validated env schema — all config accessed via this module |
| `src/config/database.ts` | Prisma singleton — import `prisma` from here everywhere |
| `src/config/redis.ts` | ioredis clients — `redis` (BullMQ), `pubClient`/`subClient` (Socket.io) |
| `src/auth/middleware.ts` | `authenticate` hook — add as `preHandler` on protected routes |
| `src/llm/queue.ts` | BullMQ queue definitions + worker setup |
| `src/llm/langchain.ts` | LangChain prompt chains — add new generation templates here |
| `src/utils/errors.ts` | Custom error classes + global Fastify error handler |
| `prisma/schema.prisma` | Single source of truth for DB schema |

## Auth Pattern

Protected routes use the `authenticate` preHandler:

```typescript
fastify.get('/protected', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  const userId = request.user.userId; // injected by middleware
});
```

`request.user` is typed via `src/types/fastify.d.ts`.

## Adding a New Route

1. Create `src/api/routes/my-feature.routes.ts`
2. Export a Fastify plugin function
3. Register in `src/server.ts` under `/api/my-feature`
4. Validate input with Zod at the top of the route handler

## Adding a New Background Job

1. Create `src/llm/processors/my-processor.ts` — export async worker function
2. Add queue definition in `src/llm/queue.ts`
3. Add worker registration in `src/llm/queue.ts`
4. Route enqueues job via `queue.add(jobName, data)` and returns `{ jobId }`
5. Client polls status via `GET /api/.../job/:jobId`

## Database Changes

```bash
# Edit prisma/schema.prisma, then:
npm run prisma:migrate   # creates and applies migration
# Prisma client auto-regenerates
```

Always cascade deletes on child relations. User owns all data — every model has `userId` and a relation to `User`.

## Error Handling

Throw custom errors from `src/utils/errors.ts`:

```typescript
throw new NotFoundError('Page not found');      // 404
throw new UnauthorizedError('Invalid token');   // 401
throw new ValidationError('Bad input');         // 400
throw new ForbiddenError('Not your resource');  // 403
```

The global error handler in `errors.ts` catches Zod, JWT, and Prisma errors automatically and returns appropriate HTTP codes.

## Validation

All user input validated with Zod at route level. Never trust request body without schema validation. Env vars validated in `src/config/env.ts` at startup — add new vars there with defaults.

## Logging

Use Winston logger from `src/utils/logger.ts`. Never use `console.log` — use `logger.info`, `logger.error`, `logger.debug`. Log objects as second arg: `logger.info('msg', { userId, pageId })`.

## TypeScript Conventions

- Strict mode enabled
- No `any` types — use `unknown` and narrow
- Module augmentation for Fastify in `src/types/fastify.d.ts`
- All Prisma types come from `@prisma/client` auto-generated types

## Environment Variables

Access only via the validated config object from `src/config/env.ts`. Never read `process.env` directly in business logic. Add new vars to the Zod schema in `env.ts` with defaults where appropriate.

## BullMQ Workers

- Max 2 concurrent jobs per queue (configured in `src/llm/queue.ts`)
- Workers truncate content to 10,000 chars before LLM calls
- Jobs update DB on completion/failure
- On graceful shutdown, workers drain before closing

## Socket.io

User-specific rooms named by `userId`. Emit events via `io.to(userId).emit(eventName, data)` after DB mutations. WebSocket auth requires JWT token in `socket.handshake.auth.token`.

## Available Scripts

```bash
npm run dev              # Hot-reload dev server
npm run build            # Compile to dist/
npm run start            # Production
npm run prisma:migrate   # Apply migrations
npm run prisma:studio    # DB GUI at localhost:5555
npm run lint             # ESLint
```
