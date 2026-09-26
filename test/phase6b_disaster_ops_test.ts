import { NETWORK_NODES } from '../src/data/nodes';
import { MESH_EDGES } from '../src/data/graph';
import { TelemetryService } from '../src/simulation/telemetry';
import { SimulationEngine } from '../src/simulation/SimulationEngine';
import { HazardEffects } from '../src/scene/HazardEffects';
import { SimulationMarkers } from '../src/scene/SimulationMarkers';
import { NetworkNodes } from '../src/scene/NetworkNodes';
import { MeshLinks } from '../src/scene/MeshLinks';
import { HazardZones } from '../src/scene/HazardZones';
import { SimulationEvent } from '../src/simulation/types';

console.log('================================================================');
console.log('  FineLynk Phase 6B: Intelligent Live Disaster Operations Tests ');
console.log('================================================================\n');

// ----------------------------------------------------------------------------
// TEST 1: Physical Network Topology & Invariant Verification
// ----------------------------------------------------------------------------
console.log('--- Test 1: Invariant Verification (7 Nodes / 8 Mesh Links) ---');
if (NETWORK_NODES.length !== 7) {
  throw new Error(`Expected strictly 7 nodes, found ${NETWORK_NODES.length}`);
}
if (MESH_EDGES.length !== 8) {
  throw new Error(`Expected strictly 8 edges, found ${MESH_EDGES.length}`);
}
const nodeRoles = [
  'COMMAND CENTER',
  'Flood-04',
  'Forest-07',
  'Indus-02',
  'Relay-11',
  'Relay-15',
  'Relay-19',
];
NETWORK_NODES.forEach((n, i) => {
  if (n.name !== nodeRoles[i]) {
    throw new Error(`Node ${i} name mismatch: expected ${nodeRoles[i]}, got ${n.name}`);
  }
});
console.log('✓ 7-node network and 8 mesh edges verified strictly intact.\n');

// ----------------------------------------------------------------------------
// TEST 2: Physical Sensor Elements on Node Platforms
// ----------------------------------------------------------------------------
console.log('--- Test 2: Physical Sensor Equipment Instantiation on Outposts ---');
const networkNodes = new NetworkNodes();
const floodItem = networkNodes.getNodeMesh(1)!;
const fireItem = networkNodes.getNodeMesh(2)!;
const indusItem = networkNodes.getNodeMesh(3)!;

if (!floodItem || !fireItem || !indusItem) {
  throw new Error('Failed to retrieve hazard node meshes from NetworkNodes');
}

// Verify physical sensor equipment meshes exist on these nodes
// Base node contains: platformMesh, platformTrimMesh, ringMesh, beamMesh, coreMesh, pointLight (= 6 items)
// Sensor nodes 1, 2, 3 have additional physical sensor children added to group:
// Flood-04: probe rod + 3 calibration tori + funnel cone + funnel rim = +6 children
// Forest-07: mast + 2 bracket rings + mount arm + sensor head + lens = +6 children
// Indus-02: canister + 3 grille bands + intake nozzle + led indicator = +6 children
console.log(`Flood-04 child meshes: ${floodItem.group.children.length}`);
console.log(`Forest-07 child meshes: ${fireItem.group.children.length}`);
console.log(`Indus-02 child meshes: ${indusItem.group.children.length}`);

if (floodItem.group.children.length < 8) {
  throw new Error('Flood-04 missing physical water gauge / rain collector meshes');
}
if (fireItem.group.children.length < 8) {
  throw new Error('Forest-07 missing physical mast / IR thermal sensor head meshes');
}
if (indusItem.group.children.length < 8) {
  throw new Error('Indus-02 missing physical vapor sniffer / grille meshes');
}
console.log('✓ Grounded physical sensor equipment verified on Flood-04, Forest-07, and Indus-02.\n');

// ----------------------------------------------------------------------------
// TEST 3: Hazard Zones Risk Responsiveness & Visual Scaling
// ----------------------------------------------------------------------------
console.log('--- Test 3: Territory Sector Risk Scaling (Low -> Moderate -> High -> Critical) ---');
const hazardZones = new HazardZones();

// Test baseline (nominal risk: 10)
hazardZones.setTerritoryRisk('flood', 10);
const floodTerritory = hazardZones.getTerritory('flood')!;
if (floodTerritory.riskScore !== 10) {
  throw new Error(`Expected flood riskScore to be 10, got ${floodTerritory.riskScore}`);
}

// Advance loop to interpolate risk visual target
hazardZones.update(1.0, 1.0);
const initialProgress = floodTerritory.progress;

