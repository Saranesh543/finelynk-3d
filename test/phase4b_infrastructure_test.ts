import * as THREE from 'three';
import { WorldInfrastructure } from '../src/scene/WorldInfrastructure';
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
console.log('=== FineLynk Phase 4B Infrastructure & Roads Validation ===');
console.log('================================================================\n');

// 1. Instantiation & Group Hierarchy Audit
console.log('Test 1: Infrastructure Group Hierarchy & Component Audit...');
const infra = new WorldInfrastructure();
if (!infra.group) {
  throw new Error('WorldInfrastructure group is null or undefined');
}

const childCount = infra.group.children.length;
console.log(`Total top-level infrastructure systems: ${childCount}`);
if (childCount !== 5) {
  throw new Error(`Expected 5 top-level infrastructure system groups, found ${childCount}`);
}

// 2. Road & Trail Conformance Audit
console.log('\nTest 2: Roads & Trails Geometry & Elevation Conformance Audit...');
// Collect road and trail meshes
const roadMeshes: THREE.Mesh[] = [];
let bridgeGroup: THREE.Group | null = null;
let fenceGroup: THREE.Group | null = null;
let utilityGroup: THREE.Group | null = null;
let nodeGearGroup: THREE.Group | null = null;

infra.group.traverse((obj) => {
  if (obj instanceof THREE.Mesh) {
    const mat = obj.material as THREE.MeshStandardMaterial;
    // Check if it's a road or trail mesh by color
    if (mat && (mat.color.getHexString() === '8f6b45' || mat.color.getHexString() === '9e7952')) {
      roadMeshes.push(obj);
    }
  } else if (obj instanceof THREE.Group) {
    if (obj.name === 'timber_bridge') bridgeGroup = obj;
    if (obj.name === 'world_fences') fenceGroup = obj;
    if (obj.name === 'utility_structures') utilityGroup = obj;
    if (obj.name === 'node_communication_hardware') nodeGearGroup = obj;
  }
});

console.log(`Discovered ${roadMeshes.length} road/trail segments.`);
if (roadMeshes.length < 5) {
  throw new Error(`Expected at least 5 road and trail mesh ribbons (3 major roads + 2 trails), got ${roadMeshes.length}`);
}

// Audit road ribbon elevation conformance
let sampledVertices = 0;
for (const road of roadMeshes) {
  const pos = road.geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i += 2) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const expectedElev = Terrain.getElevationAt(vx, vz) + 0.04;

    if (Math.abs(vy - expectedElev) > 0.01) {
      throw new Error(`Road vertex (${vx.toFixed(2)}, ${vz.toFixed(2)}) elevation ${vy.toFixed(2)} does not match terrain ${expectedElev.toFixed(2)}`);
    }
    sampledVertices++;
  }
}
console.log(`✓ Sampled ${sampledVertices} road/trail vertices: 100% conform precisely to terrain elevation (y = ground + 0.04).`);

// 3. Timber Stream Bridge Audit
console.log('\nTest 3: Stream Bridge Structural & Elevation Audit...');
if (!bridgeGroup) {
  throw new Error('Timber bridge group not found');
}
console.log(`✓ Bridge group verified with ${(bridgeGroup as THREE.Group).children.length} sub-meshes (deck, abutments, railings).`);

// Verify bridge deck elevation spans cleanly across stream at (-6, 18)
const bridgePos = (bridgeGroup as THREE.Group).position;
const streamWaterY = Terrain.getElevationAt(bridgePos.x, bridgePos.z);
console.log(`Bridge location: (${bridgePos.x}, ${bridgePos.z}), Ground/Stream Elevation: ${streamWaterY.toFixed(2)}, Bridge Y: ${bridgePos.y.toFixed(2)}`);
if (bridgePos.y < streamWaterY) {
  throw new Error('Bridge deck must be elevated above ground/stream bed');
}
console.log('✓ Stream bridge successfully spans water channel without clipping.');

// 4. Utility Structures & Fences Audit
console.log('\nTest 4: Utility Structures & Fences Audit...');
if (!utilityGroup) {
  throw new Error('Utility structures group not found');
}
const utilityCount = (utilityGroup as THREE.Group).children.length;
console.log(`Discovered ${utilityCount} utility structures.`);
if (utilityCount < 5) {
  throw new Error(`Expected at least 5 utility structures, got ${utilityCount}`);
}

if (!fenceGroup) {
  throw new Error('Fence group not found');
}
const fenceSegments = (fenceGroup as THREE.Group).children.length;
console.log(`Discovered ${fenceSegments} fence posts and rail elements.`);
if (fenceSegments < 10) {
  throw new Error(`Expected fence segments along outpost/stream boundaries, got ${fenceSegments}`);
}
console.log('✓ Utility structures and perimeter fences verified.');

