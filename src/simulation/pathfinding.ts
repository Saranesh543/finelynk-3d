import { buildAdjacencyList, MESH_EDGES } from '../data/graph';

/**
 * Validates that every edge in the constructed path exists in the official mesh topology.
 */
function validatePathEdges(path: number[]): boolean {
  if (path.length < 2) return true;

  for (let i = 0; i < path.length - 1; i++) {
    const u = path[i];
    const v = path[i + 1];
    const exists = MESH_EDGES.some(
      (e) => (e.source === u && e.target === v) || (e.source === v && e.target === u)
    );
    if (!exists) return false;
  }
  return true;
}

/**
 * Deterministic Breadth-First Search (BFS) pathfinder.
 * Finds the shortest path from startNodeId to targetNodeId through the network graph.
 * 
 * @param startNodeId The origin node ID (e.g. hazard node)
 * @param targetNodeId The destination node ID (Command Center = 0)
 * @param blockedNodeIds Optional set of offline/failed node IDs to avoid (for Phase 3)
 * @returns Array of node IDs representing the ordered path, or null if no route exists
 */
export function findShortestPath(
  startNodeId: number,
  targetNodeId: number,
  blockedNodeIds: Set<number> = new Set()
): number[] | null {
  // Guard: if start or target is blocked
  if (blockedNodeIds.has(startNodeId) || blockedNodeIds.has(targetNodeId)) {
    return null;
  }

  // Guard: trivial zero-length path
  if (startNodeId === targetNodeId) {
    return [startNodeId];
  }

  const adj = buildAdjacencyList();
  const queue: number[] = [startNodeId];
  const visited = new Set<number>([startNodeId]);
  const parent = new Map<number, number>();

  let found = false;

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === targetNodeId) {
      found = true;
      break;
    }

    const neighbors = adj.get(current) || [];
    // Sort neighbors deterministically to guarantee reproducible shortest routes
    const sortedNeighbors = [...neighbors].sort((a, b) => a - b);

    for (const neighbor of sortedNeighbors) {
      if (!visited.has(neighbor) && !blockedNodeIds.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }

  if (!found) {
    return null;
  }

  // Reconstruct path backwards from target to start
  const path: number[] = [];
  let curr: number | undefined = targetNodeId;
  while (curr !== undefined) {
    path.push(curr);
    curr = parent.get(curr);
  }
  path.reverse();

  // Rigorous topology validation
  if (!validatePathEdges(path)) {
    console.error('BFS computed an invalid path with non-existent edges:', path);
    return null;
  }

  return path;
}
