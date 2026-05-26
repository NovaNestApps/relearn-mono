# relearn-mobile

Flutter mobile client for the Relearn platform.

## Stack

- Flutter 3+ (Material 3)
- Riverpod (state management)
- go_router (routing)
- Dio (HTTP + auth/refresh interceptor)
- flutter_secure_storage (token storage)

## Features

- Auth (login / signup / token refresh)
- Summaries list + detail
- Flashcards view per summary
- Quiz view per summary
- Flashcard review persistence (confidence 1–4)
- Study session — interleaved cards from multiple pages
- Pre-read quiz (bottom sheet) before reading a summary
- Weak spots analytics + drill-card generation
- Concept list (searchable) + concept detail with related concepts
- Settings (spaced repetition, notifications, profile)

## Quick Start

```bash
flutter pub get

# Android emulator
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001/api

# iOS simulator / macOS
flutter run --dart-define=API_BASE_URL=http://localhost:3001/api
```

## Backend Endpoints Used

```
POST /api/auth/login|register|refresh
GET  /api/auth/me
PATCH /api/auth/me/settings

GET  /api/summaries
GET  /api/summaries/:id

GET  /api/pages/:id
GET  /api/flashcards/summary/:summaryId
GET  /api/quizzes/summary/:summaryId

POST /api/flashcard-reviews

GET  /api/study/session
POST /api/study/session/:id/complete

POST /api/pretest/generate
POST /api/pretest/:id/submit

GET  /api/analytics/weakspots
POST /api/analytics/remediation

GET  /api/graph
GET  /api/graph/page/:pageId
```

## App Routes (go_router)

| Path | Screen |
|------|--------|
| `/login` | LoginPage |
| `/signup` | SignupPage |
| `/summaries` | SummariesPage |
| `/summary/:id` | SummaryDetailsPage |
| `/summary/:id/flashcards` | FlashcardsPage |
| `/summary/:id/quiz` | QuizPage |
| `/settings` | SettingsPage |
| `/concepts` | ConceptsScreen (searchable list) |
| `/concepts/:id` | ConceptDetailScreen |

Pre-read quiz opens as `PretestBottomSheet.show()` from SummaryDetailsPage.
Weak spots is opened from navigation/settings as `WeakSpotsScreen`.

## Feature Directory Structure

```
lib/
├── core/
│   ├── config/api_endpoints.dart   # All endpoint constants
│   ├── network/api_client.dart     # Dio + auth headers + refresh retry
│   └── storage/secure_storage.dart
├── features/
│   ├── auth/
│   ├── summaries/
│   ├── flashcards/
│   ├── quizzes/
│   ├── study_session/
│   ├── pretest/
│   ├── analytics/
│   ├── concepts/                   # Concept list + detail
│   ├── teachback/
│   └── settings/
├── models/models.dart
└── shared/router.dart
```

## Useful Commands

```bash
flutter analyze
flutter test
dart format lib test
```
