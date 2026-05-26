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
            itemBuilder: (_, i) => _FlashcardTile(
              card: cards[i],
              repository: ref.read(flashcardsRepositoryProvider),
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Failed: $e')),
      ),
    );
  }
}

class _FlashcardTile extends StatefulWidget {
  final Flashcard card;
  final FlashcardsRepository repository;
  const _FlashcardTile({required this.card, required this.repository});

  @override
  State<_FlashcardTile> createState() => _FlashcardTileState();
}

class _FlashcardTileState extends State<_FlashcardTile> {
  DateTime? _expandedAt;
  bool _reviewed = false;

  void _onExpansionChanged(bool expanded) {
    if (expanded) _expandedAt = DateTime.now();
  }

  Future<void> _submitReview(bool correct, int confidence) async {
    if (_reviewed) return;
    setState(() => _reviewed = true);
    final timeTaken = _expandedAt != null
        ? DateTime.now().difference(_expandedAt!).inMilliseconds
        : 0;
    widget.repository
        .postReview(
          flashcardId: widget.card.id,
          correct: correct,
          timeTaken: timeTaken,
          confidence: confidence,
        )
        .catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ExpansionTile(
        onExpansionChanged: _onExpansionChanged,
        tilePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        childrenPadding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
        title: Text(
          widget.card.question,
          style: const TextStyle(
              fontWeight: FontWeight.w700, color: Color(0xFF101828)),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Text(
            'Difficulty: ${widget.card.difficulty}',
            style:
                const TextStyle(color: Color(0xFF667085), fontSize: 12),
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
              widget.card.answer,
              style: const TextStyle(height: 1.45, color: Color(0xFF344054)),
            ),
          ),
          const SizedBox(height: 12),
          if (_reviewed)
            const Center(
              child: Text('Recorded!',
                  style: TextStyle(color: Color(0xFF6366F1), fontSize: 13)),
            )
          else
            _ReviewButtons(onReview: _submitReview),
        ],
      ),
    );
  }
}

class _ReviewButtons extends StatelessWidget {
  final Future<void> Function(bool correct, int confidence) onReview;
  const _ReviewButtons({required this.onReview});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('How confident?',
            style: TextStyle(fontSize: 12, color: Color(0xFF667085))),
        const SizedBox(height: 6),
        Row(
          children: [
            _ConfidenceBtn(label: '1', color: const Color(0xFFEF4444),
                onTap: () => onReview(false, 1)),
            const SizedBox(width: 6),
            _ConfidenceBtn(label: '2', color: const Color(0xFFF97316),
                onTap: () => onReview(false, 2)),
            const SizedBox(width: 6),
            _ConfidenceBtn(label: '3', color: const Color(0xFF22C55E),
                onTap: () => onReview(true, 3)),
            const SizedBox(width: 6),
            _ConfidenceBtn(label: '4', color: const Color(0xFF6366F1),
                onTap: () => onReview(true, 4)),
          ],
        ),
        const SizedBox(height: 4),
        const Text(
          '1–2 = missed  ·  3–4 = got it',
          style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
        ),
      ],
    );
  }
}

class _ConfidenceBtn extends StatelessWidget {
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _ConfidenceBtn(
      {required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 44,
        height: 36,
        decoration: BoxDecoration(
          color: color.withOpacity(0.12),
          border: Border.all(color: color.withOpacity(0.4)),
          borderRadius: BorderRadius.circular(8),
        ),
        alignment: Alignment.center,
        child: Text(label,
            style: TextStyle(
                color: color, fontWeight: FontWeight.w700, fontSize: 16)),
      ),
    );
  }
}
