import 'package:dio/dio.dart';

import '../../../core/config/api_endpoints.dart';
import '../../../models/models.dart';

class FlashcardsRepository {
  final Dio dio;
  FlashcardsRepository(this.dio);

  Future<List<Flashcard>> bySummaryId(String summaryId) async {
    try {
      final res = await dio.get(ApiEndpoints.flashcardsBySummary(summaryId));
      final json = (res.data as Map).cast<String, dynamic>();
      final items = (json['flashcards'] as List?) ?? const [];
      final cards = items
          .whereType<Map>()
          .map((e) => Flashcard.fromJson(e.cast<String, dynamic>()))
          .toList();
      if (cards.isNotEmpty) return cards;
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
    final items = (page['flashcards'] as List?) ?? const [];
    return items
        .whereType<Map>()
        .map((e) => Flashcard.fromJson(e.cast<String, dynamic>()))
        .toList();
  }
}
