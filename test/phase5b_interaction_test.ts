import { SimulationEngine } from '../src/simulation/SimulationEngine';
import { HazardEffects } from '../src/scene/HazardEffects';
import { SimulationMarkers } from '../src/scene/SimulationMarkers';
import { NetworkNodes } from '../src/scene/NetworkNodes';
import { MeshLinks } from '../src/scene/MeshLinks';
import { HazardZones } from '../src/scene/HazardZones';
import { findShortestPath } from '../src/simulation/pathfinding';
import { NETWORK_NODES } from '../src/data/nodes';

console.log('=== FineLynk Phase 5B Interactive Network & Universal Node Failure Tests ===');

// Setup mock scene dependencies
const hazardZones = new HazardZones();
const hazardEffects = new HazardEffects(hazardZones);
const networkNodes = new NetworkNodes();
const meshLinks = new MeshLinks(networkNodes);
const markers = new SimulationMarkers(networkNodes, meshLinks);
const engine = new SimulationEngine(networkNodes, hazardEffects, markers);

const eventsEmitted: { type: string; hazardType?: string; message: string; nodeId?: number }[] = [];
engine.events.on('*', (e) => {
  eventsEmitted.push({ type: e.type, hazardType: e.hazardType, message: e.message, nodeId: e.nodeId });
});

// ----------------------------------------------------------------------------
// TEST 1: Universal Node Failure across all 7 Nodes (0 through 6)
// ----------------------------------------------------------------------------
console.log('\n[TEST 1] Testing universal node failure and restoration across all 7 nodes...');
for (const node of NETWORK_NODES) {
  eventsEmitted.length = 0;
  // Fail node
  engine.setNodeBlocked(node.id, true);
  if (!engine.blockedNodeIds.has(node.id)) {
    throw new Error(`Node ${node.id} (${node.name}) was not added to blockedNodeIds!`);
  }
  if (networkNodes.getNodeStatus(node.id) !== 'offline') {
    throw new Error(`Node ${node.id} visual status is not offline!`);
  }
  const failEvent = eventsEmitted.find((e) => e.type === 'NODE_FAILED' && e.nodeId === node.id);
  if (!failEvent || !failEvent.message.includes(node.name)) {
    throw new Error(`NODE_FAILED event missing or lacks dynamic node name for ${node.name}!`);
  }

  // Restore node
  eventsEmitted.length = 0;
  engine.setNodeBlocked(node.id, false);
  if (engine.blockedNodeIds.has(node.id)) {
    throw new Error(`Node ${node.id} was not removed from blockedNodeIds!`);
  }
  const expectedStatus = node.isCommandCenter ? 'command' : 'safe';
  if (networkNodes.getNodeStatus(node.id) !== expectedStatus) {
    throw new Error(`Node ${node.id} visual status did not restore to ${expectedStatus}!`);
  }
  const restoreEvent = eventsEmitted.find((e) => e.type === 'NODE_RESTORED' && e.nodeId === node.id);
  if (!restoreEvent || !restoreEvent.message.includes(node.name)) {
    throw new Error(`NODE_RESTORED event missing or lacks dynamic node name for ${node.name}!`);
  }
}
console.log('✓ All 7 nodes successfully failed and restored dynamically.');

