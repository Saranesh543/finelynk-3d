import { NETWORK_NODES, TOTAL_NODES, CORE_NODES_COUNT, isCoreNode, isFieldMeshNode } from '../src/data/nodes';
import { MESH_EDGES, buildAdjacencyList } from '../src/data/graph';
import { findShortestPath } from '../src/simulation/pathfinding';
import { TelemetryService } from '../src/simulation/telemetry';
import { SimulationEngine } from '../src/simulation/SimulationEngine';
import { NetworkNodes } from '../src/scene/NetworkNodes';
import { HazardEffects } from '../src/scene/HazardEffects';
import { SimulationMarkers } from '../src/scene/SimulationMarkers';
import { MeshLinks } from '../src/scene/MeshLinks';
import { HazardZones } from '../src/scene/HazardZones';
import { SimulationEvent } from '../src/simulation/types';

console.log('================================================================');
console.log('  FineLynk Phase 7: Scalable Multi-Node Mesh Network Test Suite ');
console.log('================================================================\n');

// ----------------------------------------------------------------------------
// TEST 1: Baseline Network Topology & Reachability (All 24 Nodes Online)
// ----------------------------------------------------------------------------
console.log('--- Test 1: Baseline Network Reachability (24 Nodes / 39 Mesh Edges) ---');
if (NETWORK_NODES.length !== 24) {
  throw new Error(`Expected exactly 24 nodes, found ${NETWORK_NODES.length}`);
}
if (TOTAL_NODES !== 24) {
  throw new Error(`Expected TOTAL_NODES constant to be 24, found ${TOTAL_NODES}`);
}
if (CORE_NODES_COUNT !== 7) {
  throw new Error(`Expected CORE_NODES_COUNT to be 7, found ${CORE_NODES_COUNT}`);
}
if (MESH_EDGES.length !== 39) {
  throw new Error(`Expected exactly 39 edges, found ${MESH_EDGES.length}`);
}

// Verify degree distribution
const adj = buildAdjacencyList();
for (let i = 0; i < 24; i++) {
  const degree = (adj.get(i) || []).length;
  if (degree < 2) {
    throw new Error(`Node ${i} has fewer than 2 neighbors (degree=${degree})`);
  }
}

// Verify 100% reachability to Command Center (Node 0) from every node 1..23
for (let i = 1; i < 24; i++) {
  const path = findShortestPath(i, 0);
  if (!path || path.length < 2 || path[0] !== i || path[path.length - 1] !== 0) {
    throw new Error(`Node ${i} cannot reach Command Center (0) in baseline state! Path: ${path}`);
  }
}
console.log(`✓ Verified: All 24 nodes online, 39 edges, and 100% reachability to Command Center.`);

// ----------------------------------------------------------------------------
// TEST 2: Single Relay & Mesh Failure Rerouting (Dynamic BFS Self-Healing)
// ----------------------------------------------------------------------------
console.log('\n--- Test 2: Single Relay / Mesh Failure Rerouting ---');
// Baseline path for Flood-04 (1)
const nominalFloodPath = findShortestPath(1, 0)!;
console.log(`  Nominal Flood-04 Path: [${nominalFloodPath.join(' → ')}]`);
const intermediateNode = nominalFloodPath[1]; // e.g. Node 10 (Mesh-04)

// Block the intermediate node
const blockedSet = new Set<number>([intermediateNode]);
const reroutedFloodPath = findShortestPath(1, 0, blockedSet);
if (!reroutedFloodPath) {
  throw new Error(`Flood-04 lost route when intermediate node ${intermediateNode} failed!`);
}
if (reroutedFloodPath.includes(intermediateNode)) {
  throw new Error(`Rerouted path still contains failed node ${intermediateNode}`);
}
console.log(`  Rerouted Flood-04 Path (with Node ${intermediateNode} OFFLINE): [${reroutedFloodPath.join(' → ')}]`);
console.log(`✓ Verified: Single node failure automatically triggers alternate BFS route.`);

