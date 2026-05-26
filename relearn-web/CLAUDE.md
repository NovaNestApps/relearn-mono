# Relearn Web — Claude Instructions

## Stack

Next.js 14 App Router, TypeScript strict, Tailwind CSS, React Flow. Dev: `npm run dev` on port 3000. Requires backend at `http://localhost:3001`.

## Key Files

| File | Purpose |
|------|---------|
| `src/types/index.ts` | All data interfaces — source of truth for types shared with backend |
| `src/hooks/useApi.ts` | All API method calls — add new endpoints here |
| `src/lib/api-client.ts` | Axios instance — JWT auth header + 401 refresh interceptor |
| `src/hooks/useAuth.ts` | Auth state — use in every protected page |
| `src/lib/routes.ts` | Route constants — never hardcode route strings in components |
| `src/lib/feature-flags.ts` | `NEXT_PUBLIC_FEATURE_*` toggles — wrap experimental UI in these |
| `src/lib/memory.ts` | Local spaced-repetition scheduler + queue bucket logic |
| `src/app/analytics/page.tsx` | Weakspots + drill-card UI |
| `src/app/graph/page.tsx` | React Flow concept graph (full + page-scoped) |
| `src/components/features/PretestModal.tsx` | Pre-read quiz modal (idle→quiz→result) |

## App Router

Uses Next.js 14 App Router (`src/app/`). Pages are `page.tsx` files. Dynamic routes use bracket notation: `[id]/page.tsx`. No `pages/` directory — do not create one.

No server-side API routes (`route.ts`). All data comes from the external Fastify backend.

## Auth Pattern

Every protected page must call `useAuth()` and redirect:

```tsx
const { user, ready } = useAuth();

if (!ready) return <div>Loading...</div>;
if (!user) { router.push('/auth/login'); return null; }
```

Do NOT bypass this check. `ready` is false during initial token validation — always show a loading state.

## API Calls

All HTTP calls go through `src/hooks/useApi.ts`. Add new endpoints there. Never call `axios` or `fetch` directly in components — always use the methods from `useApi.ts` which uses the authenticated Axios instance.

```typescript
// In useApi.ts — add new API methods like:
export const MyApi = {
  doThing: (id: string) => apiClient.post<MyType>(`/my-feature/${id}`)
};
```

## Adding a New Page

1. Create `src/app/my-route/page.tsx`
2. Add route constant to `src/lib/routes.ts`
3. Add auth guard at top of component (see pattern above)
4. Wrap in feature flag check if experimental
5. Add to navigation (in the appropriate parent layout or nav component)

## Feature Flags

Wrap experimental or incomplete features:

```tsx
import { isFeatureEnabled } from '@/lib/feature-flags';

{isFeatureEnabled('VOICE_STUDY') && <VoiceButton />}
```

Default values are defined in `feature-flags.ts`. Override via `.env.local`.

## Types

All TypeScript types for API responses live in `src/types/index.ts`. When backend schema changes (Prisma), update this file. Keep types in sync with what the backend actually returns — no silent `any` for API responses.

## State Management

Mostly React `useState` + `useEffect`. Zustand is installed but not actively used. Do not add global state without strong justification — component-local state is preferred.

LocalStorage keys:
- `accessToken` / `refreshToken` — auth (managed by `useAuth.ts`)
- `relearn.memory.{pageId}` — local spaced-repetition state (managed by `memory.ts`)

## Markdown Rendering

Use `<Markdown content={text} />` from `src/components/features/Markdown.tsx`. Do not render unsanitized HTML — all markdown goes through the custom sanitizer in that component.

## Styling Conventions

- Tailwind utility classes (no custom CSS files unless for global styles)
- Custom utilities defined in global CSS: `.btn-primary`, `.btn-secondary`, `.card`, `.input`, `.label`, `.prose-like`
- Primary color: `#6366f1` (indigo), Secondary: `#8b5cf6` (violet)
- Responsive: use `md:` breakpoints, mobile-first

## Routing

Always use route constants from `src/lib/routes.ts`:

```typescript
import { ROUTES } from '@/lib/routes';
router.push(ROUTES.STUDY);
```

For routes with query params use `routeWithQuery(path, params)` from the same file.

## TypeScript

Strict mode. No `any` — use `unknown` and narrow. Errors caught in catch blocks should be typed as `unknown` then checked with `instanceof`. Never cast to `any` to suppress type errors.

## Implemented API Clients

`PagesApi`, `SummariesApi`, `FlashcardsApi`, `FlashcardReviewApi`, `QuizApi`, `TeachBackApi`, `PretestApi`, `AnalyticsApi`, `GraphApi` — all backed by real backend routes.

`StudyApi`, `ConceptMapApi`, `RoomsApi`, `VoiceApi` — flag-gated; backend routes not yet implemented (see comments in `useApi.ts`).

## Build Check

Before reporting a change as complete, verify:
```bash
npx tsc --noEmit   # must pass with zero errors
npm run build      # must succeed
```

## Available Scripts

```bash
npm run dev      # Dev server port 3000
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint (may prompt for ESLint config on first run)
```