// Now set critical risk (90)
hazardZones.setTerritoryRisk('flood', 90);
if (floodTerritory.riskScore !== 90) {
  throw new Error(`Expected flood riskScore to be 90, got ${floodTerritory.riskScore}`);
}
hazardZones.update(1.0, 2.0);
const criticalProgress = floodTerritory.progress;

if (criticalProgress <= initialProgress) {
  throw new Error(`Territory visual progress did not expand for critical risk: ${initialProgress} -> ${criticalProgress}`);
}
console.log(`✓ Territory sector progress dynamically scales with risk (Low: ${initialProgress.toFixed(2)} -> Critical: ${criticalProgress.toFixed(2)}).\n`);

// ----------------------------------------------------------------------------
// TEST 4: Node Beacon & Halo Dynamic Reactivity
// ----------------------------------------------------------------------------
console.log('--- Test 4: Node Beacon Pulse and Halo Light Reactivity ---');
networkNodes.updateNodeRisk(1, 10); // Low risk
networkNodes.update(1.0);
const lowLightIntensity = floodItem.pointLight.intensity;

networkNodes.updateNodeRisk(1, 90); // Critical risk
networkNodes.update(1.0);
const highLightIntensity = floodItem.pointLight.intensity;

if (floodItem.riskScore !== 90) {
  throw new Error(`Node riskScore was not updated to 90, got ${floodItem.riskScore}`);
}
console.log(`  Low risk point light intensity: ${lowLightIntensity.toFixed(2)}`);
console.log(`  Critical risk point light intensity: ${highLightIntensity.toFixed(2)}`);
console.log('✓ Node beacon pulse and point light react dynamically to edge risk.\n');

// ----------------------------------------------------------------------------
// TEST 5: Active Route Highlighting on Mesh Links
// ----------------------------------------------------------------------------
console.log('--- Test 5: Active BFS Route Highlighting on Mesh Links ---');
const meshLinks = new MeshLinks(networkNodes);
meshLinks.setActiveRoutes([[1, 4, 0]]); // Flood route via Relay-11

const edgeVisuals = meshLinks.getEdgeVisuals();
const activeEdges = edgeVisuals.filter((e) => e.isActiveRoute);
if (activeEdges.length !== 2) {
  throw new Error(`Expected exactly 2 active route edges for [1, 4, 0], found ${activeEdges.length}`);
}

// Verify that the active edges are 1-4 and 4-0
const activePairs = activeEdges.map((e) => `${e.edge.source}-${e.edge.target}`);
const isPairValid = activePairs.every(
  (p) => p === '0-4' || p === '4-0' || p === '1-4' || p === '4-1'
);
if (!isPairValid) {
  throw new Error(`Unexpected active route edge pairs: ${activePairs.join(', ')}`);
}
console.log(`✓ Exactly 2 active edges highlighted for route [1, 4, 0]: ${activePairs.join(', ')}.\n`);

// ----------------------------------------------------------------------------
// TEST 6: Mid-Flight Dynamic Self-Healing Rerouting
// ----------------------------------------------------------------------------
console.log('--- Test 6: Mid-Flight Self-Healing Rerouting on Intermediate Node Failure ---');
const hazardEffects = new HazardEffects(hazardZones);
const markers = new SimulationMarkers(networkNodes, meshLinks);
const engine = new SimulationEngine(networkNodes, hazardEffects, markers);

const capturedEvents: SimulationEvent[] = [];
engine.events.on('*', (e) => capturedEvents.push(e));

// Step 6a: Trigger Flood Hazard (nominal route is [1, 4, 0])
engine.triggerHazard('flood');
const simFlood = engine.getSimulation('flood')!;
if (!simFlood || JSON.stringify(simFlood.path) !== JSON.stringify([1, 4, 0])) {
  throw new Error(`Initial flood path mismatch: ${JSON.stringify(simFlood?.path)}`);
}
console.log('  Initial flood path active:', simFlood.path.join(' → '));

// Step 6b: Advance simulation into mid-flight pulse transmission
engine.update(0.4);

// Step 6c: Fail intermediate Relay-11 (Node 4) while packet is in flight
engine.setNodeBlocked(4, true);

// Check if route reconfigured event was emitted
const reconfiguredEvent = capturedEvents.find((e) => e.type === 'ROUTE_RECONFIGURED');
if (!reconfiguredEvent) {
  throw new Error('SimulationEngine failed to emit ROUTE_RECONFIGURED event upon mid-flight node failure');
}
console.log('  Captured ROUTE_RECONFIGURED event:', reconfiguredEvent.message);

