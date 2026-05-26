import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/api_endpoints.dart';
import '../../../core/network/api_client.dart';

final pretestRepositoryProvider = Provider<PretestRepository>((ref) {
  return PretestRepository(ref.watch(dioProvider));
});

class PretestQuestion {
  final String question;
  final List<String> options;

  const PretestQuestion({required this.question, required this.options});

  factory PretestQuestion.fromJson(Map<String, dynamic> json) =>
      PretestQuestion(
        question: json['question'] as String,
        options: List<String>.from(json['options'] as List),
      );
}

class PretestGenerateResult {
  final String pretestId;
  final List<PretestQuestion> questions;

  const PretestGenerateResult({
    required this.pretestId,
    required this.questions,
  });
}

class PretestSubmitResult {
  final double score;
  final List<bool> correct;

  const PretestSubmitResult({required this.score, required this.correct});
}

class PretestRepository {
  final Dio dio;
  PretestRepository(this.dio);

  Future<PretestGenerateResult> generate({
    required String url,
    required String title,
    String phase = 'before',
  }) async {
    final res = await dio.post(
      ApiEndpoints.pretestGenerate,
      data: {'url': url, 'title': title, 'phase': phase},
    );
    final json = (res.data as Map).cast<String, dynamic>();
    final questions = (json['questions'] as List)
        .whereType<Map>()
        .map((q) => PretestQuestion.fromJson(q.cast<String, dynamic>()))
        .toList();
    return PretestGenerateResult(
      pretestId: json['pretestId'] as String,
      questions: questions,
    );
  }

  Future<PretestSubmitResult> submit({
    required String pretestId,
    required List<String> answers,
    required String phase,
  }) async {
    final res = await dio.post(
      ApiEndpoints.pretestSubmit(pretestId),
      data: {'answers': answers, 'phase': phase},
    );
    final json = (res.data as Map).cast<String, dynamic>();
    return PretestSubmitResult(
      score: (json['score'] as num).toDouble(),
      correct: List<bool>.from(json['correct'] as List),
    );
  }
}