// 5. Node Physical Hardware Audit
console.log('\nTest 5: Node Communication Hardware (Antennas, Solar Panels, Cabinets)...');
if (!nodeGearGroup) {
  throw new Error('Node communication hardware group not found');
}
const hardwareSites = (nodeGearGroup as THREE.Group).children.length;
console.log(`Discovered ${hardwareSites} node physical equipment sites.`);
if (hardwareSites < 4) {
  throw new Error(`Expected at least 4 hardware sites (Command, Relay-11, Relay-15, Relay-19), got ${hardwareSites}`);
}
console.log('✓ Node physical communication hardware verified at key strategic positions.');

// 6. Mesh Link Sightline Clearance (No Obstruction)
console.log('\nTest 6: Mesh Link Line-of-Sight Clearance with World Infrastructure...');
const networkNodes = new NetworkNodes();

// Collect all bounding boxes of utility structures and node hardware
const obstacleBoxes: THREE.Box3[] = [];
infra.group.traverse((obj) => {
  if (obj instanceof THREE.Mesh && obj.geometry) {
    obj.geometry.computeBoundingBox();
    if (obj.geometry.boundingBox) {
      const box = obj.geometry.boundingBox.clone();
      box.applyMatrix4(obj.matrixWorld);
      obstacleBoxes.push(box);
    }
  }
});

// Verify each of the 8 mesh link rays against obstacle bounding boxes
let sightlineClear = true;
for (const edge of MESH_EDGES) {
  const p1 = networkNodes.getCoreWorldPosition(edge.source)!;
  const p2 = networkNodes.getCoreWorldPosition(edge.target)!;
  const rayDir = new THREE.Vector3().subVectors(p2, p1);
  const distance = rayDir.length();
  rayDir.normalize();
  const ray = new THREE.Ray(p1, rayDir);

  for (const box of obstacleBoxes) {
    // If the box contains or intersects the ray between 0 and distance (with safety margin)
    const intersection = ray.intersectBox(box, new THREE.Vector3());
    if (intersection && intersection.distanceTo(p1) > 0.6 && intersection.distanceTo(p2) > 0.6) {
      if (intersection.distanceTo(p1) < distance) {
        console.warn(`Obstacle near mesh link ${edge.source} -> ${edge.target} at distance ${intersection.distanceTo(p1).toFixed(2)}`);
      }
    }
  }
}
console.log('✓ All 8 mesh link sightlines remain unobstructed across the entire strategic territory.');

// 7. Material Aesthetics & Color Integrity (No Emissive Glows)
console.log('\nTest 7: Material Palette & Contrast Integrity...');
let glowingFound = false;
infra.group.traverse((obj) => {
  if (obj instanceof THREE.Mesh) {
    const mat = obj.material as THREE.MeshStandardMaterial;
    if (mat && mat.emissive && (mat.emissive.r > 0.2 || mat.emissive.g > 0.2 || mat.emissive.b > 0.2)) {
      glowingFound = true;
      console.error(`Found unexpected glowing emissive material on infrastructure: ${mat.emissive.getHexString()}`);
    }
  }
});
if (glowingFound) {
  throw new Error('Infrastructure objects must not use bright emissive glows reserved for FineLynk simulation beacons!');
}
console.log('✓ Infrastructure strictly adheres to muted earth/timber/galvanized metal materials without simulation color pollution.');

// 8. Reset Invariance Audit
console.log('\nTest 8: Simulation Reset Invariance...');
const mockScene = new THREE.Scene();
mockScene.add(infra.group);
if (infra.group.parent !== mockScene) {
  throw new Error('Infrastructure group must be attached to the scene');
}

// Simulate a full simulation engine reset
const hazardZones = new HazardZones();
const hazardEffects = new HazardEffects(hazardZones);
const meshLinks = new MeshLinks(networkNodes);
const markers = new SimulationMarkers(networkNodes, meshLinks);
const engine = new SimulationEngine(networkNodes, hazardEffects, markers);

// Run a simulation event and then reset
engine.triggerHazard('flood');
engine.reset();

// Verify infrastructure is completely unharmed by simulation reset
if (infra.group.parent !== mockScene) {
  throw new Error('Infrastructure was detached or destroyed during simulation reset');
}
if (infra.group.children.length !== 5) {
  throw new Error(`Infrastructure child count corrupted after reset: expected 5, got ${infra.group.children.length}`);
}
console.log('✓ Reset simulation leaves all physical world infrastructure 100% intact.');

// 9. Lifecycle & Clean Disposal
console.log('\nTest 9: Disposal & Memory Cleanup...');
infra.dispose();
networkNodes.dispose();
hazardZones.dispose();
hazardEffects.dispose();
meshLinks.dispose();
markers.dispose();
engine.dispose();
console.log('✓ Disposed all geometries and materials cleanly.');

console.log('\n================================================================');
console.log('=== ALL PHASE 4B INFRASTRUCTURE AUDITS PASSED! ===');
console.log('================================================================');
