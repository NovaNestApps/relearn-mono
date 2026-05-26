import 'package:dio/dio.dart';
import '../../../core/config/api_endpoints.dart';

class TeachBackResult {
  final String attemptId;
  final double score;
  final String feedback;
  final List<String> gaps;
  final List<String> followUpQuestions;

  TeachBackResult({
    required this.attemptId,
    required this.score,
    required this.feedback,
    required this.gaps,
    required this.followUpQuestions,
  });

  factory TeachBackResult.fromJson(Map<String, dynamic> json) {
    return TeachBackResult(
      attemptId: json['attemptId'] as String,
      score: (json['score'] as num).toDouble(),
      feedback: json['feedback'] as String,
      gaps: List<String>.from(json['gaps'] as List? ?? []),
      followUpQuestions: List<String>.from(json['followUpQuestions'] as List? ?? []),
    );
  }
}

class TeachBackRepository {
  final Dio dio;
  TeachBackRepository(this.dio);

  Future<TeachBackResult> submit(String pageId, String attemptText) async {
    final res = await dio.post(
      ApiEndpoints.teachback(pageId),
      data: {'attemptText': attemptText},
    );
    return TeachBackResult.fromJson((res.data as Map).cast<String, dynamic>());
  }

  Future<List<double>> getHistory(String pageId) async {
    final res = await dio.get(ApiEndpoints.teachback(pageId));
    final data = (res.data as Map).cast<String, dynamic>();
    final attempts = data['attempts'] as List? ?? [];
    return attempts
        .whereType<Map>()
        .map((a) => (a['score'] as num).toDouble())
        .toList();
  }
}
