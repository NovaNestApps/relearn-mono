import 'package:dio/dio.dart';

import '../../../core/config/api_endpoints.dart';
import '../../../models/models.dart';

class SummariesRepository {
  final Dio dio;
  SummariesRepository(this.dio);

  Future<List<Summary>> list() async {
    final res = await dio.get(ApiEndpoints.summaries);
    final json = (res.data as Map).cast<String, dynamic>();
    final items = (json['summaries'] as List?) ?? const [];
    return items
        .whereType<Map>()
        .map((e) => Summary.fromJson(e.cast<String, dynamic>()))
        .toList();
  }

  Future<Summary> byId(String id) async {
    final res = await dio.get(ApiEndpoints.summaryById(id));
    final json = (res.data as Map).cast<String, dynamic>();
    return Summary.fromJson(
        ((json['summary'] as Map?) ?? json).cast<String, dynamic>());
  }
}
