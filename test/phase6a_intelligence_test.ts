import { NETWORK_NODES } from '../src/data/nodes';
import { MESH_EDGES } from '../src/data/graph';
import { HAZARD_ZONES } from '../src/data/hazards';
import { TelemetryService } from '../src/simulation/telemetry';
import { HazardSimulation } from '../src/simulation/types';

console.log('=== FineLynk Phase 6A Environmental Intelligence & AI Command Layer Tests ===\n');

// ----------------------------------------------------------------------------
// Test 1: Verify 7-Node Topology & 8 Mesh Edges Strictly Preserved
// ----------------------------------------------------------------------------
console.log('Test 1: Verifying 7-Node Topology & 8 Mesh Edges...');
if (NETWORK_NODES.length !== 7) {
  throw new Error(`Expected exactly 7 nodes, found ${NETWORK_NODES.length}`);
}
const expectedNames = [
  'COMMAND CENTER',
  'Flood-04',
  'Forest-07',
  'Indus-02',
  'Relay-11',
  'Relay-15',
  'Relay-19',
];
expectedNames.forEach((name, idx) => {
  if (NETWORK_NODES[idx].name !== name) {
    throw new Error(`Node ${idx} expected ${name}, got ${NETWORK_NODES[idx].name}`);
  }
});

if (MESH_EDGES.length !== 8) {
  throw new Error(`Expected exactly 8 mesh edges, found ${MESH_EDGES.length}`);
}
console.log('✓ 7-Node topology & 8 edges verified intact.\n');

// ----------------------------------------------------------------------------
// Test 2: Telemetry Service Baseline Initialization
// ----------------------------------------------------------------------------
console.log('Test 2: Verifying Telemetry Service Baseline Initialization...');
const telemetry = new TelemetryService();

// Flood baseline
console.log('Flood Telemetry Baseline:', {
  water: telemetry.flood.waterLevel,
  rain: telemetry.flood.rainfall,
  soil: telemetry.flood.soilMoisture,
  temp: telemetry.flood.temperature,
  health: telemetry.flood.sensorHealth,
});
if (
  telemetry.flood.waterLevel < 10 ||
  telemetry.flood.waterLevel > 20 ||
  telemetry.flood.rainfall > 3 ||
  telemetry.flood.soilMoisture > 40 ||
  telemetry.flood.sensorHealth !== 'ONLINE'
) {
  throw new Error('Flood baseline readings out of expected nominal range');
}

// Fire baseline
console.log('Fire Telemetry Baseline:', {
  smoke: telemetry.fire.smoke,
  aqi: telemetry.fire.airQualityIndex,
  temp: telemetry.fire.temperature,
  humidity: telemetry.fire.humidity,
  flame: telemetry.fire.flameDetected,
});
if (
  telemetry.fire.smoke > 20 ||
  telemetry.fire.airQualityIndex > 50 ||
  telemetry.fire.flameDetected !== false ||
  telemetry.fire.humidity < 40
) {
  throw new Error('Fire baseline readings out of expected nominal range');
}

// Industrial baseline
console.log('Industrial Telemetry Baseline:', {
  gas: telemetry.industrial.vocGas,
  temp: telemetry.industrial.temperature,
  pressure: telemetry.industrial.pressure,
  anomaly: telemetry.industrial.anomalyDeviation,
});
if (
  telemetry.industrial.vocGas > 25 ||
  telemetry.industrial.anomalyDeviation > 10 ||
  Math.abs(telemetry.industrial.pressure - 101.3) > 2
) {
  throw new Error('Industrial baseline readings out of expected nominal range');
}
console.log('✓ Baseline environmental parameters verified.\n');

// ----------------------------------------------------------------------------
// Test 3: Edge Risk Assessment in Baseline State
// ----------------------------------------------------------------------------
console.log('Test 3: Verifying Edge Risk Assessment in Baseline (Nominal)...');
const floodBaseRisk = telemetry.getEdgeRiskAssessment(1);
const fireBaseRisk = telemetry.getEdgeRiskAssessment(2);
const indusBaseRisk = telemetry.getEdgeRiskAssessment(3);

console.log('Flood baseline risk:', floodBaseRisk);
console.log('Fire baseline risk:', fireBaseRisk);
console.log('Industrial baseline risk:', indusBaseRisk);

if (floodBaseRisk.riskLevel !== 'LOW' || floodBaseRisk.anomalyDetected) {
  throw new Error(`Expected Flood baseline LOW risk, got ${floodBaseRisk.riskLevel}`);
}
if (fireBaseRisk.riskLevel !== 'LOW' || fireBaseRisk.anomalyDetected) {
  throw new Error(`Expected Fire baseline LOW risk, got ${fireBaseRisk.riskLevel}`);
}
if (indusBaseRisk.riskLevel !== 'LOW' || indusBaseRisk.anomalyDetected) {
  throw new Error(`Expected Industrial baseline LOW risk, got ${indusBaseRisk.riskLevel}`);
}
console.log('✓ Baseline edge risk scores are appropriately LOW (0-24).\n');

