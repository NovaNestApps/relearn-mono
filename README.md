# Relearn Mono

AI-powered adaptive learning system that turns any webpage into structured knowledge — summaries, flashcards, quizzes, spaced-repetition study, pre-reading assessment, teach-back evaluation, error-pattern analysis, and a concept knowledge graph.

## Projects

| Project | Path | Purpose |
|---------|------|---------|
| **Chrome Extension** | [`relearn-chrome-extension/`](relearn-chrome-extension/) | MV3 extension — reads pages, generates summaries/flashcards/quizzes on-device, pre-read quiz UI |
| **Backend** | [`relearn-backend/`](relearn-backend/) | Fastify/TypeScript API — auth, persistence, AI job queue, concept extraction |
| **Web App** | [`relearn-web/`](relearn-web/) | Next.js 14 — study sessions, analytics, concept graph, teach-back, pre-testing |
| **Mobile App** | [`relearn-mobile/`](relearn-mobile/) | Flutter — auth, summaries, flashcards, quizzes, pretest, weakspots, concepts |

## Architecture

```
Chrome Extension (relearn-chrome-extension)
  │  Extracts page content
  │  On-device AI: Chrome AI → Ollama → WebLLM
  │  Pre-read quiz before saving
  │  Syncs pages, flashcards, quizzes to backend
  ▼
Backend API (relearn-backend) — localhost:3001
  │  Fastify 5 + TypeScript + Prisma + PostgreSQL
  │  BullMQ workers → Ollama LLM
  │    • summary / flashcard / quiz generation
  │    • concept extraction (auto on page save)
  │    • remediation drill-card generation
  │  Socket.io realtime events (Redis adapter)
  ▼
Web App (relearn-web) — localhost:3000      Mobile App (relearn-mobile)
  Next.js 14 App Router                       Flutter + Riverpod + go_router
  Spaced-repetition study sessions            Summaries, flashcards, quizzes
  Teach-back tutor                            Pretest bottom sheet
  Pre-reading assessment                      Weak spots + drill cards
  Error-pattern analytics                     Concept list + detail
  Concept knowledge graph (React Flow)
```

## Quick Start (Full Stack)

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Chrome (for extension)
- Flutter SDK (for mobile)

### 1. Start infrastructure

```bash
cd relearn-backend/docker
docker-compose up -d
cd ..
```

### 2. Backend

```bash
cd relearn-backend
npm install
cp .env.example .env
# Set JWT_SECRET and JWT_REFRESH_SECRET (openssl rand -base64 32)
npm run prisma:migrate
npm run dev
# Running at http://localhost:3001
```

### 3. Web app

```bash
cd relearn-web
npm install
# .env.local:
# NEXT_PUBLIC_API_BASE=http://localhost:3001/api
npm run dev
# Running at http://localhost:3000
```

### 4. Mobile app

```bash
cd relearn-mobile
flutter pub get
# Android emulator
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001/api
# iOS simulator/macOS
flutter run --dart-define=API_BASE_URL=http://localhost:3001/api
```

### 5. Chrome extension

```
1. Open chrome://extensions/
2. Enable Developer mode
3. Load unpacked → select relearn-chrome-extension/
4. Set backend URL to http://localhost:3001 in extension settings
```

### 6. Pull Ollama model (first time)

```bash
docker exec -it docker-ollama-1 ollama pull llama3.2
```

## Development Ports

| Service | Port |
|---------|------|
| Web app | 3000 |
| Backend API | 3001 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Ollama | 11434 |
| Adminer (DB UI) | 8080 |
| Prisma Studio | 5555 |

## Data Model

```
User
 ├── Page (saved webpages)
 │    ├── Summary → Flashcard (with conceptTags)
 │    │              └── FlashcardReview (per-card study events)
 │    ├── Quiz → QuizQuestion
 │    ├── TeachBackAttempt
 │    ├── PretestAttempt
 │    └── PageConcept ─── Concept ─── ConceptRelation ─── Concept
 └── StudySession (interleaved card batches)
```

All entities cascade-delete on parent removal. Users own all data via JWT.

## Features by Plan

| Plan | Feature | Status |
|------|---------|--------|
| 0 | Foundation — schema, Jest, FlashcardReview | ✅ |
| 1 | Spaced Repetition — interleaved study sessions | ✅ |
| 2 | Study Sessions — session create/complete, review persistence | ✅ |
| 3 | Pre-Testing — generate quiz before reading, score after | ✅ |
| 4 | Error Pattern Analysis — weakspots, remediation drill cards | ✅ |
| 5 | Concept Graph — auto-extract concepts, React Flow visualization | ✅ |

## AI Providers

| Provider | Where Used | Notes |
|----------|-----------|-------|
| Chrome AI (Gemini Nano) | Extension | On-device, requires Chrome flags |
| Ollama | Extension + Backend | Self-hosted, `llama3.2` recommended |
| WebLLM | Extension | Browser WASM, WebGPU required |

## Repo Layout

```
webpage-reader-mono/
├── relearn-chrome-extension/   # Chrome extension (vanilla JS, MV3)
├── relearn-backend/            # Fastify API (TypeScript, Prisma)
├── relearn-web/                # Next.js 14 web app
└── relearn-mobile/             # Flutter mobile app
```
