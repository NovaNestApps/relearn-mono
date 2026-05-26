import 'package:flutter/material.dart';

import '../data/concepts_repository.dart';

class ConceptDetailScreen extends StatelessWidget {
  final ConceptNode node;
  final ConceptGraph? graph;

  const ConceptDetailScreen({
    super.key,
    required this.node,
    this.graph,
  });

  @override
  Widget build(BuildContext context) {
    // Find edges for this concept
    final edges = graph?.edges
            .where((e) => e.sourceId == node.id || e.targetId == node.id)
            .toList() ??
        [];

    // Map related concept IDs → names
    final nodeById = {
      for (final n in graph?.nodes ?? <ConceptNode>[]) n.id: n,
    };

    return Scaffold(
      appBar: AppBar(title: Text(node.name)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Description card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 22,
                        backgroundColor:
                            Theme.of(context).colorScheme.primaryContainer,
                        foregroundColor:
                            Theme.of(context).colorScheme.onPrimaryContainer,
                        child: Text(
                          node.name[0].toUpperCase(),
                          style: const TextStyle(
                              fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          node.name,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (node.description != null) ...[
                    const SizedBox(height: 14),
                    Text(
                      node.description!,
                      style: const TextStyle(fontSize: 14, height: 1.5),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Related concepts
          if (edges.isNotEmpty) ...[
            Text(
              'Related Concepts (${edges.length})',
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 15,
              ),
            ),
            const SizedBox(height: 8),
            ...edges.map((edge) {
              final isSource = edge.sourceId == node.id;
              final relatedId =
                  isSource ? edge.targetId : edge.sourceId;
              final related = nodeById[relatedId];
              final label =
                  isSource ? '→ ${edge.relationship}' : '← ${edge.relationship}';

              return Card(
                child: ListTile(
                  leading: const Icon(Icons.hub_outlined),
                  title: Text(related?.name ?? relatedId),
                  subtitle: Text(
                    label,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                  trailing: Text(
                    '${(edge.strength * 100).round()}%',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ),
              );
            }),
          ] else ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'No related concepts found for this concept.',
                  style: TextStyle(color: Colors.grey.shade600),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
