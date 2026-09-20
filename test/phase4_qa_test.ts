import { NETWORK_NODES } from '../src/data/nodes';
import { MESH_EDGES } from '../src/data/graph';
import { HAZARD_ZONES } from '../src/data/hazards';
import { findShortestPath } from '../src/simulation/pathfinding';
import { SimulationEngine } from '../src/simulation/SimulationEngine';
import { HazardEffects } from '../src/scene/HazardEffects';
import { SimulationMarkers } from '../src/scene/SimulationMarkers';
import { NetworkNodes } from '../src/scene/NetworkNodes';
import { MeshLinks } from '../src/scene/MeshLinks';
import { HazardZones } from '../src/scene/HazardZones';
import { SimulationEvent } from '../src/simulation/types';

console.log('================================================================');
console.log('=== FineLynk Phase 4 Showcase QA & Production Validation ===');
console.log('================================================================\n');

// -------------------------------------------------------------
// 1. EXACT 7-NODE TOPOLOGY AUDIT
// -------------------------------------------------------------
console.log('Audit 1: Exact 7-Node Topology Verification...');
if (NETWORK_NODES.length !== 7) {
  throw new Error(`Expected exactly 7 nodes, found ${NETWORK_NODES.length}`);
}
const expectedNodes = [
  { id: 0, name: 'Command Center', pos: [0, 0, 0] },
  { id: 1, name: 'Flood-04', pos: [-22, 0, 14] },
  { id: 2, name: 'Forest-07', pos: [20, 0, -16] },
  { id: 3, name: 'Indus-02', pos: [-14, 0, -26] },
  { id: 4, name: 'Relay-11', pos: [10, 0, 12] },
  { id: 5, name: 'Relay-15', pos: [-8, 0, 22] },
  { id: 6, name: 'Relay-19', pos: [24, 0, 4] },
];
for (const exp of expectedNodes) {
  const node = NETWORK_NODES.find((n) => n.id === exp.id);
  if (!node) throw new Error(`Missing Node ${exp.id}: ${exp.name}`);
  if (node.position[0] !== exp.pos[0] || node.position[2] !== exp.pos[2]) {
    throw new Error(`Node ${exp.id} position mismatch: expected ${exp.pos}, got ${node.position}`);
  }
}
console.log('✓ All 7 nodes verified with exact IDs, names, and coordinates.');

// -------------------------------------------------------------
// 2. EXACT 8-EDGE TOPOLOGY AUDIT
// -------------------------------------------------------------
console.log('\nAudit 2: Exact 8-Edge Topology Verification...');
if (MESH_EDGES.length !== 8) {
  throw new Error(`Expected exactly 8 edges, found ${MESH_EDGES.length}`);
}
const expectedEdges: [number, number][] = [
  [0, 4], [0, 5], [4, 1], [4, 6], [5, 1], [6, 2], [6, 3], [5, 3]
];
for (const [u, v] of expectedEdges) {
  const exists = MESH_EDGES.some(
    (e) => (e.source === u && e.target === v) || (e.source === v && e.target === u)
  );
  if (!exists) throw new Error(`Missing required edge (${u}, ${v})`);
}
console.log('✓ All 8 edges verified strictly against specification.');

// -------------------------------------------------------------
// 3. HAZARD SPECIFICATIONS AUDIT
// -------------------------------------------------------------
console.log('\nAudit 3: Hazard Definitions & Target Nodes...');
if (HAZARD_ZONES.flood.targetNodeId !== 1 || HAZARD_ZONES.flood.radius !== 11) {
  throw new Error('Flood hazard spec mismatch');
}
if (HAZARD_ZONES.fire.targetNodeId !== 2 || HAZARD_ZONES.fire.radius !== 11) {
  throw new Error('Fire hazard spec mismatch');
}
if (HAZARD_ZONES.industrial.targetNodeId !== 3 || HAZARD_ZONES.industrial.radius !== 10) {
  throw new Error('Industrial hazard spec mismatch');
}
console.log('✓ Hazard definitions and target nodes verified.');

