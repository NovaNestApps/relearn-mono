import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/api_endpoints.dart';
import '../../../core/network/api_client.dart';

final conceptsRepositoryProvider = Provider<ConceptsRepository>((ref) {
  return ConceptsRepository(ref.watch(dioProvider));
});

class ConceptNode {
  final String id;
  final String name;
  final String? description;
  final String createdAt;

  const ConceptNode({
    required this.id,
    required this.name,
    this.description,
    required this.createdAt,
  });

  factory ConceptNode.fromJson(Map<String, dynamic> json) => ConceptNode(
        id: json['id'] as String,
        name: json['name'] as String,
        description: json['description'] as String?,
        createdAt: json['createdAt'] as String? ?? '',
      );
}

class ConceptEdge {
  final String id;
  final String sourceId;
  final String targetId;
  final String relationship;
  final double strength;

  const ConceptEdge({
    required this.id,
    required this.sourceId,
    required this.targetId,
    required this.relationship,
    required this.strength,
  });

  factory ConceptEdge.fromJson(Map<String, dynamic> json) => ConceptEdge(
        id: json['id'] as String,
        sourceId: json['sourceId'] as String,
        targetId: json['targetId'] as String,
        relationship: json['relationship'] as String? ?? 'related',
        strength: (json['strength'] as num?)?.toDouble() ?? 0.5,
      );
}

class ConceptGraph {
  final List<ConceptNode> nodes;
  final List<ConceptEdge> edges;

  const ConceptGraph({required this.nodes, required this.edges});
}

class ConceptsRepository {
  final Dio dio;
  ConceptsRepository(this.dio);

  Future<ConceptGraph> getGraph() async {
    final res = await dio.get(ApiEndpoints.graph);
    return _parseGraph(res.data);
  }

  Future<ConceptGraph> getPageGraph(String pageId) async {
    final res = await dio.get(ApiEndpoints.pageGraph(pageId));
    return _parseGraph(res.data);
  }

  ConceptGraph _parseGraph(dynamic data) {
    final map = (data as Map).cast<String, dynamic>();
    final nodes = (map['nodes'] as List? ?? [])
        .whereType<Map>()
        .map((e) => ConceptNode.fromJson(e.cast<String, dynamic>()))
        .toList();
    final edges = (map['edges'] as List? ?? [])
        .whereType<Map>()
        .map((e) => ConceptEdge.fromJson(e.cast<String, dynamic>()))
        .toList();
    return ConceptGraph(nodes: nodes, edges: edges);
  }
}
