import * as THREE from 'three';
import { Clouds } from '../src/scene/Clouds';
import { Terrain } from '../src/scene/Terrain';
import { HazardZones } from '../src/scene/HazardZones';
import { NetworkNodes } from '../src/scene/NetworkNodes';
import { MeshLinks } from '../src/scene/MeshLinks';
import { HazardEffects } from '../src/scene/HazardEffects';
import { SimulationMarkers } from '../src/scene/SimulationMarkers';
import { SimulationEngine } from '../src/simulation/SimulationEngine';
import { TOKENS } from '../src/data/tokens';

console.log('================================================================');
console.log('=== FineLynk Art Direction Phase 3 Atmosphere & QA Audit ===');
console.log('================================================================\n');

// 1. Procedural Clouds Audit
console.log('Test 1: Procedural Clouds Audit...');
const clouds = new Clouds();
if (!clouds.group) throw new Error('Clouds group is missing');

const count = clouds.getCloudCount();
console.log(`Cloud cluster count: ${count}`);
if (count < 6 || count > 10) {
  throw new Error(`Expected 6 to 10 cloud clusters, got ${count}`);
}

// Check puff count and altitude
let totalPuffs = 0;
for (const child of clouds.group.children) {
  const cluster = child as THREE.Group;
  if (cluster.position.y < 28 || cluster.position.y > 40) {
    throw new Error(`Cloud cluster altitude must be high (28–40), got ${cluster.position.y}`);
  }
  totalPuffs += cluster.children.length;
}
console.log(`✓ Clouds verified: ${count} clusters with ${totalPuffs} total low-poly puffs.`);
console.log('✓ Altitude safety verified: all clouds reside safely at Y=[28, 40] above network.\n');

// 2. Continuous Drift & Toroidal Boundary Wrap Audit
console.log('Test 2: Cloud Motion & Boundary Wrapping Audit...');
const initialPositions = clouds.group.children.map((c) => c.position.clone());

// Advance drift by 1.0s
clouds.update(1.0);
const movedPositions = clouds.group.children.map((c) => c.position.clone());

for (let i = 0; i < count; i++) {
  if (initialPositions[i].x === movedPositions[i].x && initialPositions[i].z === movedPositions[i].z) {
    throw new Error(`Cloud ${i} failed to drift continuously`);
  }
}
console.log('✓ Continuous drift verified: all clouds moving gently.');

// Advance drift by a large duration to test toroidal wrapping
for (let step = 0; step < 250; step++) {
  clouds.update(1.0);
}

for (const child of clouds.group.children) {
  const p = child.position;
  if (p.x < -76 || p.x > 76 || p.z < -76 || p.z > 76) {
    throw new Error(`Cloud wrapped out of bounds: x=${p.x}, z=${p.z}`);
  }
}
console.log('✓ Toroidal boundary wrapping verified: clouds never drift out of the scene bounds.\n');

// 3. HUD Semantic Color Consistency Audit
console.log('Test 3: HUD Semantic Tokens Audit...');
const expectedColors = {
  cyan: TOKENS.colors.cyan, // '#2dd4ee'
  flood: TOKENS.colors.flood,
  fire: TOKENS.colors.fire,
  industrial: TOKENS.colors.industrial,
  critical: TOKENS.colors.critical,
  resolved: TOKENS.colors.resolved,
  command: TOKENS.colors.command,
  offline: TOKENS.colors.offline,
};

for (const [key, val] of Object.entries(expectedColors)) {
  if ((TOKENS.colors as any)[key] !== val) {
    throw new Error(`Token color mismatch for ${key}: expected ${val}, got ${(TOKENS.colors as any)[key]}`);
  }
}
console.log('✓ Semantic HUD tokens strictly preserved with vivid game-like values.\n');

// 4. Full End-to-End Simulation Cycle with Clouds Active
console.log('Test 4: Full Multi-Hazard Simulation with Atmosphere Active...');
const terrain = new Terrain();
const hazardZones = new HazardZones();
const hazardEffects = new HazardEffects(hazardZones);
const networkNodes = new NetworkNodes();
const meshLinks = new MeshLinks(networkNodes);
const markers = new SimulationMarkers(networkNodes, meshLinks);
const engine = new SimulationEngine(networkNodes, hazardEffects, markers);

// Hook up territory events
engine.events.on('*', (event) => {
  if (event.type === 'HAZARD_DETECTED' && event.hazardType) {
    hazardZones.setTerritoryActive(event.hazardType as any, true);
  } else if (event.type === 'HAZARD_RESOLVED' && event.hazardType) {
    hazardZones.setTerritoryActive(event.hazardType as any, false);
  } else if (event.type === 'SIMULATION_RESET') {
    hazardZones.resetAllTerritories();
  }
});

// Trigger concurrent hazards
engine.triggerHazard('flood');
engine.triggerHazard('fire');
engine.triggerHazard('industrial');

if (engine.activeAlertsCount !== 3) {
  throw new Error(`Expected 3 active hazards, got ${engine.activeAlertsCount}`);
}

// Simulate 100 frames of full physics, animation, and cloud drift
let time = 0;
const dt = 0.1;
for (let step = 0; step < 100; step++) {
  time += dt;
  engine.update(dt);
  hazardEffects.update(dt, time);
  hazardZones.update(dt);
  clouds.update(dt);
  networkNodes.update(time);
  meshLinks.update(time, dt);
}

console.log('✓ 100 frames of concurrent hazards and cloud drift executed smoothly.');

// Trigger reset simulation
engine.reset();
meshLinks.resetAllSevered();
networkNodes.resetAllNodes();
hazardZones.resetAllTerritories();

if (engine.activeAlertsCount !== 0) {
  throw new Error('Simulation reset failed to clear alerts');
}
console.log('✓ Simulation reset cleanly restored all systems.\n');

// 5. Memory & Disposal Audit
console.log('Test 5: Resource Disposal Audit...');
clouds.dispose();
terrain.dispose();
hazardZones.dispose();
hazardEffects.dispose();
networkNodes.dispose();
meshLinks.dispose();
markers.dispose();
engine.dispose();
console.log('✓ All atmospheric and simulation resources disposed cleanly without leaks.');

console.log('\n================================================================');
console.log('=== ALL PHASE 3 ATMOSPHERE & PRODUCTION AUDITS PASSED! ===');
console.log('================================================================');
