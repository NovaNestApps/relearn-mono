# Webpage Reader Mono

AI-powered learning system that turns any webpage into structured knowledge — summaries, flashcards, quizzes, and spaced repetition study sessions.

## Projects

| Project | Path | Purpose |
|---------|------|---------|
| **AI Webpage Reader** | [`ai-webpage-reader/`](ai-webpage-reader/) | Chrome extension — reads pages, generates summaries/Q&A on-device |
| **Backend** | [`webpage-reader-backend/`](webpage-reader-backend/) | Fastify/TypeScript API — auth, persistence, AI job queue |
| **Relearn Web** | [`webpage-reader-web/`](webpage-reader-web/) | Next.js 14 app — study sessions, flashcards, quizzes, adaptive memory |
| **Relearn Mobile** | [`webpage-reader-mobile/`](webpage-reader-mobile/) | Flutter mobile app — auth, summaries, flashcards, quizzes, settings |

## Architecture

```
Chrome Extension (ai-webpage-reader)
  │  Extracts page content
  │  Generates summaries locally (Chrome AI / Ollama / WebLLM)
  │  Syncs saved summaries + quizzes + flashcards to backend
  ▼
Backend API (webpage-reader-backend) — localhost:3001
  │  Fastify + TypeScript + Prisma + PostgreSQL
  │  BullMQ job queue → Ollama LLM workers
  │  Socket.io realtime events (Redis adapter)
  ▼
Web App (webpage-reader-web) — localhost:3000
  │  Next.js 14 (App Router)
  │  Adaptive spaced-repetition study
  ▼
Mobile App (webpage-reader-mobile)
     Flutter + Riverpod + go_router
     Summaries, flashcards, quizzes, user settings
```

## Quick Start (Full Stack)

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Chrome (for extension)
- Flutter SDK (for mobile)

### 1. Start infrastructure

```bash
cd webpage-reader-backend/docker
docker-compose up -d
cd ..
```

### 2. Backend

```bash
cd webpage-reader-backend
npm install
cp .env.example .env
# Edit .env: set JWT_SECRET and JWT_REFRESH_SECRET (openssl rand -base64 32)
npm run prisma:migrate
npm run dev
# Running at http://localhost:3001
```

### 3. Web app

```bash
cd webpage-reader-web
npm install
# Create .env.local with NEXT_PUBLIC_API_BASE=http://localhost:3001/api
npm run dev
# Running at http://localhost:3000
```

### 4. Mobile app

```bash
cd webpage-reader-mobile
flutter pub get
# Android emulator
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001/api
# iOS simulator/macOS
# flutter run --dart-define=API_BASE_URL=http://localhost:3001/api
```

### 5. Chrome extension

```
1. Open chrome://extensions/
2. Enable Developer mode
3. Load unpacked → select ai-webpage-reader/
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

## Data Flow

1. User installs Chrome extension and browses to any webpage
2. Extension extracts DOM content and generates summary locally (no backend required)
3. User can save summaries to backend (requires account)
4. Extension can sync generated quizzes and flashcards to backend when authenticated
5. Backend queues AI jobs via BullMQ → Ollama generates flashcards and quizzes
6. Web and mobile apps fetch summaries/flashcards/quizzes and render study experiences
7. Realtime sync via Socket.io keeps extension and web app in sync

## Shared Data Model

```
User → Pages → Summaries → Flashcards
                         → Quizzes → QuizQuestions
```

All entities cascade-delete on parent removal. Users own all their data via JWT-authenticated requests.

## AI Providers

| Provider | Where Used | Notes |
|----------|-----------|-------|
| Chrome AI (Gemini Nano) | Extension | On-device, requires Chrome flags |
| Ollama | Extension + Backend | Self-hosted, ~2GB model download |
| WebLLM | Extension | Browser-based WASM, WebGPU required |

## Repo Layout

```
webpage-reader-mono/
├── ai-webpage-reader/      # Chrome extension (vanilla JS, MV3)
├── webpage-reader-backend/ # Fastify API server (TypeScript)
├── webpage-reader-web/     # Next.js 14 web app (TypeScript)
└── webpage-reader-mobile/  # Flutter mobile app
```

Each project has its own `package.json`/tooling and can be developed independently.