// ----------------------------------------------------------------------------
// TEST 2: MeshLinks Multi-Node Severing and Coherent Recovery
// ----------------------------------------------------------------------------
console.log('\n[TEST 2] Testing MeshLinks multi-node severed logic...');
// Relay-11 (id 4) connects to Command (0), Flood-04 (1), Relay-19 (6)
meshLinks.resetAllSevered();
meshLinks.setSeveredNode(4, true); // sever Relay-11
meshLinks.setSeveredNode(6, true); // sever Relay-19
// Edge (4, 6) has BOTH endpoints severed
if (!meshLinks.isEdgeSevered(4, 6)) {
  throw new Error('Edge (4, 6) should be severed when both endpoints are offline!');
}
// Unsever Relay-11, but Relay-19 is STILL severed!
meshLinks.setSeveredNode(4, false);
// Edge (4, 6) MUST REMAIN SEVERED because node 6 is still offline
if (!meshLinks.isEdgeSevered(4, 6)) {
  throw new Error('Edge (4, 6) should remain severed while Node 6 is still offline!');
}
// Edge (4, 0) should now be unsevered because both 4 and 0 are online
if (meshLinks.isEdgeSevered(4, 0)) {
  throw new Error('Edge (4, 0) should be restored now that both 4 and 0 are online!');
}
// Finally restore Node 6
meshLinks.setSeveredNode(6, false);
if (meshLinks.isEdgeSevered(4, 6)) {
  throw new Error('Edge (4, 6) should be restored now that both 4 and 6 are online!');
}
console.log('✓ Multi-node edge severing and recovery logic verified.');

// ----------------------------------------------------------------------------
// TEST 3: Matrix Tests (Tests 1–9 from Specification)
// ----------------------------------------------------------------------------
console.log('\n[TEST 3] Running Full Hazard + Failure Matrix Tests...');

// Test 3.1: Relay-11 OFFLINE -> Flood (Should route via Relay-15)
engine.reset();
meshLinks.resetAllSevered();
engine.setNodeBlocked(4, true); // Relay-11 offline
const pathFlood = findShortestPath(1, 0, engine.blockedNodeIds);
if (!pathFlood || pathFlood.includes(4)) {
  throw new Error(`Flood path should route around Relay-11: got ${pathFlood}`);
}
console.log('✓ Test 3.1: Relay-11 OFFLINE -> Flood routes dynamically via alternate path:', pathFlood.join(' → '));

// Test 3.2: Relay-15 OFFLINE -> Industrial (Indus-02 [3] routes around 15)
engine.reset();
meshLinks.resetAllSevered();
engine.setNodeBlocked(5, true); // Relay-15 offline
const pathIndus = findShortestPath(3, 0, engine.blockedNodeIds);
if (!pathIndus || pathIndus.includes(5)) {
  throw new Error(`Industrial path should route around Relay-15: got ${pathIndus}`);
}
console.log('✓ Test 3.2: Relay-15 OFFLINE -> Industrial routes dynamically:', pathIndus.join(' → '));

// Test 3.3: Relay-19 OFFLINE -> Fire (Relay-19 is sole uplink for Forest-07, so NO_ROUTE_AVAILABLE is expected)
engine.reset();
eventsEmitted.length = 0;
meshLinks.resetAllSevered();
engine.setNodeBlocked(6, true); // Relay-19 offline
const fireWithRelay19Offline = engine.triggerHazard('fire');
if (fireWithRelay19Offline) {
  throw new Error('Fire should not start when sole uplink Relay-19 is offline!');
}
const noRouteFire19 = eventsEmitted.find((e) => e.type === 'NO_ROUTE_AVAILABLE' && e.hazardType === 'fire');
if (!noRouteFire19) {
  throw new Error('NO_ROUTE_AVAILABLE expected for Fire when Relay-19 is offline!');
}
console.log('✓ Test 3.3: Relay-19 OFFLINE -> Fire correctly reports NO_ROUTE_AVAILABLE (sole uplink offline).');

// Test 3.4: Flood-04 OFFLINE -> Flood Trigger
engine.reset();
eventsEmitted.length = 0;
engine.setNodeBlocked(1, true); // Flood-04 offline
const floodStarted = engine.triggerHazard('flood');
if (floodStarted) {
  throw new Error('Flood should not start when Flood-04 is offline!');
}
const noRouteFlood = eventsEmitted.find((e) => e.type === 'NO_ROUTE_AVAILABLE' && e.hazardType === 'flood');
if (!noRouteFlood || !noRouteFlood.message.includes('OFFLINE')) {
  throw new Error('NO_ROUTE_AVAILABLE event not emitted with OFFLINE message!');
}
console.log('✓ Test 3.4: Flood-04 OFFLINE -> Honest NO_ROUTE_AVAILABLE reported.');

