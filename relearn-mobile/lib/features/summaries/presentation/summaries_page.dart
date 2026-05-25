import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../models/models.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/summaries_repository.dart';

final summariesRepositoryProvider = Provider<SummariesRepository>((ref) {
  return SummariesRepository(ref.watch(dioProvider));
});

final summariesProvider = FutureProvider<List<Summary>>((ref) async {
  return ref.watch(summariesRepositoryProvider).list();
});

class SummariesPage extends ConsumerWidget {
  const SummariesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summariesAsync = ref.watch(summariesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Summaries'),
        actions: [
          IconButton(
              onPressed: () => context.push('/settings'),
              icon: const Icon(Icons.settings)),
          IconButton(
            onPressed: () async {
              await ref.read(authControllerProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: summariesAsync.when(
        data: (items) {
          if (items.isEmpty) {
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(summariesProvider),
              child: ListView(
                children: const [
                  SizedBox(height: 160),
                  Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(horizontal: 24),
                      child: Text(
                        'No summaries found for this account.\nPull down to refresh.',
                        textAlign: TextAlign.center,
                        style:
                            TextStyle(color: Color(0xFF667085), fontSize: 16),
                      ),
                    ),
                  ),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(summariesProvider),
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              itemCount: items.length,
              itemBuilder: (_, i) {
                final s = items[i];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () => context.push('/summary/${s.id}'),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            s.page?.title ?? 'Summary ${s.id}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 16,
                              color: Color(0xFF101828),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            s.content,
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Color(0xFF475467),
                              height: 1.4,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              const Icon(Icons.link_rounded,
                                  size: 14, color: Color(0xFF98A2B3)),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  s.page?.url ?? '',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                      color: Color(0xFF667085), fontSize: 12),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Failed: $e')),
      ),
    );
  }
}
