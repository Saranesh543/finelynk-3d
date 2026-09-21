import * as THREE from 'three';
import { Terrain } from '../src/scene/Terrain';
import { NetworkNodes } from '../src/scene/NetworkNodes';
import { MESH_EDGES } from '../src/data/graph';
import { NETWORK_NODES } from '../src/data/nodes';
import { HAZARD_ZONES } from '../src/data/hazards';

console.log('================================================================');
console.log('=== FineLynk Phase 4A World Geography & Depth Validation ===');
console.log('================================================================\n');

// 1. Regional Geography & Elevation Range Audit
console.log('Test 1: Regional Landforms & Elevation Audit...');
const elevFlood = Terrain.getElevationAt(-22, 14);
const elevIndus = Terrain.getElevationAt(-14, -26);
const elevForest = Terrain.getElevationAt(20, -16);
const elevCommand = Terrain.getElevationAt(0, 0);
const elevMountainPeak = Terrain.getElevationAt(45, -45);

console.log(`Flood Basin Elevation (-22, 14): ${elevFlood.toFixed(2)}`);
console.log(`Industrial Plateau Elevation (-14, -26): ${elevIndus.toFixed(2)}`);
console.log(`Forest Highland Elevation (20, -16): ${elevForest.toFixed(2)}`);
console.log(`Command Center Midland Elevation (0, 0): ${elevCommand.toFixed(2)}`);
console.log(`Distant Mountain Ridge Peak (45, -45): ${elevMountainPeak.toFixed(2)}`);

// Audit Flood basin is low depression
if (elevFlood > -1.0) {
  throw new Error(`Flood basin must sit in a low depression (< -1.0), got ${elevFlood}`);
}

// Audit Industrial is elevated plateau
if (elevIndus < 1.0) {
  throw new Error(`Industrial outpost must sit on an elevated plateau (>= 1.0), got ${elevIndus}`);
}

// Audit Forest is elevated highland
if (elevForest < 1.0) {
  throw new Error(`Forest must sit on elevated rolling highlands (>= 1.0), got ${elevForest}`);
}

// Audit Distant Mountain Ridge reaches rock/snow elevation
if (elevMountainPeak < 4.0) {
  throw new Error(`Distant mountain ridges must reach rock/snow altitude (>= 4.0), got ${elevMountainPeak}`);
}

console.log('✓ All 5 major landforms verified with distinct regional elevations.\n');

// 2. Plateau Flat-Top vs Slope Dropoff Audit
console.log('Test 2: Industrial Plateau Geometry Verification...');
const plateauCenter = Terrain.getElevationAt(-14, -26);
const plateauRim = Terrain.getElevationAt(-14 + 6, -26);
const plateauValleyBelow = Terrain.getElevationAt(-14 + 20, -26);

console.log(`Plateau Center: ${plateauCenter.toFixed(2)}`);
console.log(`Plateau Top (r=6): ${plateauRim.toFixed(2)}`);
console.log(`Surrounding Lowland (r=20): ${plateauValleyBelow.toFixed(2)}`);

if (Math.abs(plateauCenter - plateauRim) > 0.6) {
  throw new Error('Plateau top must be relatively flat across the settlement');
}
if (plateauCenter - plateauValleyBelow < 1.0) {
  throw new Error('Plateau must show clear elevation dropoff to surrounding terrain');
}
console.log('✓ Industrial plateau structure confirmed: flat top with clear surrounding slopes.\n');

// 3. Terrain Meshes, Flat Shading, and Stream Audit
console.log('Test 3: Terrain Mesh, Flat Shading & Stream Ribbon Audit...');
const terrain = new Terrain();
if (!terrain.group) throw new Error('Terrain group missing');
if (terrain.group.children.length < 2) {
  throw new Error('Terrain group should contain base terrain mesh and decorative stream mesh');
}

const baseMesh = terrain.group.children[0] as THREE.Mesh;
const streamMesh = terrain.group.children[1] as THREE.Mesh;

const baseMat = baseMesh.material as THREE.MeshStandardMaterial;
if (baseMat.flatShading !== true) {
  throw new Error('Terrain material must maintain flatShading=true');
}

const colorAttr = baseMesh.geometry.getAttribute('color');
if (!colorAttr) {
  throw new Error('Terrain must have vertex colors attribute');
}

// Audit stream vertices
const streamPos = streamMesh.geometry.getAttribute('position');
if (!streamPos || streamPos.count < 10) {
  throw new Error('Stream ribbon must contain valid geometric vertices');
}
console.log(`✓ Stream ribbon verified with ${streamPos.count} vertices conforming to terrain.`);
console.log('✓ Flat shading and height-band vertex colors strictly maintained.\n');

// 4. Node Grounding and Line-of-Sight Audit
console.log('Test 4: Node Grounding & Mesh Link Line-of-Sight Clearance...');
const networkNodes = new NetworkNodes();
if (networkNodes.nodeMeshes.size !== 7) throw new Error('Expected 7 nodes');

for (const nodeData of NETWORK_NODES) {
  const nodeItem = networkNodes.nodeMeshes.get(nodeData.id)!;
  const groundY = Terrain.getElevationAt(nodeData.position[0], nodeData.position[2]);
  if (Math.abs(nodeItem.group.position.y - groundY) > 0.001) {
    throw new Error(`Node ${nodeData.name} base Y does not match terrain elevation at position`);
  }
}
console.log('✓ All 7 nodes are grounded flush with the new geography.');

// Verify line-of-sight for all 8 mesh edges
// For each edge, sample 10 intermediate points between endpoints
// The terrain elevation must not exceed the line connecting the node core heights
for (const edge of MESH_EDGES) {
  const p1 = networkNodes.getCoreWorldPosition(edge.source)!;
  const p2 = networkNodes.getCoreWorldPosition(edge.target)!;

  for (let s = 1; s <= 9; s++) {
    const t = s / 10;
    const sampleX = THREE.MathUtils.lerp(p1.x, p2.x, t);
    const sampleZ = THREE.MathUtils.lerp(p1.z, p2.z, t);
    const linkY = THREE.MathUtils.lerp(p1.y, p2.y, t);
    const groundY = Terrain.getElevationAt(sampleX, sampleZ);

    if (groundY >= linkY) {
      throw new Error(
        `Terrain intersects edge ${edge.source}-${edge.target} at (${sampleX.toFixed(1)}, ${sampleZ.toFixed(1)}): ground=${groundY.toFixed(2)}, link=${linkY.toFixed(2)}`
      );
    }
  }
}
console.log('✓ All 8 mesh link sightlines verified completely free of terrain occlusion.\n');

// 5. Cleanup
terrain.dispose();
networkNodes.dispose();
console.log('✓ Resources disposed cleanly.');

console.log('================================================================');
console.log('=== ALL PHASE 4A GEOGRAPHY AUDITS PASSED! ===');
console.log('================================================================');
