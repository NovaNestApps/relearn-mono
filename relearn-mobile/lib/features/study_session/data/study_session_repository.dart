import 'package:dio/dio.dart';
import '../../../core/config/api_endpoints.dart';

class StudySessionCard {
  final String id;
  final String pageId;
  final String question;
  final String answer;
  final String difficulty;

  StudySessionCard({
    required this.id,
    required this.pageId,
    required this.question,
    required this.answer,
    required this.difficulty,
  });

  factory StudySessionCard.fromJson(Map<String, dynamic> json) {
    return StudySessionCard(
      id: json['id'] as String,
      pageId: json['pageId'] as String,
      question: json['question'] as String,
      answer: json['answer'] as String,
      difficulty: (json['difficulty'] as String?) ?? 'medium',
    );
  }
}

class StudySessionRepository {
  final Dio dio;
  StudySessionRepository(this.dio);

  Future<({String sessionId, List<StudySessionCard> cards})> createSession({
    int cardCount = 20,
  }) async {
    final res = await dio.get(
      ApiEndpoints.studySession,
      queryParameters: {'cardCount': cardCount},
    );
    final data = (res.data as Map).cast<String, dynamic>();
    final cards = (data['cards'] as List)
        .whereType<Map>()
        .map((e) => StudySessionCard.fromJson(e.cast<String, dynamic>()))
        .toList();
    return (sessionId: data['sessionId'] as String, cards: cards);
  }

  Future<void> completeSession(
    String sessionId,
    List<Map<String, dynamic>> results,
  ) async {
    await dio.post(
      ApiEndpoints.studySessionComplete(sessionId),
      data: {'results': results},
    );
  }
}
