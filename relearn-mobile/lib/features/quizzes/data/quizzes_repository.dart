import 'package:dio/dio.dart';

import '../../../core/config/api_endpoints.dart';
import '../../../models/models.dart';

class QuizzesRepository {
  final Dio dio;
  QuizzesRepository(this.dio);

  Future<List<Quiz>> bySummaryId(String summaryId) async {
    try {
      final res = await dio.get(ApiEndpoints.quizzesBySummary(summaryId));
      final json = (res.data as Map).cast<String, dynamic>();
      final items = (json['quizzes'] as List?) ?? const [];
      final quizzes = items
          .whereType<Map>()
          .map((e) => Quiz.fromJson(e.cast<String, dynamic>()))
          .toList();
      if (quizzes.isNotEmpty) return quizzes;
    } catch (_) {
      // Fallback below for compatibility with older/newer backend variants.
    }

    final summaryRes = await dio.get(ApiEndpoints.summaryById(summaryId));
    final summaryJson = (summaryRes.data as Map).cast<String, dynamic>();
    final summary = ((summaryJson['summary'] as Map?) ?? summaryJson)
        .cast<String, dynamic>();
    final pageId = summary['pageId']?.toString();
    if (pageId == null || pageId.isEmpty) return const [];

    final pageRes = await dio.get(ApiEndpoints.pageById(pageId));
    final pageJson = (pageRes.data as Map).cast<String, dynamic>();
    final page =
        ((pageJson['page'] as Map?) ?? pageJson).cast<String, dynamic>();
    final items = (page['quizzes'] as List?) ?? const [];
    return items
        .whereType<Map>()
        .map((e) => Quiz.fromJson(e.cast<String, dynamic>()))
        .toList();
  }
}
