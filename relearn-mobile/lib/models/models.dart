class AuthResponse {
  final String accessToken;
  final String refreshToken;
  final UserProfile user;

  AuthResponse(
      {required this.accessToken,
      required this.refreshToken,
      required this.user});

  factory AuthResponse.fromJson(Map<String, dynamic> json) => AuthResponse(
        accessToken: json['accessToken'] as String? ?? '',
        refreshToken: json['refreshToken'] as String? ?? '',
        user: UserProfile.fromJson(
            (json['user'] as Map?)?.cast<String, dynamic>() ?? {}),
      );
}

class UserSettings {
  final bool spacedRepetitionEnabled;
  final bool notificationEnabled;
  final String? notificationTime;

  UserSettings({
    required this.spacedRepetitionEnabled,
    required this.notificationEnabled,
    this.notificationTime,
  });

  factory UserSettings.fromJson(Map<String, dynamic> json) => UserSettings(
        spacedRepetitionEnabled:
            json['spacedRepetitionEnabled'] as bool? ?? true,
        notificationEnabled: json['notificationEnabled'] as bool? ?? false,
        notificationTime: json['notificationTime'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'spacedRepetitionEnabled': spacedRepetitionEnabled,
        'notificationEnabled': notificationEnabled,
        'notificationTime': notificationTime,
      };

  UserSettings copyWith(
      {bool? spacedRepetitionEnabled,
      bool? notificationEnabled,
      String? notificationTime}) {
    return UserSettings(
      spacedRepetitionEnabled:
          spacedRepetitionEnabled ?? this.spacedRepetitionEnabled,
      notificationEnabled: notificationEnabled ?? this.notificationEnabled,
      notificationTime: notificationTime ?? this.notificationTime,
    );
  }
}

class UserProfile {
  final String id;
  final String email;
  final String? name;
  final UserSettings settings;

  UserProfile(
      {required this.id,
      required this.email,
      required this.name,
      required this.settings});

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
        id: json['id'] as String? ?? '',
        email: json['email'] as String? ?? '',
        name: json['name'] as String?,
        settings: UserSettings.fromJson(json),
      );
}

class PageLite {
  final String id;
  final String title;
  final String url;

  PageLite({required this.id, required this.title, required this.url});

  factory PageLite.fromJson(Map<String, dynamic> json) => PageLite(
        id: json['id'] as String? ?? '',
        title: json['title'] as String? ?? '',
        url: json['url'] as String? ?? '',
      );
}

class Summary {
  final String id;
  final String pageId;
  final String content;
  final String type;
  final DateTime? createdAt;
  final PageLite? page;

  Summary(
      {required this.id,
      required this.pageId,
      required this.content,
      required this.type,
      this.createdAt,
      this.page});

  factory Summary.fromJson(Map<String, dynamic> json) => Summary(
        id: json['id'] as String? ?? '',
        pageId: json['pageId'] as String? ?? '',
        content: json['content'] as String? ?? '',
        type: json['type'] as String? ?? 'default',
        createdAt: DateTime.tryParse(json['createdAt'] as String? ?? ''),
        page: json['page'] is Map<String, dynamic>
            ? PageLite.fromJson(json['page'] as Map<String, dynamic>)
            : null,
      );
}

class Flashcard {
  final String id;
  final String question;
  final String answer;
  final String difficulty;

  Flashcard(
      {required this.id,
      required this.question,
      required this.answer,
      required this.difficulty});

  factory Flashcard.fromJson(Map<String, dynamic> json) => Flashcard(
        id: json['id'] as String? ?? '',
        question: json['question'] as String? ?? '',
        answer: json['answer'] as String? ?? '',
        difficulty: json['difficulty'] as String? ?? 'medium',
      );
}

class QuizQuestion {
  final String id;
  final String question;
  final List<String> options;
  final String correctAnswer;
  final String? explanation;

  QuizQuestion({
    required this.id,
    required this.question,
    required this.options,
    required this.correctAnswer,
    this.explanation,
  });

  factory QuizQuestion.fromJson(Map<String, dynamic> json) => QuizQuestion(
        id: json['id'] as String? ?? '',
        question: json['question'] as String? ?? '',
        options: ((json['options'] as List?) ?? [])
            .map((e) => e.toString())
            .toList(),
        correctAnswer: json['correctAnswer']?.toString() ?? '',
        explanation: json['explanation'] as String?,
      );
}

class Quiz {
  final String id;
  final String title;
  final List<QuizQuestion> questions;

  Quiz({required this.id, required this.title, required this.questions});

  factory Quiz.fromJson(Map<String, dynamic> json) => Quiz(
        id: json['id'] as String? ?? '',
        title: json['title'] as String? ?? 'Quiz',
        questions: ((json['questions'] as List?) ?? [])
            .whereType<Map<String, dynamic>>()
            .map(QuizQuestion.fromJson)
            .toList(),
      );
}
