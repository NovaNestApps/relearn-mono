import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/analytics_repository.dart';

class WeakSpotsScreen extends ConsumerStatefulWidget {
  const WeakSpotsScreen({super.key});

  @override
  ConsumerState<WeakSpotsScreen> createState() => _WeakSpotsScreenState();
}

class _WeakSpotsScreenState extends ConsumerState<WeakSpotsScreen> {
  List<WeakSpot> _spots = [];
  bool _loading = true;
  String? _generating;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final repo = ref.read(analyticsRepositoryProvider);
      final spots = await repo.getWeakspots();
      if (mounted)
        setState(() {
          _spots = spots;
          _loading = false;
        });
    } catch (_) {
      if (mounted)
        setState(() {
          _loading = false;
        });
    }
  }

  Future<void> _requestRemediation(String tag) async {
    setState(() => _generating = tag);
    try {
      final repo = ref.read(analyticsRepositoryProvider);
      await repo.requestRemediation([tag]);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Drill cards queued for "$tag"…')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to queue drill cards.')),
        );
      }
    } finally {
      if (mounted) setState(() => _generating = null);
    }
  }

  Color _accuracyColor(double accuracy) {
    if (accuracy >= 0.7) return Colors.green;
    if (accuracy >= 0.4) return Colors.orange;
    return Colors.red;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Weak Spots'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _spots.isEmpty
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'No data yet.\nReview some flashcards first — weak spots appear after a few sessions.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey),
                ),
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: _spots.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, i) {
                final spot = _spots[i];
                final pct = (spot.accuracy * 100).round();
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                spot.tag,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            Text(
                              '$pct%',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: _accuracyColor(spot.accuracy),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        LinearProgressIndicator(
                          value: spot.accuracy,
                          backgroundColor: Colors.grey.shade200,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            _accuracyColor(spot.accuracy),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Text(
                              '${spot.reviewCount} review${spot.reviewCount != 1 ? 's' : ''}',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade600,
                              ),
                            ),
                            const Spacer(),
                            TextButton(
                              onPressed: _generating == spot.tag
                                  ? null
                                  : () => _requestRemediation(spot.tag),
                              child: Text(
                                _generating == spot.tag
                                    ? 'Queuing…'
                                    : 'Drill cards',
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
