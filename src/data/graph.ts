// FineLynk Mesh Topology Data
// Strictly adheres to Section 16 of production specification
// This source of truth will be shared between rendering and future Phase 2 BFS pathfinding.

export interface MeshEdge {
  id: string;
  source: number; // Node ID
  target: number; // Node ID
}

export const MESH_EDGES: MeshEdge[] = [
  { id: 'e0-4', source: 0, target: 4 }, // Command(0) — Relay-11(4)
  { id: 'e0-5', source: 0, target: 5 }, // Command(0) — Relay-15(5)
  { id: 'e4-1', source: 4, target: 1 }, // Relay-11(4) — Flood-04(1)
  { id: 'e4-6', source: 4, target: 6 }, // Relay-11(4) — Relay-19(6)
  { id: 'e5-1', source: 5, target: 1 }, // Relay-15(5) — Flood-04(1)
  { id: 'e6-2', source: 6, target: 2 }, // Relay-19(6) — Forest-07(2)
  { id: 'e6-3', source: 6, target: 3 }, // Relay-19(6) — Indus-02(3)
  { id: 'e5-3', source: 5, target: 3 }, // Relay-15(5) — Indus-02(3)
];

// Helper: build adjacency list for easy traversal in Phase 2
export function buildAdjacencyList(): Map<number, number[]> {
  const adj = new Map<number, number[]>();
  for (const edge of MESH_EDGES) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    if (!adj.has(edge.target)) adj.set(edge.target, []);
    adj.get(edge.source)!.push(edge.target);
    adj.get(edge.target)!.push(edge.source);
  }
  return adj;
}
