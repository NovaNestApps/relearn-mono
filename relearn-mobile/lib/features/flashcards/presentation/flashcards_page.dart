import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../models/models.dart';
import '../data/flashcards_repository.dart';

final flashcardsRepositoryProvider = Provider<FlashcardsRepository>((ref) {
  return FlashcardsRepository(ref.watch(dioProvider));
});

final flashcardsProvider =
    FutureProvider.family<List<Flashcard>, String>((ref, summaryId) {
  return ref.watch(flashcardsRepositoryProvider).bySummaryId(summaryId);
});

class FlashcardsPage extends ConsumerWidget {
  final String summaryId;
  const FlashcardsPage({super.key, required this.summaryId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cardsAsync = ref.watch(flashcardsProvider(summaryId));
    return Scaffold(
      appBar: AppBar(title: const Text('Flashcards')),
      body: cardsAsync.when(
        data: (cards) {
          if (cards.isEmpty) {
            return const Center(
              child: Text(
                'No flashcards found for this summary.',
                style: TextStyle(color: Color(0xFF667085), fontSize: 16),
              ),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            itemCount: cards.length,
            itemBuilder: (_, i) {
              final c = cards[i];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ExpansionTile(
                  tilePadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                  childrenPadding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                  title: Text(
                    c.question,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, color: Color(0xFF101828)),
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      'Difficulty: ${c.difficulty}',
                      style: const TextStyle(
                          color: Color(0xFF667085), fontSize: 12),
                    ),
                  ),
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Text(
                        c.answer,
                        style: const TextStyle(
                            height: 1.45, color: Color(0xFF344054)),
                      ),
                    ),
                  ],
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
