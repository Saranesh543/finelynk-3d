import * as THREE from 'three';
import { NodeData, NETWORK_NODES } from '../data/nodes';
import { STATUS_COLORS, NodeStatus } from '../data/tokens';
import { Terrain } from './Terrain';

export interface NodeMeshGroup {
  data: NodeData;
  group: THREE.Group;
  ringMesh: THREE.Mesh;
  beamMesh: THREE.Mesh;
  coreMesh: THREE.Mesh;
  coreWorldPos: THREE.Vector3;
}

export class NetworkNodes {
  public group: THREE.Group;
  public nodeMeshes: Map<number, NodeMeshGroup> = new Map();
  private disposables: { geometry?: THREE.BufferGeometry; material?: THREE.Material }[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.buildNodes();
  }

  private buildNodes(): void {
    NETWORK_NODES.forEach((node) => {
      const nodeGroup = new THREE.Group();
      const [nx, , nz] = node.position;
      const baseY = Terrain.getElevationAt(nx, nz);

      nodeGroup.position.set(nx, baseY, nz);

      const statusColor = new THREE.Color(STATUS_COLORS[node.status]);

      // -------------------------------------------------------------
      // Layer 1 — Ground Ring: Flat ring/torus, y ≈ 0.12, r ≈ 1.1–1.35, op ≈ 55%
      // -------------------------------------------------------------
      const ringGeom = new THREE.RingGeometry(1.08, 1.32, 36);
      ringGeom.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: statusColor,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.position.y = 0.12;
      nodeGroup.add(ringMesh);

      // -------------------------------------------------------------
      // Layer 2 — Beam: Thin vertical cylinder, r ≈ 0.055, op ≈ 30%
      // Height: 6.4 for normal nodes, 11 for Command Center
      // -------------------------------------------------------------
      const beamGeom = new THREE.CylinderGeometry(0.055, 0.055, node.beamHeight, 16);
      const beamMat = new THREE.MeshBasicMaterial({
        color: statusColor,
        transparent: true,
        opacity: 0.30,
      });
      const beamMesh = new THREE.Mesh(beamGeom, beamMat);
      beamMesh.position.y = node.beamHeight / 2;
      nodeGroup.add(beamMesh);

      // -------------------------------------------------------------
      // Layer 3 — Core: Icosahedron (r ≈ 0.5) or Octahedron (r ≈ 1.15) for Command
      // Positioned at ~55% of beam height (coreElevation)
      // -------------------------------------------------------------
      const coreGeom = node.isCommandCenter
        ? new THREE.OctahedronGeometry(node.coreRadius, 0)
        : new THREE.IcosahedronGeometry(node.coreRadius, 0);

      // Wireframe overlay for faceted tactical tech aesthetic
      const coreMat = new THREE.MeshBasicMaterial({
        color: statusColor,
        wireframe: true,
      });
      const coreMesh = new THREE.Mesh(coreGeom, coreMat);
      coreMesh.position.y = node.coreElevation;
      nodeGroup.add(coreMesh);

      // Store world position of the core center for mesh links and labels
      const coreWorldPos = new THREE.Vector3(nx, baseY + node.coreElevation, nz);

      this.group.add(nodeGroup);
      this.nodeMeshes.set(node.id, {
        data: node,
        group: nodeGroup,
        ringMesh,
        beamMesh,
        coreMesh,
        coreWorldPos,
      });

      this.disposables.push(
        { geometry: ringGeom, material: ringMat },
        { geometry: beamGeom, material: beamMat },
        { geometry: coreGeom, material: coreMat }
      );
    });
  }

  // Update loop for subtle tactical core rotation & breathing
  public update(time: number): void {
    this.nodeMeshes.forEach(({ coreMesh, beamMesh, ringMesh, data }) => {
      if (data.status === 'critical') {
        // High-urgency tactical pulse
        const urgencySpeed = 2.4;
        coreMesh.rotation.y = time * urgencySpeed;
        coreMesh.rotation.x = Math.sin(time * 4.0) * 0.25;

        // Tactical scale oscillation
        const scale = 1.0 + 0.16 * Math.sin(time * 8.0);
        coreMesh.scale.set(scale, scale, scale);

        // Pulsing ring and beam opacity
        (ringMesh.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.35 * Math.sin(time * 8.0);
        (beamMesh.material as THREE.MeshBasicMaterial).opacity = 0.30 + 0.25 * Math.sin(time * 8.0);
      } else {
        // Normal subtle idle animation
        const rotSpeed = data.isCommandCenter ? 0.35 : 0.65;
        coreMesh.rotation.y = time * rotSpeed;
        coreMesh.rotation.x = Math.sin(time * 0.5) * 0.15;
        coreMesh.scale.set(1.0, 1.0, 1.0);

        // Default opacities
        (ringMesh.material as THREE.MeshBasicMaterial).opacity = 0.55;
        (beamMesh.material as THREE.MeshBasicMaterial).opacity = 0.30;
      }
    });
  }

  /**
   * Dynamically update node status and all visual layers.
   */
  public setNodeStatus(nodeId: number, status: NodeStatus, force: boolean = false): void {
    const nodeItem = this.nodeMeshes.get(nodeId);
    if (!nodeItem) return;

    // Do not overwrite offline status with hazard statuses unless forced or restoring
    if (!force && nodeItem.data.status === 'offline' && status !== 'safe' && status !== 'offline') {
      return;
    }

    nodeItem.data.status = status;
    const color = new THREE.Color(STATUS_COLORS[status]);

    (nodeItem.ringMesh.material as THREE.MeshBasicMaterial).color.copy(color);
    (nodeItem.beamMesh.material as THREE.MeshBasicMaterial).color.copy(color);
    (nodeItem.coreMesh.material as THREE.MeshBasicMaterial).color.copy(color);

    // If offline, reduce beam/ring opacity slightly to look inactive
    if (status === 'offline') {
      (nodeItem.ringMesh.material as THREE.MeshBasicMaterial).opacity = 0.25;
      (nodeItem.beamMesh.material as THREE.MeshBasicMaterial).opacity = 0.15;
    } else {
      (nodeItem.ringMesh.material as THREE.MeshBasicMaterial).opacity = 0.55;
      (nodeItem.beamMesh.material as THREE.MeshBasicMaterial).opacity = 0.30;
    }
  }

  public resetAllNodes(): void {
    this.nodeMeshes.forEach((nodeItem) => {
      const defaultStatus: NodeStatus = nodeItem.data.isCommandCenter ? 'command' : 'safe';
      this.setNodeStatus(nodeItem.data.id, defaultStatus, true);
      nodeItem.coreMesh.scale.set(1.0, 1.0, 1.0);
    });
  }

  public getNodeStatus(nodeId: number): NodeStatus | undefined {
    return this.nodeMeshes.get(nodeId)?.data.status;
  }

  public getCoreWorldPosition(nodeId: number): THREE.Vector3 | null {
    const node = this.nodeMeshes.get(nodeId);
    return node ? node.coreWorldPos.clone() : null;
  }

  public dispose(): void {
    for (const d of this.disposables) {
      d.geometry?.dispose();
      d.material?.dispose();
    }
  }
}
