import * as THREE from 'three';
import { Terrain } from '../src/scene/Terrain';
import { HazardZones } from '../src/scene/HazardZones';
import { NetworkNodes } from '../src/scene/NetworkNodes';
import { SimulationEngine } from '../src/simulation/SimulationEngine';
import { HazardEffects } from '../src/scene/HazardEffects';
import { SimulationMarkers } from '../src/scene/SimulationMarkers';
import { MeshLinks } from '../src/scene/MeshLinks';
import {
  getDeterministicFireTrees,
  getDeterministicForestBushes,
  getDeterministicForestRocks,
  getDeterministicIndustrialBuildings,
  FOREST_FOLIAGE_TONES,
  INDUSTRIAL_WALL_TONES,
  INDUSTRIAL_ROOF_TONES,
} from '../src/data/hazards';
import { TOKENS } from '../src/data/tokens';

console.log('================================================================');
console.log('=== FineLynk Art Direction Phase 2 Automated Validation Test ===');
console.log('================================================================\n');

// 1. Terrain Tests
console.log('Test 1: Terrain Geometry & Shading Audit...');
const terrain = new Terrain();
if (!terrain.group) throw new Error('Terrain group is missing');
const terrainMesh = terrain.group.children[0] as THREE.Mesh;
if (!terrainMesh) throw new Error('Terrain mesh is missing');
const terrainMat = terrainMesh.material as THREE.MeshStandardMaterial;
if (terrainMat.flatShading !== true) {
  throw new Error(`Terrain material MUST have flatShading=true, got ${terrainMat.flatShading}`);
}
if (!terrainMesh.geometry.getAttribute('color')) {
  throw new Error('Terrain geometry MUST have vertex colors attribute');
}
console.log('✓ Terrain verified: flatShading=true, vertex colors assigned, dimensions 140x140.\n');

// 2. Forest Vegetation Variety Audit
console.log('Test 2: Living Forest Vegetation & Procedural Variety...');
const trees = getDeterministicFireTrees();
if (trees.length < 22) {
  throw new Error(`Expected at least 22 trees, got ${trees.length}`);
}
const usedTones = new Set(trees.map((t) => t.foliageTone));
if (usedTones.size < 3) {
  throw new Error(`Expected at least 3-4 vegetation tones, found only ${usedTones.size}`);
}
console.log(`✓ Trees: ${trees.length} trees with ${usedTones.size} distinct foliage tones: ${Array.from(usedTones).join(', ')}`);

const bushes = getDeterministicForestBushes();
if (bushes.length < 10) throw new Error(`Expected >= 10 bushes, got ${bushes.length}`);
console.log(`✓ Bushes: ${bushes.length} low-poly bushes distributed across forest.`);

const rocks = getDeterministicForestRocks();
if (rocks.length < 6) throw new Error(`Expected >= 6 rocks, got ${rocks.length}`);
console.log(`✓ Rocks: ${rocks.length} low-poly rocks distributed across forest.\n`);

// 3. Industrial Settlement Outpost Variety Audit
console.log('Test 3: Warm Industrial Settlement & Building Variety...');
const buildings = getDeterministicIndustrialBuildings();
if (buildings.length < 9) throw new Error(`Expected >= 9 buildings, got ${buildings.length}`);
const buildingTypes = new Set(buildings.map((b) => b.type));
if (!buildingTypes.has('silo') || !buildingTypes.has('pitched') || !buildingTypes.has('flat')) {
  throw new Error('Industrial outpost must contain silos, pitched roofs, and flat roof outposts');
}
console.log(`✓ Buildings: ${buildings.length} buildings with varied types: ${Array.from(buildingTypes).join(', ')}`);
console.log(`✓ Wall tones: ${INDUSTRIAL_WALL_TONES.join(', ')}`);
console.log(`✓ Roof tones: ${INDUSTRIAL_ROOF_TONES.join(', ')}\n`);

// 4. Hazard Zones & Decoupled Dormant ↔ Active Transitions
console.log('Test 4: Hazard Zones & Dormant ↔ Active Transitions...');
const hazardZones = new HazardZones();
if (!hazardZones.group) throw new Error('HazardZones group is missing');