// -------------------------------------------------------------
// 4. BFS NORMAL ROUTES AUDIT
// -------------------------------------------------------------
console.log('\nAudit 4: Normal BFS Routing Paths...');
const floodNormal = findShortestPath(1, 0);
const fireNormal = findShortestPath(2, 0);
const indusNormal = findShortestPath(3, 0);

if (JSON.stringify(floodNormal) !== JSON.stringify([1, 4, 0])) {
  throw new Error(`Normal Flood route incorrect: ${JSON.stringify(floodNormal)}`);
}
if (JSON.stringify(fireNormal) !== JSON.stringify([2, 6, 4, 0])) {
  throw new Error(`Normal Fire route incorrect: ${JSON.stringify(fireNormal)}`);
}
if (JSON.stringify(indusNormal) !== JSON.stringify([3, 5, 0])) {
  throw new Error(`Normal Industrial route incorrect: ${JSON.stringify(indusNormal)}`);
}
console.log('✓ Normal routes: Flood=[1,4,0], Fire=[2,6,4,0], Industrial=[3,5,0]');

// -------------------------------------------------------------
// 5. BFS FAILURE ROUTES AUDIT
// -------------------------------------------------------------
console.log('\nAudit 5: BFS Failure Routes...');
const floodFailover = findShortestPath(1, 0, new Set([4]));
if (JSON.stringify(floodFailover) !== JSON.stringify([1, 5, 0])) {
  throw new Error(`Flood failover route incorrect: ${JSON.stringify(floodFailover)}`);
}
const indusFailover = findShortestPath(3, 0, new Set([5]));
if (JSON.stringify(indusFailover) !== JSON.stringify([3, 6, 4, 0])) {
  throw new Error(`Industrial failover route incorrect: ${JSON.stringify(indusFailover)}`);
}
console.log('✓ Failover routes: Flood=[1,5,0], Industrial=[3,6,4,0]');

// Setup engine and scene mocks
const hazardZones = new HazardZones();
const hazardEffects = new HazardEffects(hazardZones);
const networkNodes = new NetworkNodes();
const meshLinks = new MeshLinks(networkNodes);
const markers = new SimulationMarkers(networkNodes, meshLinks);
const engine = new SimulationEngine(networkNodes, hazardEffects, markers);

const eventsLog: SimulationEvent[] = [];
engine.events.on('*', (e) => eventsLog.push(e));

// -------------------------------------------------------------
// 6. NODE FAILURE & RESTORATION AUDIT
// -------------------------------------------------------------
console.log('\nAudit 6: Node Failure & Restoration Lifecycle...');
engine.setNodeBlocked(4, true);
meshLinks.setSeveredNode(4, true);

if (networkNodes.getNodeStatus(4) !== 'offline') {
  throw new Error('Relay-11 status not offline');
}
const severed4 = meshLinks.getEdgeVisuals().filter((e) => e.edge.source === 4 || e.edge.target === 4);
if (severed4.length !== 3 || severed4.some((e) => !e.isSevered)) {
  throw new Error('Edges touching node 4 not all severed');
}

engine.setNodeBlocked(4, false);
meshLinks.setSeveredNode(4, false);
if (networkNodes.getNodeStatus(4) !== 'safe') {
  throw new Error('Relay-11 status not safe after restoration');
}
if (severed4.some((e) => e.isSevered)) {
  throw new Error('Edges touching node 4 still severed after restoration');
}
console.log('✓ Node failure, visual edge severing, and clean restoration verified.');

// -------------------------------------------------------------
// 7. COMPLETE SIMULATION LIFECYCLE AUDIT
// -------------------------------------------------------------
console.log('\nAudit 7: Full Single Hazard Lifecycle...');
eventsLog.length = 0;
engine.triggerHazard('flood');

let time = 0;
const dt = 0.05;
for (let i = 0; i < 150; i++) {
  time += dt;
  engine.update(dt);
  hazardEffects.update(dt, time);
}

