import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/api_endpoints.dart';
import '../../../core/network/api_client.dart';

final analyticsRepositoryProvider = Provider<AnalyticsRepository>((ref) {
  return AnalyticsRepository(ref.watch(dioProvider));
});

class WeakSpot {
  final String tag;
  final double accuracy;
  final int reviewCount;

  const WeakSpot({
    required this.tag,
    required this.accuracy,
    required this.reviewCount,
  });

  factory WeakSpot.fromJson(Map<String, dynamic> json) => WeakSpot(
    tag: json['tag'] as String,
    accuracy: (json['accuracy'] as num).toDouble(),
    reviewCount: json['reviewCount'] as int,
  );
}

class AnalyticsRepository {
  final Dio dio;
  AnalyticsRepository(this.dio);

  Future<List<WeakSpot>> getWeakspots() async {
    final res = await dio.get(ApiEndpoints.weakspots);
    final data = (res.data as Map).cast<String, dynamic>();
    return (data['weakspots'] as List)
        .whereType<Map>()
        .map((e) => WeakSpot.fromJson(e.cast<String, dynamic>()))
        .toList();
  }

  Future<void> requestRemediation(List<String> conceptTags) async {
    await dio.post(
      ApiEndpoints.remediation,
      data: {'conceptTags': conceptTags},
    );
  }
}