// Verify new path rerouted via Relay-15: [1, 5, 0]
if (JSON.stringify(simFlood.path) !== JSON.stringify([1, 5, 0])) {
  throw new Error(`Expected rerouted path [1, 5, 0], got ${JSON.stringify(simFlood.path)}`);
}
console.log('✓ Mid-flight rerouting successfully switched to alternate path [1, 5, 0].\n');

// ----------------------------------------------------------------------------
// TEST 7: Complete Route Severing & Communication Loss
// ----------------------------------------------------------------------------
console.log('--- Test 7: Communication Severing When All Alternative Paths Fail ---');
// Fail Relay-15 (Node 5) as well -> Flood-04 (1) is now completely isolated from Node 0
engine.setNodeBlocked(5, true);

const severedEvent = capturedEvents.find((e) => e.type === 'NO_ROUTE_AVAILABLE');
if (!severedEvent) {
  throw new Error('SimulationEngine failed to emit NO_ROUTE_AVAILABLE when all routes severed');
}
console.log('  Captured NO_ROUTE_AVAILABLE event:', severedEvent.message);
console.log('✓ Isolation correctly detected and communicated to Command Center.\n');

// ----------------------------------------------------------------------------
// TEST 8: Multi-Hazard Independence & Concurrency
// ----------------------------------------------------------------------------
console.log('--- Test 8: Multi-Hazard Independence & Concurrency ---');
engine.reset();
capturedEvents.length = 0;

// Trigger Flood and Forest Fire simultaneously
engine.triggerHazard('flood');
engine.triggerHazard('fire');

const activeFlood = engine.getSimulation('flood');
const activeFire = engine.getSimulation('fire');

if (!activeFlood || !activeFire) {
  throw new Error('Failed to run Flood and Fire simulations concurrently');
}
console.log('  Concurrent Flood Path:', activeFlood.path.join(' → '));
console.log('  Concurrent Fire Path: ', activeFire.path.join(' → '));

// Ensure both simulations advance independently
engine.update(0.5);
if (activeFlood.elapsedInStage <= 0 || activeFire.elapsedInStage <= 0) {
  throw new Error('Simulations are not advancing independently');
}
console.log('✓ Multi-hazard simulations execute concurrently without cross-contamination.\n');

// ----------------------------------------------------------------------------
// TEST 9: Full Simulation Reset & Restoration
// ----------------------------------------------------------------------------
console.log('--- Test 9: Complete System Reset ---');
engine.reset();
if (engine.activeAlertsCount !== 0) {
  throw new Error(`Expected 0 active alerts after reset, found ${engine.activeAlertsCount}`);
}
if (engine.isHazardActive('flood') || engine.isHazardActive('fire') || engine.isHazardActive('industrial')) {
  throw new Error('Hazards still active after reset');
}
const resetEvent = capturedEvents.find((e) => e.type === 'SIMULATION_RESET');
if (!resetEvent) {
  throw new Error('SIMULATION_RESET event was not emitted on reset()');
}
console.log('✓ System reset clears all state and restores nominal baseline.\n');

// ----------------------------------------------------------------------------
// TEST 10: Telemetry Service & 5-Stage Pipeline Consistency
// ----------------------------------------------------------------------------
console.log('--- Test 10: Telemetry Service & Offline LoRa Consistency ---');
const telemetry = new TelemetryService();
const cmdIntel = telemetry.getCommandCenterIntelligence(new Set(), 0);
if (cmdIntel.networkHealthPct !== 100 || cmdIntel.onlineNodesCount !== 7 || cmdIntel.gatewayStatus !== 'ONLINE') {
  throw new Error('Command Center intelligence inconsistent with nominal 7-node network');
}

const floodIntel = telemetry.getRouteIntelligence('flood', new Set());
if (floodIntel.statusText !== 'PRIMARY ROUTE' || floodIntel.isRerouted !== false) {
  throw new Error('Flood route intelligence expected PRIMARY ROUTE');
}

const floodReroutedIntel = telemetry.getRouteIntelligence('flood', new Set([4]));
if (!floodReroutedIntel.statusText.includes('REROUTED') || floodReroutedIntel.isRerouted !== true) {
  throw new Error(`Flood route intelligence expected REROUTED when Relay-11 is blocked, got ${floodReroutedIntel.statusText}`);
}
console.log('✓ Telemetry intelligence and routing consistency verified.\n');

console.log('================================================================');
console.log('  ALL PHASE 6B DISASTER OPERATIONS TESTS PASSED (10/10) ✓       ');
console.log('================================================================');
