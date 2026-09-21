import * as THREE from 'three';
import { NodeData, NETWORK_NODES } from '../data/nodes';
import { STATUS_COLORS, NodeStatus } from '../data/tokens';
import { Terrain } from './Terrain';

export interface NodeMeshGroup {
  data: NodeData;
  group: THREE.Group;
  platformMesh: THREE.Mesh;
  platformTrimMesh: THREE.Mesh;
  ringMesh: THREE.Mesh;
  beamMesh: THREE.Mesh;
  coreMesh: THREE.Mesh;
  coreSolidMesh: THREE.Mesh;
  pointLight: THREE.PointLight;
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
      // Layer 0 — Flat-Shaded Ground Platform (Outpost / Station base)
      // -------------------------------------------------------------
      const isCmd = node.isCommandCenter;
      const platRadiusTop = isCmd ? 2.1 : 1.35;
      const platRadiusBottom = isCmd ? 2.5 : 1.6;
      const platHeight = isCmd ? 0.38 : 0.22;
      const platSegments = isCmd ? 8 : 6; // Octagonal for Command, Hexagonal for nodes

      const platGeom = new THREE.CylinderGeometry(
        platRadiusTop,
        platRadiusBottom,
        platHeight,
        platSegments
      );
      const platMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(isCmd ? '#243247' : '#2b3a4f'),
        flatShading: true,
        roughness: 0.85,
        metalness: 0.15,
      });
      const platformMesh = new THREE.Mesh(platGeom, platMat);
      platformMesh.position.y = platHeight / 2;
      nodeGroup.add(platformMesh);

      // Status-colored accent trim ring on platform top
      const trimGeom = new THREE.RingGeometry(platRadiusTop * 0.72, platRadiusTop * 0.94, platSegments);
      trimGeom.rotateX(-Math.PI / 2);
      const trimMat = new THREE.MeshBasicMaterial({
        color: statusColor.clone(),
        side: THREE.DoubleSide,
        depthWrite: false,
        transparent: true,
        opacity: 0.75,
      });
      const platformTrimMesh = new THREE.Mesh(trimGeom, trimMat);
      platformTrimMesh.position.y = platHeight + 0.015;
      nodeGroup.add(platformTrimMesh);

      // -------------------------------------------------------------
      // Layer 1 — Ground Ring: Floating status ring above platform
      // -------------------------------------------------------------
      const ringGeom = new THREE.RingGeometry(1.08, 1.32, 36);
      ringGeom.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: statusColor.clone(),
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.position.y = platHeight + 0.14;
      nodeGroup.add(ringMesh);

      // -------------------------------------------------------------
      // Layer 2 — Beam: Thin vertical cylinder with punchy visibility
      // -------------------------------------------------------------
      const beamGeom = new THREE.CylinderGeometry(0.06, 0.06, node.beamHeight, 16);
      const beamMat = new THREE.MeshBasicMaterial({
        color: statusColor.clone(),
        transparent: true,
        opacity: 0.42,
      });
      const beamMesh = new THREE.Mesh(beamGeom, beamMat);
      beamMesh.position.y = node.beamHeight / 2;
      nodeGroup.add(beamMesh);

      // -------------------------------------------------------------
      // Layer 3 — Core: Punchy Luminous Solid Core + Wireframe Facet
      // Emissive Intensity ~1.1 to 1.3 for daytime map clarity
      // -------------------------------------------------------------
      const coreGeom = node.isCommandCenter
        ? new THREE.OctahedronGeometry(node.coreRadius, 0)
        : new THREE.IcosahedronGeometry(node.coreRadius, 0);

      const coreWireMat = new THREE.MeshBasicMaterial({
        color: statusColor.clone(),
        wireframe: true,
      });
      const coreMesh = new THREE.Mesh(coreGeom, coreWireMat);
      coreMesh.position.y = node.coreElevation;

      // Solid luminous inner core
      const innerRadius = node.coreRadius * 0.78;
      const coreSolidGeom = node.isCommandCenter
        ? new THREE.OctahedronGeometry(innerRadius, 0)
        : new THREE.IcosahedronGeometry(innerRadius, 0);

      const coreSolidMat = new THREE.MeshStandardMaterial({
        color: statusColor.clone(),
        emissive: statusColor.clone(),
        emissiveIntensity: 1.25,
        flatShading: true,
        roughness: 0.2,
      });
      const coreSolidMesh = new THREE.Mesh(coreSolidGeom, coreSolidMat);
      coreMesh.add(coreSolidMesh);

      nodeGroup.add(coreMesh);

      // -------------------------------------------------------------
      // Layer 4 — Beacon Light: Punchy local point light at core elevation
      // -------------------------------------------------------------
      const initialIntensity = node.isCommandCenter ? 1.4 : 1.15;
      const pointLight = new THREE.PointLight(statusColor.clone(), initialIntensity, 16);
      pointLight.position.set(0, node.coreElevation, 0);
      nodeGroup.add(pointLight);

      // Store world position of the core center for mesh links and labels
      const coreWorldPos = new THREE.Vector3(nx, baseY + node.coreElevation, nz);

      this.group.add(nodeGroup);
      this.nodeMeshes.set(node.id, {
        data: node,
        group: nodeGroup,
        platformMesh,
        platformTrimMesh,
        ringMesh,
        beamMesh,
        coreMesh,
        coreSolidMesh,
        pointLight,
        coreWorldPos,
      });

      this.disposables.push(
        { geometry: platGeom, material: platMat },
        { geometry: trimGeom, material: trimMat },
        { geometry: ringGeom, material: ringMat },
        { geometry: beamGeom, material: beamMat },
        { geometry: coreGeom, material: coreWireMat },
        { geometry: coreSolidGeom, material: coreSolidMat }
      );
    });
  }

  // Update loop for subtle tactical core rotation & breathing
  public update(time: number): void {
    this.nodeMeshes.forEach(({ coreMesh, beamMesh, ringMesh, pointLight, data }) => {
      if (data.status === 'critical') {
        // High-urgency tactical pulse
        const urgencySpeed = 2.4;
        coreMesh.rotation.y = time * urgencySpeed;
        coreMesh.rotation.x = Math.sin(time * 4.0) * 0.25;

        // Tactical scale oscillation
        const scale = 1.0 + 0.16 * Math.sin(time * 8.0);
        coreMesh.scale.set(scale, scale, scale);

        // Pulsing ring, beam, and point light intensity
        (ringMesh.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.35 * Math.sin(time * 8.0);
        (beamMesh.material as THREE.MeshBasicMaterial).opacity = 0.38 + 0.25 * Math.sin(time * 8.0);
        pointLight.intensity = 1.2 + 0.6 * Math.sin(time * 8.0);
      } else {
        // Normal subtle idle animation
        const rotSpeed = data.isCommandCenter ? 0.35 : 0.65;
        coreMesh.rotation.y = time * rotSpeed;
        coreMesh.rotation.x = Math.sin(time * 0.5) * 0.15;
        coreMesh.scale.set(1.0, 1.0, 1.0);

        // Default opacities and steady beacon light
        (ringMesh.material as THREE.MeshBasicMaterial).opacity = 0.65;
        (beamMesh.material as THREE.MeshBasicMaterial).opacity = 0.42;
        pointLight.intensity = data.status === 'offline' ? 0.1 : (data.isCommandCenter ? 1.4 : 1.15);
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

    (nodeItem.platformTrimMesh.material as THREE.MeshBasicMaterial).color.copy(color);
    (nodeItem.ringMesh.material as THREE.MeshBasicMaterial).color.copy(color);
    (nodeItem.beamMesh.material as THREE.MeshBasicMaterial).color.copy(color);
    (nodeItem.coreMesh.material as THREE.MeshBasicMaterial).color.copy(color);

    const solidMat = nodeItem.coreSolidMesh.material as THREE.MeshStandardMaterial;
    solidMat.color.copy(color);
    solidMat.emissive.copy(color);

    nodeItem.pointLight.color.copy(color);

    // If offline, reduce beam/ring opacity and dim light
    if (status === 'offline') {
      (nodeItem.ringMesh.material as THREE.MeshBasicMaterial).opacity = 0.2;
      (nodeItem.beamMesh.material as THREE.MeshBasicMaterial).opacity = 0.12;
      solidMat.emissiveIntensity = 0.2;
      nodeItem.pointLight.intensity = 0.1;
    } else {
      (nodeItem.ringMesh.material as THREE.MeshBasicMaterial).opacity = 0.65;
      (nodeItem.beamMesh.material as THREE.MeshBasicMaterial).opacity = 0.42;
      solidMat.emissiveIntensity = 1.25;
      nodeItem.pointLight.intensity = nodeItem.data.isCommandCenter ? 1.4 : 1.15;
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