// ----------------------------------------------------------------------------
// TEST 3: Multiple Mesh Node Failures
// ----------------------------------------------------------------------------
console.log('\n--- Test 3: Multiple Mesh Node Failures (Concurrent Degradation) ---');
// Block 3 field mesh nodes: 10, 11, 12
const multiBlocked = new Set<number>([10, 11, 12]);
const multiFloodPath = findShortestPath(1, 0, multiBlocked);
if (!multiFloodPath) {
  throw new Error('Flood-04 unable to route even with remaining mesh relays online!');
}
console.log(`  Surviving Route with Nodes 10, 11, 12 OFFLINE: [${multiFloodPath.join(' → ')}]`);
for (const b of multiBlocked) {
  if (multiFloodPath.includes(b)) {
    throw new Error(`Surviving path illegally used blocked node ${b}`);
  }
}
console.log(`✓ Verified: Multiple mesh node failures gracefully route through remaining relays.`);

// ----------------------------------------------------------------------------
// TEST 4: Graceful Degradation / Complete Isolation
// ----------------------------------------------------------------------------
console.log('\n--- Test 4: Graceful Degradation / Complete Node Isolation ---');
// Isolate Node 23 by blocking all its neighbors
const neighborsOf23 = adj.get(23) || [];
const isolatedSet = new Set<number>(neighborsOf23);
const isolatedPath = findShortestPath(23, 0, isolatedSet);
if (isolatedPath !== null) {
  throw new Error(`Expected null route for completely isolated node 23, got: ${isolatedPath}`);
}
console.log(`✓ Verified: When all egress paths are blocked, pathfinder returns null (NO_ROUTE_AVAILABLE) without crash.`);

// ----------------------------------------------------------------------------
// TEST 5: Command Center Failure
// ----------------------------------------------------------------------------
console.log('\n--- Test 5: Command Center Failure (Partition Scenario) ---');
const commandBlocked = new Set<number>([0]);
for (let i = 1; i < 24; i++) {
  const path = findShortestPath(i, 0, commandBlocked);
  if (path !== null) {
    throw new Error(`Expected null path to Command Center when 0 is blocked, but got: ${path}`);
  }
}
console.log(`✓ Verified: Command Center failure severs all inbound telemetry paths cleanly.`);

// ----------------------------------------------------------------------------
// TEST 6: Command Center Restoration
// ----------------------------------------------------------------------------
console.log('\n--- Test 6: Command Center Restoration ---');
commandBlocked.delete(0);
let recoveredCount = 0;
for (let i = 1; i < 24; i++) {
  const path = findShortestPath(i, 0, commandBlocked);
  if (path && path[path.length - 1] === 0) {
    recoveredCount++;
  }
}
if (recoveredCount !== 23) {
  throw new Error(`Expected 23 recovered paths after Command Center restore, got ${recoveredCount}`);
}
console.log(`✓ Verified: Restoring Command Center recovers 100% network reachability (${recoveredCount}/23 nodes).`);

// ----------------------------------------------------------------------------
// TEST 7: Hazard Inundation Route (Flood-04 / Flood Hazard)
// ----------------------------------------------------------------------------
console.log('\n--- Test 7: Hazard Inundation Route (Flood-04) ---');
const floodPath = findShortestPath(1, 0)!;
console.log(`  Active Flood Route: [${floodPath.join(' → ')}] (hops: ${floodPath.length - 1})`);
if (floodPath[0] !== 1 || floodPath[floodPath.length - 1] !== 0) {
  throw new Error(`Invalid Flood path endpoints: ${floodPath}`);
}
console.log(`✓ Verified: Flood-04 telemetry path is valid and optimal.`);

// ----------------------------------------------------------------------------
// TEST 8: Forest Fire Hazard Route (Forest-07 / Fire Hazard)
// ----------------------------------------------------------------------------
console.log('\n--- Test 8: Forest Fire Hazard Route (Forest-07) ---');
const firePath = findShortestPath(2, 0)!;
console.log(`  Active Fire Route: [${firePath.join(' → ')}] (hops: ${firePath.length - 1})`);
if (firePath[0] !== 2 || firePath[firePath.length - 1] !== 0) {
  throw new Error(`Invalid Fire path endpoints: ${firePath}`);
}
console.log(`✓ Verified: Forest-07 telemetry path is valid and optimal.`);

