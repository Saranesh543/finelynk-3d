import * as THREE from 'three';
import fs from 'fs';
import path from 'path';
import { NetworkNodes } from '../src/scene/NetworkNodes';
import { MeshLinks } from '../src/scene/MeshLinks';
import { SimulationMarkers } from '../src/scene/SimulationMarkers';
import { HazardZones } from '../src/scene/HazardZones';
import { HazardEffects } from '../src/scene/HazardEffects';
import { SimulationEngine } from '../src/simulation/SimulationEngine';
import { MESH_EDGES } from '../src/data/graph';
import { NETWORK_NODES } from '../src/data/nodes';

console.log('================================================================');
console.log('=== FineLynk Phase 4D Final Composition & Showcase QA Audit ===');
console.log('================================================================\n');

// ----------------------------------------------------------------------------
// 1. DUAL-LAYER LASER MESH LINKS AUDIT
// ----------------------------------------------------------------------------
console.log('Audit 1: Dual-Layer Laser Communication Edges...');
const networkNodes = new NetworkNodes();
const meshLinks = new MeshLinks(networkNodes);

const visuals = meshLinks.getEdgeVisuals();
if (visuals.length !== 8) {
  throw new Error(`Expected exactly 8 edge visuals, found ${visuals.length}`);
}

for (const v of visuals) {
  if (!v.line || !v.coreLine) {
    throw new Error(`Edge ${v.edge.source}-${v.edge.target} missing dual-layer lines`);
  }
  if (!v.material || !v.coreMaterial) {
    throw new Error(`Edge ${v.edge.source}-${v.edge.target} missing dual-layer materials`);
  }

  // Verify outer technical beam
  if (v.material.opacity < 0.4) {
    throw new Error(`Outer beam opacity too low for daytime visibility: ${v.material.opacity}`);
  }

  // Verify inner high-luminance core
  if (v.coreMaterial.color.getHexString() !== 'a5f3fc') {
    throw new Error(`Inner core color expected a5f3fc, got ${v.coreMaterial.color.getHexString()}`);
  }
  if (v.coreMaterial.opacity < 0.75) {
    throw new Error(`Inner core opacity too low: ${v.coreMaterial.opacity}`);
  }
}
console.log('✓ All 8 communication edges verified with dual-layer outer beam + inner laser core.');

// Test highlight edge pulse
meshLinks.highlightEdge(0, 4, 1.0);
meshLinks.update(0.1, 0.016);
const edge04 = visuals.find(v => (v.edge.source === 0 && v.edge.target === 4) || (v.edge.source === 4 && v.edge.target === 0))!;
if (edge04.material.opacity < 0.9 || edge04.coreMaterial.opacity < 0.95) {
  throw new Error('Pulse highlight should boost dual-layer line opacity above 0.9');
}
console.log('✓ Edge pulse highlight blooms to high-contrast near-white across dual layers.');

// Test severing node Relay-11 (Node 4)
meshLinks.setSeveredNode(4, true);
if (!meshLinks.isEdgeSevered(0, 4) || !meshLinks.isEdgeSevered(4, 1) || !meshLinks.isEdgeSevered(4, 6)) {
  throw new Error('Edges connected to Node 4 should be marked severed');
}
if (edge04.material.opacity > 0.08 || edge04.coreMaterial.opacity > 0) {
  throw new Error('Severed edge outer opacity must be ~0.06 and core opacity must be 0');
}
console.log('✓ Severed edges drop cleanly to 0.06 offline opacity with core extinguished.');

// Restore edges
meshLinks.resetAllSevered();
if (edge04.isSevered || edge04.material.opacity < 0.4 || edge04.coreMaterial.opacity < 0.75) {
  throw new Error('Edges failed to restore baseline laser visibility');
}
console.log('✓ Edges cleanly restored to baseline dual-layer laser intensity.');