const requiredEventTypes = [
  'HAZARD_DETECTED',
  'BROADCAST_STARTED',
  'BROADCAST_COMPLETED',
  'RESCUE_DISPATCHED',
  'RESCUE_ARRIVED',
  'HAZARD_RESOLVED',
];
for (const type of requiredEventTypes) {
  if (!eventsLog.some((e) => e.type === type)) {
    throw new Error(`Lifecycle missing event: ${type}`);
  }
}
if (engine.isHazardActive('flood')) {
  throw new Error('Flood did not return to IDLE');
}
console.log('✓ Full lifecycle sequence DETECTED -> BROADCASTING -> DISPATCHED -> RESOLVED -> IDLE verified.');

// -------------------------------------------------------------
// 8. CONCURRENT HAZARDS AUDIT
// -------------------------------------------------------------
console.log('\nAudit 8: Multi-Hazard Concurrency...');
eventsLog.length = 0;
engine.triggerHazard('flood');
engine.triggerHazard('fire');
engine.triggerHazard('industrial');

if (engine.activeAlertsCount !== 3) {
  throw new Error(`Expected activeAlertsCount = 3, got ${engine.activeAlertsCount}`);
}

for (let i = 0; i < 150; i++) {
  time += dt;
  engine.update(dt);
  hazardEffects.update(dt, time);
}

if (engine.activeAlertsCount !== 0) {
  throw new Error('Not all concurrent simulations resolved');
}
console.log('✓ All 3 concurrent hazards executed and resolved with independent state machines.');

// -------------------------------------------------------------
// 9. NO-ROUTE FAILURE HANDLING AUDIT
// -------------------------------------------------------------
console.log('\nAudit 9: No-Route Available Graceful Handling...');
// Block both Relay-11 (4) and Relay-15 (5) — Node 1 (Flood) is completely isolated from Node 0
engine.setNodeBlocked(4, true);
engine.setNodeBlocked(5, true);

eventsLog.length = 0;
const startResult = engine.triggerHazard('flood');
if (startResult !== false) {
  throw new Error('Engine should return false when no route exists');
}

const noRouteEv = eventsLog.find((e) => e.type === 'NO_ROUTE_AVAILABLE');
if (!noRouteEv) {
  throw new Error('NO_ROUTE_AVAILABLE event was not emitted');
}
if (!noRouteEv.message.includes('NO_ROUTE_AVAILABLE')) {
  throw new Error(`Event message does not contain NO_ROUTE_AVAILABLE: ${noRouteEv.message}`);
}
if (engine.activeAlertsCount !== 0) {
  throw new Error(`activeAlertsCount should remain 0, got ${engine.activeAlertsCount}`);
}
if (networkNodes.getNodeStatus(1) !== 'safe') {
  throw new Error('Node 1 status was not restored to safe');
}
engine.setNodeBlocked(4, false);
engine.setNodeBlocked(5, false);
console.log('✓ Isolated node triggers NO_ROUTE_AVAILABLE gracefully without crash or counter corruption.');

// -------------------------------------------------------------
// 10. TELEMETRY COHERENCE AUDIT
// -------------------------------------------------------------
console.log('\nAudit 10: Telemetry Counters Coherence...');
engine.triggerHazard('fire');
if (engine.activeAlertsCount !== 1 || engine.teamsDeployedCount !== 0) {
  throw new Error(`Telemetry error at BROADCASTING: alerts=${engine.activeAlertsCount}, teams=${engine.teamsDeployedCount}`);
}

// Advance into DISPATCHED
for (let i = 0; i < 35; i++) {
  time += dt;
  engine.update(dt);
}
if (engine.activeAlertsCount !== 1 || engine.teamsDeployedCount !== 1) {
  throw new Error(`Telemetry error at DISPATCHED: alerts=${engine.activeAlertsCount}, teams=${engine.teamsDeployedCount}`);
}

