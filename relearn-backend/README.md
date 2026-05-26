# Relearn Backend

Fastify/TypeScript API server for the Relearn platform. Handles auth, webpage storage, and AI-powered generation of summaries, flashcards, quizzes, pre-read assessments, teach-back evaluation, error-pattern analysis, and concept knowledge graph via an async job queue backed by Ollama.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Fastify 5 + TypeScript 5 (strict) |
| Database | PostgreSQL 16 + Prisma ORM 6 |
| Cache / Queue | Redis 7 + BullMQ 5 |
| Auth | JWT (access: 15m, refresh: 7d) + bcrypt |
| AI Inference | Ollama (local LLM) + LangChain |
| Real-time | Socket.io 4 + Redis adapter |
| Logging | Winston |
| Validation | Zod 4 |
| Testing | Jest + ts-jest |

## Quick Start

```bash
npm install
cp .env.example .env
# Set JWT_SECRET and JWT_REFRESH_SECRET (openssl rand -base64 32)
cd docker && docker-compose up -d && cd ..
npm run prisma:migrate
docker exec -it docker-ollama-1 ollama pull llama3.2
npm run dev
# Server at http://localhost:3001
```

## API Reference

All routes except `/health` and `/api/auth/register|login|refresh` require `Authorization: Bearer <accessToken>`.

### Auth
```
POST /api/auth/register     { email, password, name }
POST /api/auth/login        { email, password }
POST /api/auth/logout
POST /api/auth/refresh      { refreshToken }
GET  /api/auth/me
PATCH /api/auth/me/settings { spacedRepetitionEnabled?, notificationsEnabled?, notificationTime?, name? }
```

### Pages
```
POST   /api/pages               { url, title, content, images?, metadata? }
GET    /api/pages               ?page=1&limit=20&search=term
GET    /api/pages/:id           → page + summaries + flashcards + quizzes
PATCH  /api/pages/:id
DELETE /api/pages/:id
POST   /api/pages/bulk-delete   { ids: string[] }
```

> Saving a page auto-enqueues concept extraction (fire-and-forget).

### Summaries
```
POST   /api/summaries           { pageId, type: 'default'|'brief'|'detailed' }  → { jobId }
GET    /api/summaries           paginated
GET    /api/summaries/:id
GET    /api/summaries/page/:pageId
GET    /api/summaries/job/:jobId
POST   /api/summaries/generate  { pageId, content }  (sync)
DELETE /api/summaries/:id
```

### Flashcards
```
POST   /api/flashcards/generate   { pageId, count: 1-50 }  → { jobId }
POST   /api/flashcards            { pageId, question, answer, difficulty? }
GET    /api/flashcards/page/:pageId
GET    /api/flashcards/:id
PATCH  /api/flashcards/:id
DELETE /api/flashcards/:id
POST   /api/flashcards/bulk-delete  { ids: string[] }
```

### Flashcard Reviews
```
POST /api/flashcard-reviews   { flashcardId, correct, timeTaken, confidence: 1-4 }
```

### Study Sessions
```
GET  /api/study/session                 ?cardCount=20&pageIds=id1,id2
     → { sessionId, cards[] }  (interleaved by page)
POST /api/study/session/:id/complete    { results: [{ flashcardId, correct, timeTaken, confidence }] }
     → { ok, reviewed }  (ownership verified; unowned IDs silently dropped)
```

### Quizzes
```
POST   /api/quizzes                   { summaryId, questions[] }
GET    /api/quizzes/summary/:summaryId
DELETE /api/quizzes/:id
```

### Teach-Back
```
POST /api/pages/:pageId/teachback   { attemptText }
     → { attemptId, score, feedback, gaps[], followUpQuestions[] }
GET  /api/pages/:pageId/teachback   → { attempts[] }
```

### Pre-Testing
```
POST /api/pretest/generate   { url, title, phase: 'before'|'after' }
     → { pretestId, questions: [{ question, options[] }] }  (correct answer stripped)
POST /api/pretest/:id/submit { answers: string[], phase }
     → { score, correct: boolean[] }
```

### Analytics
```
GET  /api/analytics/weakspots     → { weakspots: [{ tag, accuracy, reviewCount }], lastUpdated }
POST /api/analytics/remediation   { conceptTags: string[] }  → { jobId }  (202)
```

### Concept Graph
```
GET /api/graph                    → { nodes: [{ id, name, description }], edges: [{ id, sourceId, targetId, relationship, strength }] }
GET /api/graph/page/:pageId       → same shape, filtered to concepts for this page
```

### Health
```
GET /health   → { status: "ok", timestamp }
```

## Project Structure