// Test 3.5: Forest-07 OFFLINE -> Fire Trigger
engine.reset();
eventsEmitted.length = 0;
engine.setNodeBlocked(2, true); // Forest-07 offline
const fireStarted = engine.triggerHazard('fire');
if (fireStarted) {
  throw new Error('Fire should not start when Forest-07 is offline!');
}
const noRouteFire = eventsEmitted.find((e) => e.type === 'NO_ROUTE_AVAILABLE' && e.hazardType === 'fire');
if (!noRouteFire) throw new Error('NO_ROUTE_AVAILABLE expected for offline Forest-07');
console.log('✓ Test 3.5: Forest-07 OFFLINE -> Honest NO_ROUTE_AVAILABLE reported.');

// Test 3.6: Indus-02 OFFLINE -> Industrial Trigger
engine.reset();
eventsEmitted.length = 0;
engine.setNodeBlocked(3, true); // Indus-02 offline
const indusStarted = engine.triggerHazard('industrial');
if (indusStarted) {
  throw new Error('Industrial should not start when Indus-02 is offline!');
}
const noRouteIndus = eventsEmitted.find((e) => e.type === 'NO_ROUTE_AVAILABLE' && e.hazardType === 'industrial');
if (!noRouteIndus) throw new Error('NO_ROUTE_AVAILABLE expected for offline Indus-02');
console.log('✓ Test 3.6: Indus-02 OFFLINE -> Honest NO_ROUTE_AVAILABLE reported.');

// Test 3.7: Relay-11 + Relay-15 OFFLINE -> Flood (All paths to Flood-04 blocked)
engine.reset();
eventsEmitted.length = 0;
engine.setNodeBlocked(4, true); // Relay-11 offline
engine.setNodeBlocked(5, true); // Relay-15 offline
const floodMultiBlocked = engine.triggerHazard('flood');
if (floodMultiBlocked) {
  throw new Error('Flood should fail when all connected relays are offline!');
}
const noRouteMulti = eventsEmitted.find((e) => e.type === 'NO_ROUTE_AVAILABLE' && e.hazardType === 'flood');
if (!noRouteMulti) throw new Error('NO_ROUTE_AVAILABLE expected for completely severed Flood node');
console.log('✓ Test 3.7: Relay-11 + Relay-15 OFFLINE -> Flood reported NO_ROUTE_AVAILABLE cleanly.');

// Test 3.8: Command OFFLINE -> Verify no fake rescue dispatch
engine.reset();
eventsEmitted.length = 0;
engine.setNodeBlocked(0, true); // Command offline
const floodCmdOffline = engine.triggerHazard('flood');
if (floodCmdOffline) {
  throw new Error('Simulation must not start when Command is offline!');
}
const cmdOfflineEvent = eventsEmitted.find((e) => e.type === 'NO_ROUTE_AVAILABLE' && e.message.includes('COMMAND NODE OFFLINE'));
if (!cmdOfflineEvent) {
  throw new Error('COMMAND NODE OFFLINE was not reported!');
}
console.log('✓ Test 3.8: Command OFFLINE -> Truthfully reported COMMAND NODE OFFLINE with 0 fake dispatch.');

// Test 3.9: Reset completely clears failed-node state
engine.reset();
if (engine.blockedNodeIds.size !== 0) {
  throw new Error('Reset failed to clear blockedNodeIds!');
}
for (const node of NETWORK_NODES) {
  const expected = node.isCommandCenter ? 'command' : 'safe';
  if (networkNodes.getNodeStatus(node.id) !== expected) {
    throw new Error(`Node ${node.id} was not reset to ${expected}!`);
  }
}
console.log('✓ Test 3.9: Reset restores all nodes to online and clears blocked collection.');

console.log('\n=== ALL PHASE 5B ACCEPTANCE CRITERIA TESTS PASSED 100% ===');
