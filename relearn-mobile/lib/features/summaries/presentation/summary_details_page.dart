import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../models/models.dart';
import '../../pretest/data/pretest_repository.dart';
import '../../pretest/presentation/pretest_bottom_sheet.dart';
import 'summaries_page.dart';

final summaryProvider = FutureProvider.family<Summary, String>((ref, id) async {
  return ref.watch(summariesRepositoryProvider).byId(id);
});

class SummaryDetailsPage extends ConsumerWidget {
  final String summaryId;
  const SummaryDetailsPage({super.key, required this.summaryId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(summaryProvider(summaryId));
    return Scaffold(
      appBar: AppBar(title: const Text('Summary Details')),
      body: summaryAsync.when(
        data: (summary) {
          final createdText = summary.createdAt != null
              ? '${summary.createdAt!.year}-${summary.createdAt!.month.toString().padLeft(2, '0')}-${summary.createdAt!.day.toString().padLeft(2, '0')}'
              : 'Unknown date';

          return Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Card(
                  margin: EdgeInsets.zero,
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          summary.page?.title ?? 'Untitled',
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF101828),
                              ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(
                              Icons.language_rounded,
                              size: 14,
                              color: Color(0xFF98A2B3),
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                summary.page?.url ?? '',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Color(0xFF667085),
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _InfoChip(
                              icon: Icons.auto_awesome_rounded,
                              label: 'Type: ${summary.type}',
                            ),
                            _InfoChip(
                              icon: Icons.calendar_today_rounded,
                              label: createdText,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: Card(
                    margin: EdgeInsets.zero,
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(16),
                      child: SelectableText(
                        summary.content,
                        style: const TextStyle(
                          height: 1.55,
                          fontSize: 15,
                          color: Color(0xFF344054),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: () =>
                            context.push('/summary/$summaryId/flashcards'),
                        icon: const Icon(Icons.style_rounded),
                        label: const Text('Flashcards'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: FilledButton.tonalIcon(
                        onPressed: () =>
                            context.push('/summary/$summaryId/quiz'),
                        icon: const Icon(Icons.quiz_rounded),
                        label: const Text('Quiz'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: summary.page?.url != null
                      ? () => PretestBottomSheet.show(
                          context,
                          repository: ref.read(pretestRepositoryProvider),
                          pageUrl: summary.page!.url!,
                          pageTitle: summary.page?.title ?? 'Untitled',
                        )
                      : null,
                  icon: const Icon(Icons.quiz_outlined),
                  label: const Text('Pre-read Quiz'),
                ),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Failed: $e')),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _InfoChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF4FF),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: const Color(0xFF2563EB)),
          const SizedBox(width: 5),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1D4ED8),
            ),
          ),
        ],
      ),
    );
  }
}
