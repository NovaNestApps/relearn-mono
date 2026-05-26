class ApiEndpoints {
  static const baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3001/api',
  );

  static const authLogin = '/auth/login';
  static const authRegister = '/auth/register';
  static const authRefresh = '/auth/refresh';
  static const authMe = '/auth/me';
  static const authMeSettings = '/auth/me/settings';

  static const summaries = '/summaries';
  static String summaryById(String id) => '/summaries/$id';
  static String pageById(String id) => '/pages/$id';

  static String flashcardsBySummary(String summaryId) =>
      '/flashcards/summary/$summaryId';
  static String quizzesBySummary(String summaryId) =>
      '/quizzes/summary/$summaryId';

  static const flashcardReviews = '/flashcard-reviews';

  static const studySession = '/study/session';
  static String studySessionComplete(String id) => '/study/session/$id/complete';
}