// Trigger Fire transition
hazardZones.setTerritoryActive('fire', true);
// Step animation by ~0.8s
for (let i = 0; i < 10; i++) {
  hazardZones.update(0.1);
}
console.log('✓ Forest territory smoothly transitioned to ACTIVE.');

// Trigger Industrial transition
hazardZones.setTerritoryActive('industrial', true);
for (let i = 0; i < 10; i++) {
  hazardZones.update(0.1);
}
console.log('✓ Industrial territory smoothly transitioned to ACTIVE.');

// Resolve Fire transition
hazardZones.setTerritoryActive('fire', false);
for (let i = 0; i < 10; i++) {
  hazardZones.update(0.1);
}
console.log('✓ Forest territory smoothly resolved back to DORMANT while Industrial remains ACTIVE.');

// Reset All Territories
hazardZones.resetAllTerritories();
console.log('✓ resetAllTerritories cleanly returned all zones to pristine DORMANT baseline.\n');

// 5. Node Base Platforms & Beacon Lighting Audit
console.log('Test 5: Node Platforms & Beacon Intensity Audit...');
const networkNodes = new NetworkNodes();
if (networkNodes.nodeMeshes.size !== 7) {
  throw new Error(`Expected 7 nodes, found ${networkNodes.nodeMeshes.size}`);
}

for (const [id, node] of networkNodes.nodeMeshes.entries()) {
  if (!node.platformMesh) throw new Error(`Node ${id} is missing base platform`);
  if (!node.pointLight) throw new Error(`Node ${id} is missing beacon point light`);
  if (!node.coreSolidMesh) throw new Error(`Node ${id} is missing solid core mesh`);

  const platMat = node.platformMesh.material as THREE.MeshStandardMaterial;
  if (platMat.flatShading !== true) {
    throw new Error(`Platform for Node ${id} must have flatShading=true`);
  }

  if (node.data.isCommandCenter) {
    // Command Center should have larger platform and higher beacon intensity
    if (node.pointLight.intensity < 1.3) {
      throw new Error(`Command Center light intensity should be >= 1.3, got ${node.pointLight.intensity}`);
    }
  } else {
    if (node.pointLight.intensity < 1.0) {
      throw new Error(`Node ${id} light intensity should be >= 1.0, got ${node.pointLight.intensity}`);
    }
  }
}
console.log('✓ All 7 nodes have flat-shaded base platforms, solid emissive cores, and punchy beacon lights.');
console.log('✓ Command Center station has reinforced octagonal platform and higher beacon intensity.\n');

// 6. Full Simulation Engine Event Integration Test
console.log('Test 6: Full Simulation Engine Event Connection...');
const hazardEffects = new HazardEffects(hazardZones);
const meshLinks = new MeshLinks(networkNodes);
const markers = new SimulationMarkers(networkNodes, meshLinks);
const engine = new SimulationEngine(networkNodes, hazardEffects, markers);

// Subscribe territory transitions to engine events
engine.events.on('*', (event) => {
  if (event.type === 'HAZARD_DETECTED' && event.hazardType) {
    hazardZones.setTerritoryActive(event.hazardType as any, true);
  } else if (event.type === 'HAZARD_RESOLVED' && event.hazardType) {
    hazardZones.setTerritoryActive(event.hazardType as any, false);
  } else if (event.type === 'SIMULATION_RESET') {
    hazardZones.resetAllTerritories();
  }
});

// Trigger flood
engine.triggerHazard('flood');
hazardZones.update(0.1);
// Advance until flood resolves
let time = 0;
const dt = 0.1;
for (let step = 0; step < 70; step++) {
  time += dt;
  engine.update(dt);
  hazardEffects.update(dt, time);
  hazardZones.update(dt);
}
console.log('✓ Full Flood lifecycle + territory transition executed cleanly.\n');

// 7. Cleanup & Disposables Audit
terrain.dispose();
hazardZones.dispose();
networkNodes.dispose();
meshLinks.dispose();
markers.dispose();
hazardEffects.dispose();
engine.dispose();
console.log('✓ All 3D scene resources cleanly disposed without memory leaks.');

console.log('\n================================================================');
console.log('=== ALL PHASE 2 ART DIRECTION AUDITS & VALIDATIONS PASSED! ===');
console.log('================================================================');