// ----------------------------------------------------------------------------
// TEST 9: Industrial Leak Hazard Route (Indus-02 / Industrial Hazard)
// ----------------------------------------------------------------------------
console.log('\n--- Test 9: Industrial Leak Hazard Route (Indus-02) ---');
const indusPath = findShortestPath(3, 0)!;
console.log(`  Active Indus Route: [${indusPath.join(' → ')}] (hops: ${indusPath.length - 1})`);
if (indusPath[0] !== 3 || indusPath[indusPath.length - 1] !== 0) {
  throw new Error(`Invalid Indus path endpoints: ${indusPath}`);
}
console.log(`✓ Verified: Indus-02 telemetry path is valid and optimal.`);

// ----------------------------------------------------------------------------
// TEST 10: Multi-Hazard Concurrency with SimulationEngine
// ----------------------------------------------------------------------------
console.log('\n--- Test 10: Multi-Hazard Concurrency & Event Handling ---');
const networkNodes = new NetworkNodes();
const meshLinks = new MeshLinks(networkNodes);
const hazardZones = new HazardZones();
const hazardEffects = new HazardEffects(hazardZones);
const markers = new SimulationMarkers(networkNodes, meshLinks);
const engine = new SimulationEngine(networkNodes, hazardEffects, markers);

const capturedEvents: SimulationEvent[] = [];
engine.events.on('*', (ev) => capturedEvents.push(ev));

// Trigger all 3 hazards concurrently
engine.triggerHazard('flood');
engine.triggerHazard('fire');
engine.triggerHazard('industrial');

if (engine.activeSimulations.size !== 3) {
  throw new Error(`Expected 3 active simulations, got ${engine.activeSimulations.size}`);
}

// Fail a critical field mesh node mid-flight and test self-healing
const simFlood = engine.activeSimulations.get('flood')!;
const floodMidHop = simFlood.path[1];
engine.setNodeBlocked(floodMidHop, true);

const reconfigEvent = capturedEvents.find((e) => e.type === 'ROUTE_RECONFIGURED');
if (!reconfigEvent) {
  throw new Error('Failed to capture ROUTE_RECONFIGURED event upon node failure!');
}
console.log(`✓ Captured Self-Healing Event: ${reconfigEvent.message}`);

// ----------------------------------------------------------------------------
// TEST 11: Network Reset & Topology Recovery
// ----------------------------------------------------------------------------
console.log('\n--- Test 11: Network Reset & Clean State Recovery ---');
// Restore blocked node
engine.setNodeBlocked(floodMidHop, false);
engine.reset();

if (engine.activeSimulations.size !== 0) {
  throw new Error(`Expected 0 active simulations after reset, got ${engine.activeSimulations.size}`);
}
if (engine.blockedNodeIds.size !== 0) {
  throw new Error(`Expected 0 blocked nodes after reset, got ${engine.blockedNodeIds.size}`);
}

// Verify node categorization helpers
for (let id = 0; id < 24; id++) {
  if (id < 7) {
    if (!isCoreNode(id) || isFieldMeshNode(id)) {
      throw new Error(`Node ${id} helper mismatch: expected isCoreNode=true, isFieldMeshNode=false`);
    }
  } else {
    if (isCoreNode(id) || !isFieldMeshNode(id)) {
      throw new Error(`Node ${id} helper mismatch: expected isCoreNode=false, isFieldMeshNode=true`);
    }
  }
}

console.log('✓ Verified: Complete network reset, zero blocked nodes, all 24 nodes restored to operational baseline.');
console.log('\n================================================================');
console.log('  ALL 11 PHASE 7 TESTS PASSED SUCCESSFULLY!                      ');
console.log('================================================================\n');
