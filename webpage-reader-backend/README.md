# Webpage Reader Backend

Fastify/TypeScript API server for the Relearn platform. Handles authentication, webpage storage, and AI-powered generation of summaries, flashcards, and quizzes via a background job queue backed by Ollama.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Fastify 5 + TypeScript 5 |
| Database | PostgreSQL 16 + Prisma ORM 6 |
| Cache / Queue | Redis 7 + BullMQ 5 |
| Auth | JWT (access: 15m, refresh: 7d) + bcrypt |
| AI Inference | Ollama (local LLM) + LangChain |
| Real-time | Socket.io 4 + Redis adapter |
| Logging | Winston |
| Validation | Zod 4 |

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- 8GB+ RAM (for Ollama LLM models)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` — at minimum set the JWT secrets:

```bash
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
```

### 3. Start Docker services

```bash
cd docker && docker-compose up -d && cd ..
```

This starts: PostgreSQL (5432), Redis (6379), Ollama (11434), Adminer (8080).

### 4. Run database migrations

```bash
npm run prisma:migrate
```

### 5. Pull Ollama model

```bash
docker exec -it docker-ollama-1 ollama pull llama3.2
```

### 6. Start dev server

```bash
npm run dev
# Server at http://localhost:3001
```

## API Reference

### Auth

```
POST /api/auth/register     { email, password, name } → { user, accessToken, refreshToken }
POST /api/auth/login        { email, password }        → { user, accessToken, refreshToken }
POST /api/auth/logout       (authenticated)            → { message }
POST /api/auth/refresh      { refreshToken }           → { accessToken, refreshToken }
GET  /api/auth/me           (authenticated)            → { user }
```

### Pages

```
POST   /api/pages               { url, title, content, images?, metadata? }
GET    /api/pages               ?page=1&limit=20&search=term
GET    /api/pages/:id           returns page + summaries + flashcards + quizzes
PATCH  /api/pages/:id           { title?, content?, images?, metadata? }
DELETE /api/pages/:id
POST   /api/pages/bulk-delete   { ids: string[] }
```

### Summaries

```
POST /api/summaries             { pageId, type: 'default'|'brief'|'detailed' } → queued job
GET  /api/summaries             paginated list
GET  /api/summaries/:id
GET  /api/summaries/page/:pageId
GET  /api/summaries/job/:jobId  job status + progress
POST /api/summaries/generate    { pageId, content } → save directly (sync)
DELETE /api/summaries/:id
```

### Flashcards

```
POST   /api/flashcards/generate     { pageId, count: 1-50 } → queued job
POST   /api/flashcards              { pageId, question, answer, difficulty? }
GET    /api/flashcards/page/:pageId
GET    /api/flashcards/:id
PATCH  /api/flashcards/:id          { question?, answer?, difficulty? }
DELETE /api/flashcards/:id
POST   /api/flashcards/bulk-delete  { ids: string[] }
```

### Quizzes

```
POST /api/quizzes               { summaryId, questions: [{ question, options[], correctAnswer, explanation }] }
GET  /api/quizzes/summary/:summaryId
DELETE /api/quizzes/:id
```

### Health

```
GET /health   → { status: "ok", timestamp }
```

All routes except `/health` and `/api/auth/register|login|refresh` require `Authorization: Bearer <accessToken>` header.

## Project Structure

```
webpage-reader-backend/
├── docker/
│   └── docker-compose.yml          # PostgreSQL, Redis, Ollama, Adminer
├── nginx/
│   └── nginx.conf                  # Reverse proxy config (production)
├── prisma/
│   ├── schema.prisma               # Data model
│   └── migrations/                 # Migration files
├── scripts/                        # Utility scripts
├── src/
│   ├── server.ts                   # Fastify app, plugin registration, graceful shutdown
│   ├── websocket.ts                # Socket.io server with Redis adapter
│   ├── api/routes/
│   │   ├── auth.routes.ts          # /api/auth/*
│   │   ├── pages.routes.ts         # /api/pages/*
│   │   ├── summary.routes.ts       # /api/summaries/*
│   │   ├── flashcard.routes.ts     # /api/flashcards/*
│   │   ├── quiz.routes.ts          # /api/quizzes/*
│   │   └── sync.routes.ts          # /api/sync/* (placeholder)
│   ├── auth/
│   │   ├── middleware.ts           # JWT verification pre-handler
│   │   ├── password.ts             # bcrypt hash/verify
│   │   └── jwt.ts                  # Token generation/verification
│   ├── config/
│   │   ├── env.ts                  # Zod-validated env schema
│   │   ├── database.ts             # Prisma singleton
│   │   └── redis.ts                # ioredis clients (main + pub/sub)
│   ├── llm/
│   │   ├── ollama.ts               # Ollama client, model management
│   │   ├── langchain.ts            # Prompt templates, JSON extraction chains
│   │   ├── queue.ts                # BullMQ queue + worker setup
│   │   └── processors/
│   │       ├── summarizer.ts       # Summary generation worker
│   │       ├── flashcard-generator.ts
│   │       └── quiz-generator.ts
│   ├── types/
│   │   └── fastify.d.ts            # Module augmentation (prisma, authenticate decorators)
│   └── utils/
│       ├── errors.ts               # Custom error classes + global handler
│       └── logger.ts               # Winston logger
├── tests/                          # Integration tests
├── .env.example                    # Environment variable template
├── package.json
├── tsconfig.json
└── nodemon.json
```

## Database Schema

```
User
  ├── Session (refresh token sessions)
  ├── Page (saved webpages)
  │    ├── Summary (AI-generated summaries)
  │    ├── Flashcard (Q&A cards)
  │    └── Quiz → QuizQuestion
```

All child entities cascade-delete when parent is removed.

## Background Jobs

AI generation is async. Routes enqueue jobs and return `jobId`. Clients poll `GET /api/summaries/job/:jobId` for status.

| Queue | Workers | Job types |
|-------|---------|-----------|
| `summary-queue` | 2 concurrent | Generate page summaries |
| `flashcard-queue` | 2 concurrent | Generate flashcard sets |
| `quiz-queue` | 2 concurrent | Generate quiz questions |

Workers truncate input to 10,000 characters before sending to Ollama.

## Real-time Events

Socket.io emits events to per-user rooms when:
- Page created/updated/deleted
- Summary generation completes
- Flashcards generated
- Quiz generated

WebSocket auth: pass JWT in socket handshake `auth.token`.

## Available Scripts

```bash
npm run dev              # Dev server with hot-reload (nodemon)
npm run build            # Compile TypeScript → dist/
npm run start            # Production (node dist/server.js)
npm run prisma:migrate   # Run pending migrations
npm run prisma:studio    # Open Prisma Studio at http://localhost:5555
npm run lint             # ESLint
```

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
| Adminer | 8080 | connect to `postgres` host with above credentials |

## Troubleshooting

**Ollama not responding:**
```bash
docker ps | grep ollama
docker logs docker-ollama-1
docker exec -it docker-ollama-1 ollama pull llama3.2
```

**DB connection failed:**
```bash
docker-compose restart postgres
docker logs docker-postgres-1
```

**JWT validation errors:** Ensure `JWT_SECRET` in `.env` matches what tokens were signed with. Regenerate if needed.

**BullMQ jobs stuck:** Check Redis is running. Jobs can be inspected in Bull Board or via `redis-cli KEYS bull:*`.
