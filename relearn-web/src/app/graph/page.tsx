'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAuth } from '@/hooks/useAuth';
import { GraphApi } from '@/hooks/useApi';
import type { GraphNode, GraphEdge } from '@/types';
import { routes } from '@/lib/routes';

// Layout: simple grid positioning for nodes
function layoutNodes(graphNodes: GraphNode[]): Node[] {
  const cols = Math.max(1, Math.ceil(Math.sqrt(graphNodes.length)));
  return graphNodes.map((n, i) => ({
    id: n.id,
    position: {
      x: (i % cols) * 220 + 60,
      y: Math.floor(i / cols) * 140 + 60,
    },
    data: { label: n.name, description: n.description },
    style: {
      background: '#6366f1',
      color: '#fff',
      borderRadius: 8,
      padding: '8px 14px',
      fontSize: 13,
      fontWeight: 600,
      border: '2px solid #4f46e5',
      maxWidth: 180,
    },
  }));
}

function toFlowEdges(graphEdges: GraphEdge[]): Edge[] {
  return graphEdges.map((e) => ({
    id: e.id,
    source: e.sourceId,
    target: e.targetId,
    label: e.relationship,
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
    style: { stroke: '#8b5cf6', strokeWidth: 1.5 },
    labelStyle: { fontSize: 10, fill: '#6b7280' },
  }));
}

export default function GraphPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageId = searchParams.get('pageId');

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<{ name: string; description: string | null } | null>(null);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = pageId
        ? await GraphApi.getPageGraph(pageId)
        : await GraphApi.getGraph();
      setNodes(layoutNodes(data.nodes));
      setEdges(toFlowEdges(data.edges));
    } catch {
      setError('Failed to load concept graph.');
    } finally {
      setLoading(false);
    }
  }, [pageId, setNodes, setEdges]);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.push(routes.login);
      return;
    }
    loadGraph();
  }, [ready, user, router, loadGraph]);

  if (!ready) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!user) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div>
          <h1 className="text-xl font-bold text-white">
            {pageId ? 'Page Concept Graph' : 'My Knowledge Graph'}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {pageId ? 'Concepts extracted from this page' : 'All concepts across your saved pages'}
          </p>
        </div>
        <div className="flex gap-3">
          {pageId && (
            <button
              onClick={() => router.push(routes.graph)}
              className="px-4 py-2 rounded-lg text-sm text-indigo-300 border border-indigo-700 hover:bg-indigo-900 transition"
            >
              Full Graph
            </button>
          )}
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg text-sm text-gray-300 border border-gray-700 hover:bg-gray-800 transition"
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Graph canvas */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-950/80">
            <span className="text-gray-400 animate-pulse">Building graph…</span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-red-400 text-center">
              <p>{error}</p>
              <button
                onClick={loadGraph}
                className="mt-3 px-4 py-2 bg-indigo-600 rounded-lg text-white text-sm hover:bg-indigo-700 transition"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        {!loading && !error && nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
            No concepts yet — save a page to extract concepts automatically.
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_evt, node) =>
            setSelectedNode({ name: node.data.label as string, description: node.data.description as string | null })
          }
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#374151" gap={20} />
          <Controls className="!bg-gray-800 !border-gray-700 !text-white" />
          <MiniMap
            nodeColor="#6366f1"
            maskColor="rgba(0,0,0,0.6)"
            className="!bg-gray-900 !border-gray-700"
          />
        </ReactFlow>
      </div>

      {/* Node detail drawer */}
      {selectedNode && (
        <div className="border-t border-gray-800 px-6 py-4 bg-gray-900 flex items-start gap-4">
          <div className="flex-1">
            <p className="font-semibold text-white">{selectedNode.name}</p>
            <p className="text-sm text-gray-400 mt-1">
              {selectedNode.description ?? 'No description available.'}
            </p>
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="text-gray-500 hover:text-gray-300 text-xl leading-none"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
