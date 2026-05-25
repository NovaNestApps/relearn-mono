# Relearn Web

Next.js 14 web app for AI-powered adaptive learning. Turn webpages into structured study material — summaries, flashcards, quizzes — with spaced-repetition scheduling, teach-back tutor, and collaborative study rooms.

## Tech Stack

| Component | Version |
|-----------|---------|
| Next.js (App Router) | 14.2.4 |
| React | 18.2.0 |
| TypeScript (strict) | 5.4.5 |
| Tailwind CSS | 3.4.13 |
| Axios | 1.7.7 |
| marked + highlight.js | rendering markdown |
| Zustand | 4.5.2 (installed, minimal use) |

## Quick Start

### Prerequisites

- Node.js 18+
- Backend API running at `http://localhost:3001` (see `webpage-reader-backend/`)

### Install and run

```bash
npm install
```

Create `.env.local`:

```bash
NEXT_PUBLIC_API_BASE=http://localhost:3001/api
```

```bash
npm run dev
# App at http://localhost:3000
```

## Routes

| Route | Description | Auth required |
|-------|-------------|---------------|
| `/` | Landing page | No |
| `/auth/login` | Login form | No |
| `/auth/register` | Register form | No |
| `/pages` | Page library — add/delete saved webpages | Yes |
| `/pages/[id]` | Page detail — summaries, flashcards, quizzes, concept map, copilot | Yes |
| `/study` | Spaced-repetition flashcard queue (Overdue / Due Now / New) | Yes |
| `/quiz` | Quiz attempt — multiple-choice, boolean, short-answer | Yes |
| `/teachback` | Teach-back tutor — explain a concept, get coverage & misconception feedback | Yes |
| `/voice` | Voice study session workspace | Yes (feature flag) |
| `/rooms` | Collaborative study rooms | Yes (feature flag) |

All routes except `/`, `/auth/login`, `/auth/register` redirect to login if unauthenticated.

## Project Structure

```
webpage-reader-web/
├── src/
│   ├── app/                        # Next.js App Router pages
│   │   ├── page.tsx                # Landing page
│   │   ├── auth/login/page.tsx
│   │   ├── auth/register/page.tsx
│   │   ├── pages/page.tsx          # Page library
│   │   ├── pages/[id]/page.tsx     # Page detail + AI features
│   │   ├── study/page.tsx          # Flashcard study queue
│   │   ├── quiz/page.tsx           # Quiz attempts
│   │   ├── teachback/page.tsx      # Teach-back tutor
│   │   ├── voice/page.tsx          # Voice sessions
│   │   └── rooms/page.tsx          # Study rooms
│   ├── components/
│   │   ├── features/
│   │   │   └── Markdown.tsx        # Markdown renderer (marked + highlight.js + sanitizer)
│   │   └── ui/
│   │       ├── Card.tsx            # White card container
│   │       └── Progress.tsx        # Progress bar
│   ├── hooks/
│   │   ├── useApi.ts               # All API calls (PagesApi, SummariesApi, FlashcardsApi, etc.)
│   │   ├── useAuth.ts              # Auth state, login/logout, token refresh
│   │   └── useRealtime.ts          # WebSocket connect/send/disconnect
│   ├── lib/
│   │   ├── api-client.ts           # Axios instance + 401 refresh interceptor
│   │   ├── routes.ts               # Centralized route constants + helpers
│   │   ├── feature-flags.ts        # NEXT_PUBLIC_FEATURE_* toggles
│   │   ├── memory.ts               # Local spaced-repetition scheduler + queue buckets
│   │   └── websocket.ts            # WebSocket URL utilities
│   └── types/
│       └── index.ts                # All TypeScript interfaces (Page, Summary, Flashcard, etc.)
├── public/                         # Static assets
├── next.config.mjs
├── tailwind.config.js
└── tsconfig.json
```

## Authentication

JWT-based with silent refresh. Tokens stored in `localStorage`.

- `accessToken` — 15 minute expiry
- `refreshToken` — 7 day expiry

On 401 response, the Axios interceptor in `src/lib/api-client.ts` automatically:
1. Calls `POST /api/auth/refresh` with the refresh token
2. Updates both tokens in localStorage
3. Retries the failed request with new token

Call `useAuth()` in any component to get `{ user, isAuthed, ready, login, logout }`.

## Feature Flags

Toggle experimental features via environment variables:

| Flag | Default | Feature |
|------|---------|---------|
| `NEXT_PUBLIC_FEATURE_ADAPTIVE_MEMORY` | `true` | Study queue scheduling |
| `NEXT_PUBLIC_FEATURE_SOURCE_VERIFICATION` | `true` | Claim verification panel |
| `NEXT_PUBLIC_FEATURE_TEACH_BACK` | `true` | Teach-back tutor |
| `NEXT_PUBLIC_FEATURE_CONCEPT_MAP` | `true` | Concept map visualization |
| `NEXT_PUBLIC_FEATURE_COPILOT` | `true` | AI recommendations panel |
| `NEXT_PUBLIC_FEATURE_INCREMENTAL_READING` | `false` | Reading chunk queue |
| `NEXT_PUBLIC_FEATURE_VOICE_STUDY` | `false` | Voice sessions |
| `NEXT_PUBLIC_FEATURE_STUDY_ROOMS` | `false` | Collaborative rooms |

## Adaptive Memory

Local spaced-repetition scheduling lives in `src/lib/memory.ts`. Uses `localStorage` key `relearn.memory.{pageId}`. Queue buckets:

- **Overdue** — due 6+ hours ago
- **Due Now** — due within the next 6 hours
- **New** — never studied (reps = 0)

Study events (`StudyEvent`) are submitted to `/api/study/events` with confidence (1–5), latency, and outcome. Server recomputes intervals; local scheduler is the fallback.

## Styling

Tailwind CSS with a custom color scheme (primary: `#6366f1`, secondary: `#8b5cf6`). Custom utility classes defined in global CSS:

- `.btn-primary` / `.btn-secondary` — action buttons
- `.card` — white shadow container
- `.input` / `.label` — form elements
- `.prose-like` — markdown content areas

## Available Scripts

```bash
npm run dev      # Dev server on port 3000
npm run build    # Production build
npm run start    # Production server on port 3000
npm run lint     # ESLint
```

## Environment Variables

```bash
# Required
NEXT_PUBLIC_API_BASE=http://localhost:3001/api

# Optional
NEXT_PUBLIC_APP_BASE_PATH=/          # Base path for subdirectory deployments

# Feature flags (all optional, see above)
NEXT_PUBLIC_FEATURE_VOICE_STUDY=true
NEXT_PUBLIC_FEATURE_STUDY_ROOMS=true
```

## Deployment

Works on Vercel, Netlify, or any Node.js host. Set `NEXT_PUBLIC_API_BASE` to your production backend URL.

```bash
npm run build && npm start
```
