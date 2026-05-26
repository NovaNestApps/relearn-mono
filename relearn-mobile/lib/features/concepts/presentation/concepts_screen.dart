import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../data/concepts_repository.dart';

class ConceptsScreen extends ConsumerStatefulWidget {
  /// If [pageId] is provided, only concepts for that page are shown.
  final String? pageId;

  const ConceptsScreen({super.key, this.pageId});

  @override
  ConsumerState<ConceptsScreen> createState() => _ConceptsScreenState();
}

class _ConceptsScreenState extends ConsumerState<ConceptsScreen> {
  ConceptGraph? _graph;
  bool _loading = true;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final repo = ref.read(conceptsRepositoryProvider);
      final graph = widget.pageId != null
          ? await repo.getPageGraph(widget.pageId!)
          : await repo.getGraph();
      if (mounted) setState(() => _graph = graph);
    } catch (_) {
      // leave _graph null — empty state will show
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<ConceptNode> get _filtered {
    final nodes = _graph?.nodes ?? [];
    if (_query.isEmpty) return nodes;
    final lower = _query.toLowerCase();
    return nodes
        .where((n) =>
            n.name.toLowerCase().contains(lower) ||
            (n.description?.toLowerCase().contains(lower) ?? false))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final title =
        widget.pageId != null ? 'Page Concepts' : 'My Knowledge Graph';

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search concepts…',
                prefixIcon: const Icon(Icons.search, size: 20),
                contentPadding:
                    const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                isDense: true,
              ),
              onChanged: (v) => setState(() => _query = v),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _filtered.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Text(
                            _query.isNotEmpty
                                ? 'No concepts match "$_query".'
                                : 'No concepts yet.\nSave a page to extract concepts automatically.',
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: Colors.grey),
                          ),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _filtered.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 6),
                        itemBuilder: (context, i) {
                          final node = _filtered[i];
                          // Count edges involving this node
                          final edgeCount = _graph?.edges
                                  .where((e) =>
                                      e.sourceId == node.id ||
                                      e.targetId == node.id)
                                  .length ??
                              0;
                          return _ConceptTile(
                            node: node,
                            edgeCount: edgeCount,
                            onTap: () => context.push(
                              '/concepts/${node.id}',
                              extra: {
                                'node': node,
                                'graph': _graph,
                              },
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}

class _ConceptTile extends StatelessWidget {
  final ConceptNode node;
  final int edgeCount;
  final VoidCallback onTap;

  const _ConceptTile({
    required this.node,
    required this.edgeCount,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: colorScheme.primaryContainer,
          foregroundColor: colorScheme.onPrimaryContainer,
          child: Text(
            node.name[0].toUpperCase(),
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ),
        title: Text(
          node.name,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: node.description != null
            ? Text(
                node.description!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade600,
                ),
              )
            : null,
        trailing: edgeCount > 0
            ? Chip(
                label: Text(
                  '$edgeCount link${edgeCount != 1 ? 's' : ''}',
                  style: const TextStyle(fontSize: 11),
                ),
                padding: EdgeInsets.zero,
                visualDensity: VisualDensity.compact,
              )
            : null,
        onTap: onTap,
      ),
    );
  }
}