// ----------------------------------------------------------------------------
// Test 4: Hazard Activation & Environmental Telemetry Escalation
// ----------------------------------------------------------------------------
console.log('Test 4: Verifying Hazard Activation & Telemetry Escalation...');
const activeSims = new Map<any, HazardSimulation>();
activeSims.set('flood', {
  id: 'flood-test',
  hazardType: 'flood',
  hazardNodeId: 1,
  stage: 'BROADCASTING',
  path: [1, 4, 0],
  stageStartedAt: 0,
  elapsedInStage: 0.5,
  pulseProgress: 0.5,
  rescueProgress: 0,
});

// Update telemetry with flood active
telemetry.update(1.0, activeSims, new Set());

const floodActiveRisk = telemetry.getEdgeRiskAssessment(1);
console.log('Flood active telemetry:', {
  waterLevel: telemetry.flood.waterLevel,
  rainfall: telemetry.flood.rainfall,
  soilMoisture: telemetry.flood.soilMoisture,
});
console.log('Flood active risk assessment:', floodActiveRisk);

if (floodActiveRisk.riskScore < 50 || !floodActiveRisk.anomalyDetected) {
  throw new Error(`Expected active flood risk score >= 50, got ${floodActiveRisk.riskScore}`);
}
if (floodActiveRisk.classification !== 'FLOOD RISK') {
  throw new Error(`Expected FLOOD RISK classification, got ${floodActiveRisk.classification}`);
}
if (floodActiveRisk.priority !== 'URGENT' && floodActiveRisk.priority !== 'EMERGENCY') {
  throw new Error(`Expected elevated priority, got ${floodActiveRisk.priority}`);
}
console.log('✓ Flood escalation and edge intelligence verified.\n');

// ----------------------------------------------------------------------------
// Test 5: Fire & Industrial Escalation
// ----------------------------------------------------------------------------
console.log('Test 5: Verifying Fire & Industrial Escalation...');
activeSims.clear();
activeSims.set('fire', {
  id: 'fire-test',
  hazardType: 'fire',
  hazardNodeId: 2,
  stage: 'BROADCASTING',
  path: [2, 6, 4, 0],
  stageStartedAt: 0,
  elapsedInStage: 0.5,
  pulseProgress: 0.5,
  rescueProgress: 0,
});
telemetry.update(2.0, activeSims, new Set());
const fireActiveRisk = telemetry.getEdgeRiskAssessment(2);
console.log('Fire active risk assessment:', fireActiveRisk);
if (fireActiveRisk.riskScore < 50 || fireActiveRisk.classification !== 'FOREST FIRE RISK') {
  throw new Error(`Fire active assessment failure: ${JSON.stringify(fireActiveRisk)}`);
}

activeSims.clear();
activeSims.set('industrial', {
  id: 'indus-test',
  hazardType: 'industrial',
  hazardNodeId: 3,
  stage: 'DISPATCHED',
  path: [3, 5, 0],
  stageStartedAt: 0,
  elapsedInStage: 0.5,
  pulseProgress: 1.0,
  rescueProgress: 0.3,
});
telemetry.update(3.0, activeSims, new Set());
const indusActiveRisk = telemetry.getEdgeRiskAssessment(3);
console.log('Industrial active risk assessment:', indusActiveRisk);
if (indusActiveRisk.riskScore < 50 || indusActiveRisk.classification !== 'INDUSTRIAL RISK') {
  throw new Error(`Industrial active assessment failure: ${JSON.stringify(indusActiveRisk)}`);
}
console.log('✓ Fire & Industrial edge risk assessment verified.\n');

// ----------------------------------------------------------------------------
// Test 6: Relay Node Telemetry & Graph Neighbors
// ----------------------------------------------------------------------------
console.log('Test 6: Verifying Relay Node Telemetry...');
const relay11Nominal = telemetry.getRelayTelemetry(4, new Set());
console.log('Relay-11 Nominal Telemetry:', relay11Nominal);

// Relay-11 (node 4) connects to Command(0), Flood-04(1), Relay-19(6) -> total 3 neighbors
if (relay11Nominal.totalNeighbors !== 3 || relay11Nominal.neighborCount !== 3) {
  throw new Error(`Expected Relay-11 to have 3 online neighbors, got ${relay11Nominal.neighborCount}`);
}
if (relay11Nominal.connectivity !== 'CONNECTED' || relay11Nominal.packetState !== 'FORWARDING') {
  throw new Error('Relay-11 nominal connectivity state invalid');
}

// When Relay-11 itself is failed
const relay11Failed = telemetry.getRelayTelemetry(4, new Set([4]));
console.log('Relay-11 Failed Telemetry:', relay11Failed);
if (
  relay11Failed.connectivity !== 'ISOLATED' ||
  relay11Failed.linkQuality !== 0 ||
  relay11Failed.nodeHealth !== 0 ||
  relay11Failed.packetState !== 'DROPPED_ROUTE'
) {
  throw new Error('Relay-11 failed telemetry state invalid');
}
console.log('✓ Relay telemetry and graph topology integration verified.\n');

