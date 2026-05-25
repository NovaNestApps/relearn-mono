import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../models/models.dart';
import '../data/quizzes_repository.dart';

final quizzesRepositoryProvider = Provider<QuizzesRepository>((ref) {
  return QuizzesRepository(ref.watch(dioProvider));
});

final quizzesProvider =
    FutureProvider.family<List<Quiz>, String>((ref, summaryId) {
  return ref.watch(quizzesRepositoryProvider).bySummaryId(summaryId);
});

class QuizPage extends ConsumerWidget {
  final String summaryId;
  const QuizPage({super.key, required this.summaryId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final quizzesAsync = ref.watch(quizzesProvider(summaryId));
    return Scaffold(
      appBar: AppBar(title: const Text('Quiz')),
      body: quizzesAsync.when(
        data: (quizzes) {
          if (quizzes.isEmpty) {
            return const Center(
              child: Text(
                'No quizzes found.',
                style: TextStyle(color: Color(0xFF667085), fontSize: 16),
              ),
            );
          }
          final quiz = quizzes.first;
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: quiz.questions.length,
            itemBuilder: (_, i) {
              final q = quiz.questions[i];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Q${i + 1}. ${q.question}',
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF101828),
                                ),
                      ),
                      const SizedBox(height: 8),
                      ...q.options.map(
                        (o) => Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Text('• $o',
                              style: const TextStyle(
                                  color: Color(0xFF344054), height: 1.35)),
                        ),
                      ),
                      if (q.explanation != null) ...[
                        const SizedBox(height: 10),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Text(
                            'Explanation: ${q.explanation}',
                            style: const TextStyle(
                                color: Color(0xFF475467), height: 1.4),
                          ),
                        ),
                      ]
                    ],
                  ),
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Failed: $e')),
      ),
    );
  }
}