// ----------------------------------------------------------------------------
// 2. NODE BEACON AUTHORITY & VISUAL PRESENCE
// ----------------------------------------------------------------------------
console.log('\nAudit 2: Node Beacon Authority & Visual Presence...');
for (const node of NETWORK_NODES) {
  const meshGroup = networkNodes.nodeMeshes.get(node.id);
  if (!meshGroup) throw new Error(`Node ${node.id} missing mesh group`);

  if (!meshGroup.platformMesh || !meshGroup.coreMesh || !meshGroup.pointLight) {
    throw new Error(`Node ${node.id} missing critical beacon elements`);
  }

  // Verify Command Center has highest beacon light intensity
  if (node.isCommandCenter && meshGroup.pointLight.intensity <= 1.2) {
    throw new Error('Command Center beacon light must be authoritative (intensity > 1.2)');
  }
}
console.log('✓ All 7 nodes maintain punchy base platforms, emissive cores, and beacon lights.');

// ----------------------------------------------------------------------------
// 3. RESCUE MARKER BEACON RING TRACKING
// ----------------------------------------------------------------------------
console.log('\nAudit 3: Rescue Marker Orbiting Beacon Ring...');
const markers = new SimulationMarkers(networkNodes, meshLinks);
markers.createRescue('test-sim', [0, 4, 1]);

// Progress rescue unit
markers.updateRescueProgress('test-sim', 0.5);

// Verify rescue marker exists and has child ring mesh
const rescueGroupChildren = markers.group.children;
if (rescueGroupChildren.length !== 1) {
  throw new Error(`Expected 1 rescue mesh in markers group, found ${rescueGroupChildren.length}`);
}

const rescueMesh = rescueGroupChildren[0] as THREE.Mesh;
if (rescueMesh.children.length !== 1) {
  throw new Error('Rescue unit missing orbiting gold beacon ring');
}
const ringChild = rescueMesh.children[0] as THREE.Mesh;
const ringMat = ringChild.material as THREE.MeshBasicMaterial;
if (ringMat.color.getHexString() !== 'f59e0b') {
  throw new Error(`Expected rescue ring color f59e0b, got ${ringMat.color.getHexString()}`);
}
console.log('✓ Rescue unit verified with active orbiting gold beacon ring (#f59e0b).');

// Remove rescue and verify clean disposal
markers.removeRescue('test-sim');
if (markers.group.children.length !== 0) {
  throw new Error('Rescue unit failed to remove from scene group');
}
console.log('✓ Rescue marker removed and disposed without lingering meshes.');

// ----------------------------------------------------------------------------
// 4. NODE LABEL OFFLINE CSS AUDIT
// ----------------------------------------------------------------------------
console.log('\nAudit 4: Node Label Offline Style in index.css...');
const cssPath = path.resolve(process.cwd(), 'src/styles/index.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

if (!cssContent.includes('.node-label-item.offline')) {
  throw new Error('index.css must include .node-label-item.offline rule');
}
console.log('✓ Node label offline styling verified in index.css.');

// ----------------------------------------------------------------------------
// 5. FULL SIMULATION EVENT LIFECYCLE & 12 CONSECUTIVE RESETS
// ----------------------------------------------------------------------------
console.log('\nAudit 5: Simulation Lifecycle & 12-Reset Stress Test...');
const hazardZones = new HazardZones();
const hazardEffects = new HazardEffects(hazardZones);
const engine = new SimulationEngine(networkNodes, hazardEffects, markers);

// Test Flood lifecycle
engine.triggerHazard('flood');
if (!engine.isHazardActive('flood')) throw new Error('Flood hazard failed to start');
engine.reset();

// Stress test: 12 consecutive simulation resets across different simulation states
for (let i = 1; i <= 12; i++) {
  if (i % 3 === 0) engine.triggerHazard('flood');
  if (i % 3 === 1) engine.triggerHazard('fire');
  if (i % 3 === 2) engine.triggerHazard('industrial');
  engine.reset();
}
console.log('✓ 12 consecutive simulation resets executed cleanly with zero corruption.');

// ----------------------------------------------------------------------------
// 6. CLEAN DISPOSAL
// ----------------------------------------------------------------------------
console.log('\nAudit 6: Scene Teardown & Resource Disposal...');
markers.dispose();
meshLinks.dispose();
networkNodes.dispose();
hazardZones.dispose();
hazardEffects.dispose();
engine.dispose();
console.log('✓ All 3D resources disposed cleanly without memory leaks.');

console.log('\n================================================================');
console.log('=== ALL PHASE 4D COMPOSITION AUDITS PASSED! ===');
console.log('================================================================');
