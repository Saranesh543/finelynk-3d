import * as THREE from 'three';
import { NetworkNodes } from './NetworkNodes';
import { MeshLinks } from './MeshLinks';

interface PathMarkerInstance {
  simId: string;
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshBasicMaterial;
  waypoints: THREE.Vector3[];
  nodeIds: number[];
}

export class SimulationMarkers {
  public group: THREE.Group;
  private networkNodes: NetworkNodes;
  private meshLinks: MeshLinks;

  private activePulses: Map<string, PathMarkerInstance> = new Map();
  private activeRescues: Map<string, PathMarkerInstance> = new Map();

  constructor(networkNodes: NetworkNodes, meshLinks: MeshLinks) {
    this.group = new THREE.Group();
    this.networkNodes = networkNodes;
    this.meshLinks = meshLinks;
  }

  // -------------------------------------------------------------
  // Alert Pulse Marker (Forward from Hazard -> Command)
  // -------------------------------------------------------------
  public createPulse(simId: string, path: number[]): void {
    this.removePulse(simId); // Cleanup any previous instance

    const waypoints: THREE.Vector3[] = [];
    for (const nodeId of path) {
      const pos = this.networkNodes.getCoreWorldPosition(nodeId);
      if (pos) waypoints.push(pos);
    }

    if (waypoints.length < 2) return;

    // Compact glowing pulse marker
    const geom = new THREE.SphereGeometry(0.26, 12, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffffff'),
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(waypoints[0]);
    this.group.add(mesh);

    this.activePulses.set(simId, {
      simId,
      mesh,
      geometry: geom,
      material: mat,
      waypoints,
      nodeIds: path,
    });
  }

  public updatePulseProgress(simId: string, progress: number): void {
    const pulse = this.activePulses.get(simId);
    if (!pulse) return;

    const clamped = Math.max(0, Math.min(1, progress));
    const segments = pulse.waypoints.length - 1;
    if (segments <= 0) return;

    const segmentFloat = clamped * segments;
    const segIndex = Math.min(Math.floor(segmentFloat), segments - 1);
    const t = segmentFloat - segIndex;

    const pA = pulse.waypoints[segIndex];
    const pB = pulse.waypoints[segIndex + 1];

    pulse.mesh.position.lerpVectors(pA, pB, t);

    // Highlight active edge being traversed
    const u = pulse.nodeIds[segIndex];
    const v = pulse.nodeIds[segIndex + 1];
    this.meshLinks.highlightEdge(u, v, 1.0);
  }

  public removePulse(simId: string): void {
    const pulse = this.activePulses.get(simId);
    if (!pulse) return;

    this.group.remove(pulse.mesh);
    pulse.geometry.dispose();
    pulse.material.dispose();
    this.activePulses.delete(simId);
  }

  // -------------------------------------------------------------
  // Rescue Unit Marker (Gold, Reversed path: Command -> Hazard)
  // -------------------------------------------------------------
  public createRescue(simId: string, path: number[]): void {
    this.removeRescue(simId);

    // Strictly reverse the exact forward broadcast path
    const reversedNodeIds = [...path].reverse();
    const waypoints: THREE.Vector3[] = [];
    for (const nodeId of reversedNodeIds) {
      const pos = this.networkNodes.getCoreWorldPosition(nodeId);
      if (pos) waypoints.push(pos);
    }

    if (waypoints.length < 2) return;

    // Gold rescue marker (#fbbf24)
    const geom = new THREE.SphereGeometry(0.32, 14, 14);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#fbbf24'),
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(waypoints[0]);
    this.group.add(mesh);

    this.activeRescues.set(simId, {
      simId,
      mesh,
      geometry: geom,
      material: mat,
      waypoints,
      nodeIds: reversedNodeIds,
    });
  }

  public updateRescueProgress(simId: string, progress: number): void {
    const rescue = this.activeRescues.get(simId);
    if (!rescue) return;

    const clamped = Math.max(0, Math.min(1, progress));
    const segments = rescue.waypoints.length - 1;
    if (segments <= 0) return;

    const segmentFloat = clamped * segments;
    const segIndex = Math.min(Math.floor(segmentFloat), segments - 1);
    const t = segmentFloat - segIndex;

    const pA = rescue.waypoints[segIndex];
    const pB = rescue.waypoints[segIndex + 1];

    rescue.mesh.position.lerpVectors(pA, pB, t);

    // Subtle edge illumination along rescue route as well
    const u = rescue.nodeIds[segIndex];
    const v = rescue.nodeIds[segIndex + 1];
    this.meshLinks.highlightEdge(u, v, 0.65);
  }

  public removeRescue(simId: string): void {
    const rescue = this.activeRescues.get(simId);
    if (!rescue) return;

    this.group.remove(rescue.mesh);
    rescue.geometry.dispose();
    rescue.material.dispose();
    this.activeRescues.delete(simId);
  }

  public clearAll(): void {
    for (const id of Array.from(this.activePulses.keys())) {
      this.removePulse(id);
    }
    for (const id of Array.from(this.activeRescues.keys())) {
      this.removeRescue(id);
    }
  }

  public dispose(): void {
    this.clearAll();
  }
}
