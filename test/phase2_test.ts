import { findShortestPath } from '../src/simulation/pathfinding';
import { MESH_EDGES } from '../src/data/graph';

console.log('=== FineLynk Phase 2 Routing & Simulation Tests ===');

// Test 1: Flood route
const floodPath = findShortestPath(1, 0);
console.log('Test 1 (Flood Path 1 -> 0):', floodPath);
if (JSON.stringify(floodPath) !== JSON.stringify([1, 4, 0])) {
  throw new Error(`Flood path expected [1, 4, 0], got ${JSON.stringify(floodPath)}`);
}

// Test 2: Forest Fire route
const firePath = findShortestPath(2, 0);
console.log('Test 2 (Fire Path 2 -> 0):', firePath);
if (JSON.stringify(firePath) !== JSON.stringify([2, 6, 4, 0])) {
  throw new Error(`Fire path expected [2, 6, 4, 0], got ${JSON.stringify(firePath)}`);
}

// Test 3: Industrial Leak route
const industrialPath = findShortestPath(3, 0);
console.log('Test 3 (Industrial Path 3 -> 0):', industrialPath);
if (JSON.stringify(industrialPath) !== JSON.stringify([3, 5, 0])) {
  throw new Error(`Industrial path expected [3, 5, 0], got ${JSON.stringify(industrialPath)}`);
}

// Test 4: Blocked Node Rerouting (Future-proofing Phase 3)
// If Relay-11 (node 4) is blocked, Flood-04 should reroute via Relay-15 (node 5) -> [1, 5, 0]
const floodAlternativePath = findShortestPath(1, 0, new Set([4]));
console.log('Test 4 (Flood Path when Relay-11 is blocked):', floodAlternativePath);
if (JSON.stringify(floodAlternativePath) !== JSON.stringify([1, 5, 0])) {
  throw new Error(`Alternative Flood path expected [1, 5, 0], got ${JSON.stringify(floodAlternativePath)}`);
}

// If Relay-15 (node 5) is blocked, Industrial should reroute via Relay-19 (6) and Relay-11 (4) -> [3, 6, 4, 0]
const industrialAlternativePath = findShortestPath(3, 0, new Set([5]));
console.log('Test 4b (Industrial Path when Relay-15 is blocked):', industrialAlternativePath);
if (JSON.stringify(industrialAlternativePath) !== JSON.stringify([3, 6, 4, 0])) {
  throw new Error(`Alternative Industrial path expected [3, 6, 4, 0], got ${JSON.stringify(industrialAlternativePath)}`);
}

// Test 5: Verify all path edges exist in MESH_EDGES
function verifyEdges(path: number[]) {
  for (let i = 0; i < path.length - 1; i++) {
    const u = path[i];
    const v = path[i + 1];
    const exists = MESH_EDGES.some(
      (e) => (e.source === u && e.target === v) || (e.source === v && e.target === u)
    );
    if (!exists) throw new Error(`Edge between ${u} and ${v} does not exist in graph!`);
  }
}
verifyEdges(floodPath!);
verifyEdges(firePath!);
verifyEdges(industrialPath!);
verifyEdges(floodAlternativePath!);
verifyEdges(industrialAlternativePath!);
console.log('Test 5: All path edges verified strictly against MESH_EDGES.');

// Test 6: Rescue Route Inversion
const floodRescue = [...floodPath!].reverse();
console.log('Test 6 (Flood Rescue Route):', floodRescue);
if (JSON.stringify(floodRescue) !== JSON.stringify([0, 4, 1])) {
  throw new Error('Flood rescue route must be exact inverse [0, 4, 1]');
}

console.log('=== All Phase 2 Routing & Topology Tests Passed 100% ===');