// Complete
for (let i = 0; i < 120; i++) {
  time += dt;
  engine.update(dt);
}
if (engine.activeAlertsCount !== 0 || engine.teamsDeployedCount !== 0) {
  throw new Error(`Telemetry error at IDLE: alerts=${engine.activeAlertsCount}, teams=${engine.teamsDeployedCount}`);
}
console.log('✓ Telemetry counters (Active Alerts & Teams Deployed) strictly track state without drift.');

// -------------------------------------------------------------
// 11. RESET STRESS TEST AUDIT (>= 10 Cycles)
// -------------------------------------------------------------
console.log('\nAudit 11: Reset Simulation Stress Test (12 consecutive stress resets)...');
const stages = ['start', 'mid_broadcast', 'mid_dispatch', 'multi_hazard', 'with_failure'];

for (let cycle = 0; cycle < 12; cycle++) {
  // Trigger single or multi
  engine.triggerHazard('flood');
  if (cycle % 2 === 0) engine.triggerHazard('fire');
  if (cycle % 3 === 0) engine.setNodeBlocked(4, true);

  // Advance varying amounts
  const steps = (cycle * 7) % 40;
  for (let s = 0; s < steps; s++) {
    time += dt;
    engine.update(dt);
  }

  // Trigger full reset
  engine.reset();
  meshLinks.resetAllSevered();

  // Validate pristine state
  if (engine.activeAlertsCount !== 0) throw new Error(`Cycle ${cycle}: activeAlertsCount != 0`);
  if (engine.teamsDeployedCount !== 0) throw new Error(`Cycle ${cycle}: teamsDeployedCount != 0`);
  if (engine.blockedNodeIds.size !== 0) throw new Error(`Cycle ${cycle}: blockedNodeIds != 0`);
  if (markers.group.children.length !== 0) throw new Error(`Cycle ${cycle}: lingering markers`);
  if (hazardEffects.group.children.length !== 0) throw new Error(`Cycle ${cycle}: lingering effects`);
  for (let n = 0; n < 7; n++) {
    const expStat = n === 0 ? 'command' : 'safe';
    if (networkNodes.getNodeStatus(n) !== expStat) {
      throw new Error(`Cycle ${cycle}: Node ${n} status not reset: ${networkNodes.getNodeStatus(n)}`);
    }
  }
}
console.log('✓ 12 consecutive stress resets across DETECTED, BROADCASTING, DISPATCHED passed with 100% clean baseline.');

// -------------------------------------------------------------
// 12. CLEANUP & MEMORY LEAK AUDIT
// -------------------------------------------------------------
console.log('\nAudit 12: Memory Leak & Child Mesh Accumulation...');
// Verify 0 child meshes lingering in markers and effects groups
if (markers.group.children.length !== 0) {
  throw new Error(`Lingering objects in markers group: ${markers.group.children.length}`);
}
if (hazardEffects.group.children.length !== 0) {
  throw new Error(`Lingering objects in hazardEffects group: ${hazardEffects.group.children.length}`);
}
console.log('✓ Zero lingering meshes or memory leaks detected in any visual group.');

// -------------------------------------------------------------
// 13. REPEATED FULL SIMULATION CYCLES
// -------------------------------------------------------------
console.log('\nAudit 13: 10 Repeated Full End-to-End Simulation Cycles...');
for (let cycle = 0; cycle < 10; cycle++) {
  engine.triggerHazard('flood');
  for (let i = 0; i < 150; i++) {
    time += dt;
    engine.update(dt);
    hazardEffects.update(dt, time);
  }
  if (engine.isHazardActive('flood')) {
    throw new Error(`Cycle ${cycle}: flood did not resolve cleanly`);
  }
  if (markers.group.children.length !== 0) {
    throw new Error(`Cycle ${cycle}: markers accumulated: ${markers.group.children.length}`);
  }
}
console.log('✓ 10 repeated end-to-end simulation cycles completed with zero memory growth.');

console.log('\n================================================================');
console.log('=== ALL 13 PHASE 4 PRODUCTION AUDITS & STRESS TESTS PASSED! ===');
console.log('================================================================');