// ----------------------------------------------------------------------------
// Test 7: Command Center System Intelligence & Network Health Formula
// ----------------------------------------------------------------------------
console.log('Test 7: Verifying Command Center System Intelligence & Health...');
const cmdIntelNominal = telemetry.getCommandCenterIntelligence(new Set(), 0);
console.log('Nominal System Intelligence:', cmdIntelNominal);
if (
  cmdIntelNominal.networkHealthPct !== 100 ||
  cmdIntelNominal.onlineNodesCount !== 7 ||
  cmdIntelNominal.activeEdgesCount !== 8 ||
  cmdIntelNominal.gatewayStatus !== 'ONLINE' ||
  cmdIntelNominal.meshStatus !== 'SELF-HEALING READY'
) {
  throw new Error('Nominal command center intelligence calculation incorrect');
}

// When Relay-11 is blocked (3 edges: e0-4, e4-1, e4-6 severed) -> 5 edges remain
const cmdIntelDegraded = telemetry.getCommandCenterIntelligence(new Set([4]), 1);
console.log('Degraded System Intelligence (Relay-11 failed):', cmdIntelDegraded);
const expectedHealth = Math.round((5 / 8) * 100); // 63%
if (
  cmdIntelDegraded.networkHealthPct !== expectedHealth ||
  cmdIntelDegraded.onlineNodesCount !== 6 ||
  cmdIntelDegraded.activeEdgesCount !== 5 ||
  cmdIntelDegraded.meshStatus !== 'TOPOLOGY DEGRADED'
) {
  throw new Error(
    `Degraded health expected ${expectedHealth}%, got ${cmdIntelDegraded.networkHealthPct}%`
  );
}

// When Command Center (0) is blocked -> Gateway severed, 0%
const cmdIntelCommandFailed = telemetry.getCommandCenterIntelligence(new Set([0]), 0);
console.log('Command Center Failed Intelligence:', cmdIntelCommandFailed);
if (cmdIntelCommandFailed.networkHealthPct !== 0 || cmdIntelCommandFailed.gatewayStatus !== 'OFFLINE') {
  throw new Error('Command Center offline calculation incorrect');
}
console.log('✓ Network Health formula and Gateway Intelligence verified.\n');

// ----------------------------------------------------------------------------
// Test 8: Route Intelligence & Self-Healing Rerouting
// ----------------------------------------------------------------------------
console.log('Test 8: Verifying Route Intelligence & Self-Healing Reroute Detection...');
// Primary route for Flood-04: [1, 4, 0]
const floodRouteNominal = telemetry.getRouteIntelligence('flood', new Set());
console.log('Flood Nominal Route:', floodRouteNominal);
if (
  floodRouteNominal.isRerouted !== false ||
  floodRouteNominal.statusText !== 'PRIMARY ROUTE' ||
  JSON.stringify(floodRouteNominal.currentPath) !== JSON.stringify([1, 4, 0])
) {
  throw new Error('Flood primary route calculation incorrect');
}

// Fail Relay-11 (4): Should reroute to Relay-15 (5) -> [1, 5, 0]
const floodRouteRerouted = telemetry.getRouteIntelligence('flood', new Set([4]));
console.log('Flood Rerouted Route (Relay-11 failed):', floodRouteRerouted);
if (
  floodRouteRerouted.isRerouted !== true ||
  floodRouteRerouted.statusText !== 'REROUTED — NODE FAILURE' ||
  JSON.stringify(floodRouteRerouted.currentPath) !== JSON.stringify([1, 5, 0])
) {
  throw new Error(
    `Expected rerouted path [1, 5, 0], got ${JSON.stringify(floodRouteRerouted.currentPath)}`
  );
}

// Fail both Relay-11 (4) and Relay-15 (5): Route severed!
const floodRouteSevered = telemetry.getRouteIntelligence('flood', new Set([4, 5]));
console.log('Flood Severed Route:', floodRouteSevered);
if (floodRouteSevered.currentPath !== null || floodRouteSevered.statusText !== 'ROUTE SEVERED') {
  throw new Error('Expected route severed state');
}
console.log('✓ Route Intelligence and self-healing detection verified.\n');

// ----------------------------------------------------------------------------
// Test 9: Reset Verification
// ----------------------------------------------------------------------------
console.log('Test 9: Verifying Pristine Reset...');
telemetry.reset();
const floodResetRisk = telemetry.getEdgeRiskAssessment(1);
if (floodResetRisk.riskLevel !== 'LOW' || floodResetRisk.riskScore > 24) {
  throw new Error('Reset failed to restore baseline telemetry');
}
console.log('✓ Telemetry reset verified cleanly.\n');

console.log('================================================================');
console.log('ALL PHASE 6A ENVIRONMENTAL INTELLIGENCE TESTS PASSED 100%!');
console.log('================================================================');
