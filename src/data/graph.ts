// FineLynk Scalable Multi-Node Mesh Topology Data (Phase 7)
// Dynamically and deterministically generated from 24 physical node positions.
// Follows Sections 8, 9, 10, 11, and 12 of Phase 7 specification.

import { NETWORK_NODES, NodeData, TOTAL_NODES } from './nodes';

export interface MeshEdge {
  id: string;
  source: number; // Node ID
  target: number; // Node ID
  isCoreEdge?: boolean; // True if connecting two Core intelligent nodes
}

// Configurable maximum communication range per Section 10
export const MESH_LINK_RANGE = 22.0;

/**
 * Deterministically constructs a sparse, distributed, resilient 24-node mesh graph.
 * 
 * Process:
 * 1. Pre-seeds canonical core backbone connections between Core Nodes.
 * 2. Computes pairwise Euclidean distances on the XZ ground plane.
 * 3. Filters candidate links within MESH_LINK_RANGE.
 * 4. Connects each node to its 2–4 nearest geographical neighbors.
 * 5. Validates connected components to guarantee 100% reachability to Command Center (0).
 */
export function buildDeterministicGraph(
  nodes: NodeData[] = NETWORK_NODES,
  maxRange: number = MESH_LINK_RANGE
): MeshEdge[] {
  const edges: MeshEdge[] = [];
  const edgeSet = new Set<string>();

  function addEdge(u: number, v: number, isCore: boolean = false) {
    if (u === v) return;
    const a = Math.min(u, v);
    const b = Math.max(u, v);
    const key = `${a}-${b}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({
        id: `e${a}-${b}`,
        source: a,
        target: b,
        isCoreEdge: isCore,
      });
    }
  }

  // Pre-seed core backbone links (between core nodes within range)
  // Command(0) connects to Relay-11(4) and Relay-15(5)
  addEdge(0, 4, true);
  addEdge(0, 5, true);
  addEdge(4, 6, true);

  // Compute all pairwise Euclidean distances on the XZ ground plane
  const n = nodes.length;
  const distMatrix: { u: number; v: number; dist: number }[] = [];

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const u = nodes[i];
      const v = nodes[j];
      const dx = u.position[0] - v.position[0];
      const dz = u.position[2] - v.position[2];
      const dist = Math.hypot(dx, dz);
      if (dist <= maxRange) {
        distMatrix.push({ u: u.id, v: v.id, dist });
      }
    }
  }

  // Sort candidate links by distance (nearest neighbors first)
  distMatrix.sort((a, b) => a.dist - b.dist);

  // Track degrees to ensure sparsity: target 2-4 neighbors per field node (max 5 for hubs/command)
  const degrees = new Map<number, number>();
  nodes.forEach((node) => degrees.set(node.id, 0));

  edges.forEach((e) => {
    degrees.set(e.source, (degrees.get(e.source) || 0) + 1);
    degrees.set(e.target, (degrees.get(e.target) || 0) + 1);
  });

  // Pass 1: Connect each node to its closest available neighbors within range
  for (const node of nodes) {
    const candidates = distMatrix
      .filter((c) => c.u === node.id || c.v === node.id)
      .slice(0, 3); // 3 closest candidates

    for (const cand of candidates) {
      const u = cand.u;
      const v = cand.v;
      const degU = degrees.get(u) || 0;
      const degV = degrees.get(v) || 0;
      const maxDeg = u === 0 || v === 0 ? 5 : 4;

      if (degU < maxDeg && degV < maxDeg) {
        const isCore = u < 7 && v < 7;
        addEdge(u, v, isCore);
        degrees.set(u, degU + 1);
        degrees.set(v, degV + 1);
      }
    }
  }

  // Pass 2: Connectivity verification and bridging (ensuring reachability to Command 0)
  function getConnectedComponents(): Set<number>[] {
    const adj = new Map<number, number[]>();
    nodes.forEach((nd) => adj.set(nd.id, []));
    edges.forEach((e) => {
      adj.get(e.source)?.push(e.target);
      adj.get(e.target)?.push(e.source);
    });

    const visited = new Set<number>();
    const components: Set<number>[] = [];

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        const comp = new Set<number>();
        const queue = [node.id];
        visited.add(node.id);
        while (queue.length > 0) {
          const cur = queue.shift()!;
          comp.add(cur);
          for (const neighbor of adj.get(cur) || []) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          }
        }
        components.push(comp);
      }
    }
    return components;
  }

  let components = getConnectedComponents();
  while (components.length > 1) {
    // Find the component containing Command Center (0)
    const cmdComp = components.find((c) => c.has(0)) || components[0];
    const otherComps = components.filter((c) => c !== cmdComp);

    let bestDist = Infinity;
    let bestPair: [number, number] | null = null;

    for (const targetComp of otherComps) {
      for (const uId of cmdComp) {
        const u = nodes.find((n) => n.id === uId)!;
        for (const vId of targetComp) {
          const v = nodes.find((n) => n.id === vId)!;
          const dist = Math.hypot(u.position[0] - v.position[0], u.position[2] - v.position[2]);
          if (dist < bestDist) {
            bestDist = dist;
            bestPair = [uId, vId];
          }
        }
      }
    }

    if (bestPair) {
      const isCore = bestPair[0] < 7 && bestPair[1] < 7;
      addEdge(bestPair[0], bestPair[1], isCore);
    } else {
      break;
    }
    components = getConnectedComponents();
  }

  return edges;
}

// Master deterministic export of generated mesh links for the 24-node network
export const MESH_EDGES: MeshEdge[] = buildDeterministicGraph(NETWORK_NODES);

// Helper: build adjacency list for BFS pathfinding
export function buildAdjacencyList(edges: MeshEdge[] = MESH_EDGES): Map<number, number[]> {
  const adj = new Map<number, number[]>();
  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    if (!adj.has(edge.target)) adj.set(edge.target, []);
    adj.get(edge.source)!.push(edge.target);
    adj.get(edge.target)!.push(edge.source);
  }
  return adj;
}

// Helper: Get node neighbors
export function getNodeNeighbors(nodeId: number, edges: MeshEdge[] = MESH_EDGES): number[] {
  const neighbors: number[] = [];
  for (const e of edges) {
    if (e.source === nodeId) neighbors.push(e.target);
    else if (e.target === nodeId) neighbors.push(e.source);
  }
  return neighbors;
}

// Helper: Compute average node degree
export function getAverageNodeDegree(edges: MeshEdge[] = MESH_EDGES, nodeCount: number = TOTAL_NODES): number {
  return (edges.length * 2) / (nodeCount || 1);
}