```
relearn-backend/
├── docker/docker-compose.yml
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── server.ts                        # Fastify app, routes, graceful shutdown
│   ├── websocket.ts                     # Socket.io server
│   ├── api/routes/
│   │   ├── auth.routes.ts
│   │   ├── pages.routes.ts              # Enqueues concept extraction on save
│   │   ├── summary.routes.ts
│   │   ├── flashcard.routes.ts
│   │   ├── quiz.routes.ts
│   │   ├── flashcard-review.routes.ts
│   │   ├── study-session.routes.ts      # Interleaved sessions + ownership checks
│   │   ├── teachback.routes.ts
│   │   ├── pretest.routes.ts            # Strips correct answers from response
│   │   ├── analytics.routes.ts          # Weakspots aggregation + remediation queue
│   │   └── graph.routes.ts              # Full graph + page-scoped graph
│   ├── auth/
│   │   ├── middleware.ts
│   │   ├── password.ts
│   │   └── jwt.ts
│   ├── config/
│   │   ├── env.ts
│   │   ├── database.ts
│   │   └── redis.ts
│   ├── llm/
│   │   ├── ollama.ts                    # generateChat(), DEFAULT_MODEL
│   │   ├── langchain.ts                 # Prompt templates
│   │   ├── queue.ts                     # All queues + workers + closeQueues()
│   │   └── processors/
│   │       ├── summarizer.ts
│   │       ├── flashcard-generator.ts   # Adds conceptTags field
│   │       ├── quiz-generator.ts
│   │       ├── remediation-generator.ts # Drill cards for weak concepts
│   │       └── concept-extractor.ts     # Auto-extracts concepts on page save
│   ├── types/fastify.d.ts
│   └── utils/
│       ├── errors.ts
│       └── logger.ts
└── src/__tests__/                       # Jest route tests
    ├── flashcard-review.routes.test.ts
    ├── study-session.routes.test.ts
    ├── pretest.routes.test.ts
    ├── analytics.routes.test.ts
    └── graph.routes.test.ts
```

## Database Schema

```
User
 ├── Session (refresh tokens)
 ├── StudySession (interleaved card batches + results)
 └── Page (saved webpages)
      ├── Summary
      ├── Flashcard (+ conceptTags: string[])
      │    └── FlashcardReview (correct, timeTaken, confidence 1-4)
      ├── Quiz → QuizQuestion
      ├── TeachBackAttempt (score, gaps, feedback)
      ├── PretestAttempt (questions JSON, score, phase)
      └── PageConcept ──► Concept (userId+name unique)
                               └── ConceptRelation (sourceId, targetId, strength)
```

## Background Workers

| Worker | Queue | Concurrency | Trigger |
|--------|-------|-------------|---------|
| summaryWorker | `summary-generation` | 2 | POST /api/summaries |
| flashcardWorker | `flashcard-generation` | 2 | POST /api/flashcards/generate |
| quizWorker | `quiz-generation` | 2 | POST /api/quizzes/generate |
| remediationWorker | `remediation` | 2 | POST /api/analytics/remediation |
| conceptWorker | `concepts` | 2 | POST /api/pages (auto) |

All workers drain gracefully on SIGINT/SIGTERM.

## Environment Variables

```bash
NODE_ENV=development
PORT=3001
HOST=0.0.0.0
DATABASE_URL=postgresql://reader_user:reader_pass@localhost:5432/webpage_reader?schema=public
REDIS_URL=redis://localhost:6379
JWT_SECRET=<min 32 chars>
JWT_REFRESH_SECRET=<min 32 chars>
OLLAMA_BASE_URL=http://localhost:11434
FRONTEND_URL=http://localhost:3000
EXTENSION_ID=<chrome extension id>
LOG_LEVEL=debug
```

## Docker Services

| Service | Port | Credentials |
|---------|------|-------------|
| PostgreSQL 16 | 5432 | user: `reader_user` / pass: `reader_pass` / db: `webpage_reader` |
| Redis 7 | 6379 | none |
| Ollama | 11434 | none |
| Adminer | 8080 | host: `postgres`, above credentials |

## Available Scripts

```bash
npm run dev              # Hot-reload dev server
npm run build            # Compile to dist/
npm run start            # Production
npm run prisma:migrate   # Apply migrations
npm run prisma:studio    # Prisma Studio at http://localhost:5555
npm run lint             # ESLint
npm test                 # Jest
```

## Troubleshooting

**Ollama not responding:**
```bash
docker logs docker-ollama-1
docker exec -it docker-ollama-1 ollama pull llama3.2
```

**Concept extraction not running:** Check `conceptWorker` logs. Worker starts automatically when server starts — verify `queue.ts` imports `concept-extractor.ts`.

**BullMQ jobs stuck:** Verify Redis running. Inspect via `redis-cli KEYS 'bull:*'`.

**JWT errors:** Ensure `JWT_SECRET` in `.env` matches signing key. Regenerate with `openssl rand -base64 32`.
