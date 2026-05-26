# Relearn Web

Next.js 14 web app for AI-powered adaptive learning. Turns saved webpages into study material — summaries, flashcards, quizzes, spaced-repetition sessions, pre-read assessment, teach-back tutor, error-pattern analytics, and an interactive concept knowledge graph.

## Tech Stack

| Component | Version |
|-----------|---------|
| Next.js (App Router) | 14.2.4 |
| React | 18.2.0 |
| TypeScript (strict) | 5.4.5 |
| Tailwind CSS | 3.4.13 |
| React Flow | 11.x (concept graph) |
| Axios | 1.7.7 |
| marked + highlight.js | Markdown rendering |

## Quick Start

```bash
npm install
```

`.env.local`:
```bash
NEXT_PUBLIC_API_BASE=http://localhost:3001/api
```

```bash
npm run dev   # http://localhost:3000
```

## Routes

| Route | Description | Auth | Flag |
|-------|-------------|------|------|
| `/` | Landing page | No | — |
| `/auth/login` | Login | No | — |
| `/auth/register` | Register | No | — |
| `/pages` | Page library | Yes | — |
| `/pages/[id]` | Page detail + AI features + pre-read quiz | Yes | — |
| `/study` | Spaced-repetition flashcard queue | Yes | — |
| `/quiz` | Multiple-choice / true-false / short-answer quiz | Yes | — |
| `/teachback` | Teach-back tutor — explain concept, get coverage score | Yes | `TEACH_BACK` |
| `/analytics` | Weak-spots analysis + drill-card generation | Yes | — |
| `/graph` | Concept knowledge graph (React Flow) | Yes | — |
| `/voice` | Voice study session | Yes | `VOICE_STUDY` (off) |
| `/rooms` | Collaborative study rooms | Yes | `STUDY_ROOMS` (off) |

## API Clients (useApi.ts)

| Export | Endpoints Used |
|--------|---------------|
| `PagesApi` | `/pages` CRUD |
| `SummariesApi` | `/summaries` generate + poll |
| `FlashcardsApi` | `/flashcards` generate + CRUD |
| `FlashcardReviewApi` | `/flashcard-reviews` |
| `QuizApi` | `/quizzes` |
| `TeachBackApi` | `/pages/:id/teachback` POST + GET |
| `PretestApi` | `/pretest/generate` + `/:id/submit` |
| `AnalyticsApi` | `/analytics/weakspots` + `/analytics/remediation` |
| `GraphApi` | `/graph` + `/graph/page/:pageId` |
| `StudyApi` | `/study/events`, `/study/queue` ⚠️ backend not yet implemented |
| `ConceptMapApi` | `/concept-map` ⚠️ backend not yet implemented |
| `RoomsApi` | `/rooms` ⚠️ backend not yet implemented |
| `VoiceApi` | `/voice/sessions` ⚠️ backend not yet implemented |

## Feature Flags

| Flag | Default | Feature |
|------|---------|---------|
| `NEXT_PUBLIC_FEATURE_ADAPTIVE_MEMORY` | `true` | Study queue scheduling |
| `NEXT_PUBLIC_FEATURE_SOURCE_VERIFICATION` | `false` | Claim verification panel |
| `NEXT_PUBLIC_FEATURE_TEACH_BACK` | `false` | Teach-back tutor |
| `NEXT_PUBLIC_FEATURE_CONCEPT_MAP` | `false` | Legacy concept map (see `/graph` instead) |
| `NEXT_PUBLIC_FEATURE_COPILOT` | `true` | AI recommendations panel |
| `NEXT_PUBLIC_FEATURE_INCREMENTAL_READING` | `false` | Reading chunk queue |
| `NEXT_PUBLIC_FEATURE_VOICE_STUDY` | `false` | Voice sessions (backend missing) |
| `NEXT_PUBLIC_FEATURE_STUDY_ROOMS` | `false` | Collaborative rooms (backend missing) |
| `NEXT_PUBLIC_FEATURE_PRETESTING` | `true` | Pre-read quiz on page detail |

## Project Structure

```
relearn-web/
└── src/
    ├── app/
    │   ├── page.tsx                    # Landing
    │   ├── auth/login/page.tsx
    │   ├── auth/register/page.tsx
    │   ├── pages/page.tsx              # Page library
    │   ├── pages/[id]/page.tsx         # Detail + pretest button
    │   ├── study/page.tsx              # Flashcard study queue
    │   ├── quiz/page.tsx
    │   ├── teachback/page.tsx          # Calls POST /pages/:id/teachback
    │   ├── analytics/page.tsx          # Weakspots + drill cards
    │   ├── graph/page.tsx              # React Flow concept graph
    │   ├── voice/page.tsx              # (flag-gated)
    │   └── rooms/page.tsx              # (flag-gated)
    ├── components/features/
    │   ├── Markdown.tsx
    │   └── PretestModal.tsx            # idle → quiz → result flow
    ├── hooks/
    │   ├── useApi.ts                   # All API calls
    │   ├── useAuth.ts
    │   └── useRealtime.ts
    ├── lib/
    │   ├── api-client.ts
    │   ├── routes.ts                   # Route constants including /analytics, /graph
    │   ├── feature-flags.ts
    │   ├── memory.ts
    │   └── websocket.ts
    └── types/index.ts                  # All TS interfaces (GraphNode, GraphEdge, etc.)
```

## Authentication

JWT-based, silent refresh. `accessToken` (15m) + `refreshToken` (7d) in `localStorage`. Axios interceptor auto-refreshes on 401.

## Styling

Tailwind. Primary: `#6366f1`, secondary: `#8b5cf6`. Custom classes: `.btn-primary`, `.btn-secondary`, `.card`, `.input`, `.label`, `.prose-like`.

## Available Scripts

```bash
npm run dev      # Dev server port 3000
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
npx tsc --noEmit # Type-check only
```
