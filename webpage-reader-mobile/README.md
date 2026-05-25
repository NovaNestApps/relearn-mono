# webpage-reader-mobile

Flutter mobile app for the webpage-reader backend.

## Run

```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://localhost:3001/api
```

For Android emulator, use `http://10.0.2.2:3001/api`.

## Implemented pages

- Login / Signup
- Summaries list
- Summary details
- Flashcards
- Quiz
- Settings (spaced repetition + notifications + user profile)
