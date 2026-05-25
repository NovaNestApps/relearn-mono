# relearn-mobile — Codex Instructions

## Scope

This folder contains the Flutter mobile app for the monorepo.

- Use Dart/Flutter tooling only in this project folder.
- Do not modify backend/web/extension files unless user explicitly asks for cross-project work.

## Commands

Run from `relearn-mobile/`:

```bash
flutter pub get
flutter analyze
flutter test
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001/api
```

## API Configuration

- Base URL is controlled by `--dart-define=API_BASE_URL=...`
- Android emulator must use `10.0.2.2` for host machine localhost.

## Architecture

- `lib/core/network/api_client.dart` contains Dio setup, auth header, and refresh-token retry flow.
- `lib/features/*/data` contains repositories.
- `lib/features/*/presentation` contains pages/controllers.
- `lib/models/models.dart` contains API DTOs.

## Implementation Notes

- Preserve null-safe parsing for backend fields that may be missing.
- Keep navigation behavior consistent with `go_router` stack semantics (`push` for drill-in, `go` for auth reset flows).
- For backend response shape differences, prefer resilient parsing instead of brittle exact-shape assumptions.

## Before finishing changes

- Format Dart files with `dart format lib test`.
- Run `flutter analyze` and fix issues.
- If tests are relevant, run `flutter test`.
