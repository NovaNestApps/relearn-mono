# relearn-mobile — Claude Instructions

## Scope

Flutter mobile app. Use Dart/Flutter tooling only. Don't modify backend/web/extension files unless explicitly asked for cross-project work.

## Commands

```bash
flutter pub get
flutter analyze
flutter test
dart format lib test
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001/api   # Android emulator
flutter run --dart-define=API_BASE_URL=http://localhost:3001/api   # iOS/macOS
```

## API Configuration

- Base URL via `--dart-define=API_BASE_URL`
- Android emulator must use `10.0.2.2` for host machine localhost
- All endpoints listed in `lib/core/config/api_endpoints.dart`

## Architecture

```
lib/core/network/api_client.dart      Dio setup, auth headers, refresh-token retry
lib/core/config/api_endpoints.dart    All endpoint constants (static strings + helpers)
lib/features/*/data/                  Repositories (Dio calls + model parsing)
lib/features/*/presentation/          Screens / controllers (ConsumerStatefulWidget)
lib/models/models.dart                Legacy DTOs
lib/shared/router.dart                go_router config
```

## Implemented Features

| Feature | Repository | Screen |
|---------|-----------|--------|
| Auth | `auth_controller.dart` | `login_page.dart`, `signup_page.dart` |
| Summaries | `summaries_repository.dart` | `summaries_page.dart`, `summary_details_page.dart` |
| Flashcards | `flashcards_repository.dart` | `flashcards_page.dart` |
| Quizzes | `quizzes_repository.dart` | `quiz_page.dart` |
| Flashcard Reviews | `flashcard_review_repository.dart` | (inline in flashcards) |
| Study Session | `study_session_repository.dart` | `study_session_screen.dart` |
| Pre-Testing | `pretest_repository.dart` | `pretest_bottom_sheet.dart` |
| Analytics | `analytics_repository.dart` | `weakspots_screen.dart` |
| Concepts | `concepts_repository.dart` | `concepts_screen.dart`, `concept_detail_screen.dart` |
| Settings | — | `settings_page.dart` |

## Adding a New Feature

1. Create `lib/features/my_feature/data/my_feature_repository.dart`
   - Import `dioProvider` from `lib/core/network/api_client.dart`
   - Add endpoint to `lib/core/config/api_endpoints.dart`
   - Use resilient null-safe JSON parsing (backend fields may be missing)
2. Create `lib/features/my_feature/presentation/my_screen.dart`
   - Extend `ConsumerStatefulWidget`
   - Load data in `initState()` via `ref.read(repositoryProvider)`
3. Register route in `lib/shared/router.dart`

## Navigation Rules

- `context.push('/path')` — drill-in (back button works)
- `context.go('/path')` — replace stack (use for auth redirect)
- Pass complex objects via `extra: { 'key': value }` map, not as path params

## Implementation Notes

- Null-safe JSON parsing: `json['field'] as String? ?? ''` not `json['field'] as String`
- Numeric fields: `(json['value'] as num?)?.toDouble() ?? 0.0`
- Lists: `(json['list'] as List? ?? []).whereType<Map>().map(...)...`
- After API calls use `if (mounted) setState(...)` guard
- Show errors via `ScaffoldMessenger.of(context).showSnackBar(...)`

## Before Finishing Changes

1. `dart format lib test`
2. `flutter analyze` — fix all issues
3. `flutter test` if tests exist
