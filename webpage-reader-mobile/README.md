# webpage-reader-mobile

Flutter mobile client for Webpage Reader backend.

## Stack

- Flutter (Material 3)
- Riverpod (state management)
- go_router (routing)
- Dio (HTTP client + auth/refresh interceptor)
- flutter_secure_storage (token storage)

## Features

- Login / Signup
- Summaries list
- Summary details
- Flashcards view
- Quiz view
- Settings
  - spaced repetition preference
  - notification preference
  - notification time
  - user profile data (name/email)

## Prerequisites

- Flutter SDK installed (`flutter --version`)
- Backend running at port 3001 (`webpage-reader-backend`)

## Run

```bash
cd webpage-reader-mobile
flutter pub get
```

### Android emulator

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001/api
```

### iOS simulator / macOS

```bash
flutter run --dart-define=API_BASE_URL=http://localhost:3001/api
```

## Useful commands

```bash
flutter analyze
flutter test
```

## Backend dependency notes

Mobile app uses authenticated backend routes including:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `PATCH /api/auth/me/settings`
- `GET /api/summaries`
- `GET /api/summaries/:id`
- `GET /api/flashcards/summary/:summaryId`
- `GET /api/quizzes/summary/:summaryId`

If flashcards/quizzes appear empty, verify backend has records for the same summary/page and authenticated user.

## Folder structure

```
lib/
  app/
  core/
    config/
    network/
    storage/
  features/
    auth/
    summaries/
    flashcards/
    quizzes/
    settings/
  models/
  shared/
```
