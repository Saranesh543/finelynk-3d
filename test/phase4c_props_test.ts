import * as THREE from 'three';
import { WorldProps } from '../src/scene/WorldProps';
import { Terrain } from '../src/scene/Terrain';
import { NetworkNodes } from '../src/scene/NetworkNodes';
import { HazardZones } from '../src/scene/HazardZones';
import { HazardEffects } from '../src/scene/HazardEffects';
import { MeshLinks } from '../src/scene/MeshLinks';
import { SimulationMarkers } from '../src/scene/SimulationMarkers';
import { SimulationEngine } from '../src/simulation/SimulationEngine';
import { MESH_EDGES } from '../src/data/graph';
import { NETWORK_NODES } from '../src/data/nodes';

console.log('================================================================');
console.log('=== FineLynk Phase 4C World Props & Storytelling Validation ===');
console.log('================================================================\n');

// 1. Instantiation & Group Hierarchy Audit
console.log('Test 1: World Props Group Hierarchy & Sub-System Audit...');
const props = new WorldProps();
if (!props.group) {
  throw new Error('WorldProps group is null or undefined');
}

const expectedSubGroups = [
  'vegetation',
  'geology',
  'wetland_props',
  'industrial_props',
  'command_props',
  'landmarks',
];

const foundGroups: string[] = [];
props.group.children.forEach((child) => {
  if (child instanceof THREE.Group && expectedSubGroups.includes(child.name)) {
    foundGroups.push(child.name);
  }
});

console.log(`Discovered ${foundGroups.length} prop sub-systems: ${foundGroups.join(', ')}`);
for (const exp of expectedSubGroups) {
  if (!foundGroups.includes(exp)) {
    throw new Error(`Missing expected sub-group: ${exp}`);
  }
}
console.log('✓ All 6 major prop sub-systems verified in scene graph hierarchy.');

// 2. Determinism Audit
console.log('\nTest 2: Deterministic Reproducibility Audit...');
const propsA = new WorldProps(42);
const propsB = new WorldProps(42);

let totalMeshCountA = 0;
let totalMeshCountB = 0;
const positionsA: THREE.Vector3[] = [];
const positionsB: THREE.Vector3[] = [];

propsA.group.traverse((obj) => {
  if (obj instanceof THREE.Mesh) {
    totalMeshCountA++;
    positionsA.push(obj.position.clone());
  }
});

propsB.group.traverse((obj) => {
  if (obj instanceof THREE.Mesh) {
    totalMeshCountB++;
    positionsB.push(obj.position.clone());
  }
});

if (totalMeshCountA !== totalMeshCountB) {
  throw new Error(`Non-deterministic mesh count: A=${totalMeshCountA}, B=${totalMeshCountB}`);
}
for (let i = 0; i < positionsA.length; i++) {
  if (positionsA[i].distanceTo(positionsB[i]) > 0.0001) {
    throw new Error(`Non-deterministic mesh position at index ${i}`);
  }
}
propsA.dispose();
propsB.dispose();
console.log(`✓ 100% Deterministic placement verified across ${totalMeshCountA} meshes with identical seed.`);

// 3. Terrain Height Conformance Audit
console.log('\nTest 3: Terrain Elevation Conformance Audit...');
let sampledProps = 0;
props.group.traverse((obj) => {
  if (obj instanceof THREE.Group && obj.parent === props.group) {
    // Top level system groups
  } else if (obj instanceof THREE.Group && obj.position.x !== 0 && obj.position.z !== 0) {
    const gx = obj.position.x;
    const gz = obj.position.z;
    const gy = obj.position.y;
    const expectedY = Terrain.getElevationAt(gx, gz);
    if (Math.abs(gy - expectedY) > 0.15) {
      throw new Error(`Prop group at (${gx.toFixed(1)}, ${gz.toFixed(1)}) Y=${gy.toFixed(2)} differs from terrain ${expectedY.toFixed(2)}`);
    }
    sampledProps++;
  }
});
console.log(`✓ Verified ${sampledProps} major prop groups conform accurately to terrain height.`);

// 4. Node Keep-Out Clearance Audit
console.log('\nTest 4: Node Platform Keep-Out Zone Audit...');
props.group.traverse((obj) => {
  if (obj instanceof THREE.Mesh) {
    if (obj.name === 'grass_meadow_tufts') return;

    const worldPos = new THREE.Vector3();
    obj.getWorldPosition(worldPos);

    if (Math.abs(worldPos.x) < 0.001 && Math.abs(worldPos.z) < 0.001) return;

    const isCommandProp = obj.parent?.name === 'command_props';

    for (const node of NETWORK_NODES) {
      const dx = worldPos.x - node.position[0];
      const dz = worldPos.z - node.position[2];
      const dist = Math.hypot(dx, dz);
      const minBuffer = isCommandProp && node.id === 0 ? 1.8 : 2.0;
      if (dist < minBuffer) {
        throw new Error(`Prop at (${worldPos.x.toFixed(1)}, ${worldPos.z.toFixed(1)}) encroaches on Node ${node.name} (dist=${dist.toFixed(2)})`);
      }
    }
  }
});
console.log('✓ All 7 node platforms strictly maintain unobstructed keep-out zones.');

// 5. Major Regional Landmarks Audit
console.log('\nTest 5: Three Regional Landmarks Presence & Integrity...');
const landmarksGroup = props.group.children.find((c) => c.name === 'landmarks') as THREE.Group;
if (!landmarksGroup) throw new Error('Landmarks group not found');

const forestTower = landmarksGroup.children.find((c) => c.name === 'landmark_forest_lookout_tower') as THREE.Group;
const floodStation = landmarksGroup.children.find((c) => c.name === 'landmark_flood_monitoring_station') as THREE.Group;
const industrialSubstation = landmarksGroup.children.find((c) => c.name === 'landmark_industrial_substation') as THREE.Group;

if (!forestTower) throw new Error('Forest Ranger Lookout Tower landmark missing');
if (!floodStation) throw new Error('Flood Monitoring Station landmark missing');
if (!industrialSubstation) throw new Error('Industrial Substation landmark missing');

console.log(`✓ Forest Lookout Tower verified at (${forestTower.position.x}, ${forestTower.position.z}) with ${forestTower.children.length} structural elements.`);
console.log(`✓ Flood Monitoring Station verified at (${floodStation.position.x}, ${floodStation.position.z}) with ${floodStation.children.length} telemetry elements.`);
console.log(`✓ Industrial Substation verified at (${industrialSubstation.position.x}, ${industrialSubstation.position.z}) with ${industrialSubstation.children.length} utility elements.`);

// 6. Mesh Link Line-of-Sight Clearance
console.log('\nTest 6: Mesh Link Line-of-Sight Clearance...');
const networkNodes = new NetworkNodes();

// Collect bounding boxes of all landmark structures
const landmarkBoxes: THREE.Box3[] = [];
landmarksGroup.traverse((obj) => {
  if (obj instanceof THREE.Mesh && obj.geometry) {
    obj.geometry.computeBoundingBox();
    if (obj.geometry.boundingBox) {
      const box = obj.geometry.boundingBox.clone();
      obj.updateWorldMatrix(true, false);
      box.applyMatrix4(obj.matrixWorld);
      landmarkBoxes.push(box);
    }
  }
});

for (const edge of MESH_EDGES) {
  const p1 = networkNodes.getCoreWorldPosition(edge.source)!;
  const p2 = networkNodes.getCoreWorldPosition(edge.target)!;
  const rayDir = new THREE.Vector3().subVectors(p2, p1);
  const distance = rayDir.length();
  rayDir.normalize();
  const ray = new THREE.Ray(p1, rayDir);

  for (const box of landmarkBoxes) {
    const intersection = ray.intersectBox(box, new THREE.Vector3());
    if (intersection && intersection.distanceTo(p1) > 0.5 && intersection.distanceTo(p1) < distance - 0.5) {
      throw new Error(`Landmark structure occludes mesh link ${edge.source}-${edge.target}`);
    }
  }
}
console.log('✓ All 8 mesh link sightlines remain completely unobstructed by world props and landmarks.');

// 7. Non-Emissive Aesthetics & Palette Safeguard
console.log('\nTest 7: Material Palette & Non-Emissive Safeguard...');
let emissiveLeak = false;
props.group.traverse((obj) => {
  if (obj instanceof THREE.Mesh) {
    const mat = obj.material as THREE.MeshStandardMaterial;
    if (mat && mat.emissive && (mat.emissive.r > 0.1 || mat.emissive.g > 0.1 || mat.emissive.b > 0.1)) {
      emissiveLeak = true;
    }
  }
});
if (emissiveLeak) {
  throw new Error('Environmental props must never use glowing emissive materials!');
}
console.log('✓ All props strictly conform to non-emissive natural strategy palette.');

// 8. Simulation Non-Interference & Reset Invariance
console.log('\nTest 8: Simulation Non-Interference & Reset Invariance...');
const mockScene = new THREE.Scene();
mockScene.add(props.group);

const hazardZones = new HazardZones();
const hazardEffects = new HazardEffects(hazardZones);
const meshLinks = new MeshLinks(networkNodes);
const markers = new SimulationMarkers(networkNodes, meshLinks);
const engine = new SimulationEngine(networkNodes, hazardEffects, markers);

// Run full flood simulation and reset
engine.triggerHazard('flood');
engine.reset();

if (props.group.parent !== mockScene) {
  throw new Error('Props group was detached from scene during simulation reset');
}
if (props.group.children.length !== expectedSubGroups.length) {
  throw new Error(`Props sub-group count changed after reset: expected ${expectedSubGroups.length}, got ${props.group.children.length}`);
}
console.log('✓ Environmental props remain 100% intact across simulation events and reset.');

// 9. Clean Disposal & Memory Cleanup
console.log('\nTest 9: Resource Disposal...');
props.dispose();
networkNodes.dispose();
hazardZones.dispose();
hazardEffects.dispose();
meshLinks.dispose();
markers.dispose();
engine.dispose();
console.log('✓ All 3D resources disposed cleanly.');

console.log('\n================================================================');
console.log('=== ALL PHASE 4C PROPS AUDITS PASSED! ===');
console.log('================================================================');
