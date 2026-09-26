import * as THREE from 'three';
import { MESH_EDGES, MeshEdge } from '../data/graph';
import { TOKENS } from '../data/tokens';
import { NetworkNodes } from './NetworkNodes';

interface EdgeVisual {
  edge: MeshEdge;
  line: THREE.Line;
  material: THREE.LineBasicMaterial;
  coreLine: THREE.Line;
  coreMaterial: THREE.LineBasicMaterial;
  phaseOffset: number;
  highlightIntensity: number; // 0 to 1
  isSevered: boolean;
  isActiveRoute: boolean;
}

export class MeshLinks {
  public group: THREE.Group;
  private edgeVisuals: EdgeVisual[] = [];
  private isVisible: boolean = true;
  private baseCyan = new THREE.Color(TOKENS.colors.cyan);
  private coreCyan = new THREE.Color('#a5f3fc'); // High-luminance inner laser core
  private pulseWhite = new THREE.Color('#ffffff');
  private severedColor = new THREE.Color(TOKENS.colors.offline); // #334155

  constructor(networkNodes: NetworkNodes) {
    this.group = new THREE.Group();
    this.buildLinks(networkNodes);
  }

  private buildLinks(networkNodes: NetworkNodes): void {
    MESH_EDGES.forEach((edge, index) => {
      const p1 = networkNodes.getCoreWorldPosition(edge.source);
      const p2 = networkNodes.getCoreWorldPosition(edge.target);

      if (!p1 || !p2) return;

      const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);

      const isCore = !!edge.isCoreEdge;

      // 1. Outer technical beam line (Subtle for field mesh, stronger for core)
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(TOKENS.colors.cyan),
        transparent: true,
        opacity: isCore ? 0.52 : 0.28,
        depthWrite: false,
      });
      const line = new THREE.Line(geometry, material);
      this.group.add(line);

      // 2. Inner high-luminance laser core line
      const coreMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color('#a5f3fc'),
        transparent: true,
        opacity: isCore ? 0.78 : 0.40,
        depthWrite: false,
      });
      const coreLine = new THREE.Line(geometry, coreMaterial);
      this.group.add(coreLine);

      // Distinct phase offset per edge so they don't pulse simultaneously
      const phaseOffset = index * 0.85 + (edge.source + edge.target) * 0.3;

      this.edgeVisuals.push({
        edge,
        line,
        material,
        coreLine,
        coreMaterial,
        phaseOffset,
        highlightIntensity: 0,
        isSevered: false,
        isActiveRoute: false,
      });
    });
  }

  /**
   * Temporarily illuminate an edge in near-white when a pulse passes across it.
   */
  public highlightEdge(source: number, target: number, intensity: number = 1.0): void {
    for (const item of this.edgeVisuals) {
      if (item.isSevered) continue; // Severed edges do not highlight
      if (
        (item.edge.source === source && item.edge.target === target) ||
        (item.edge.source === target && item.edge.target === source)
      ) {
        item.highlightIntensity = Math.max(item.highlightIntensity, intensity);
      }
    }
  }

  private blockedNodes: Set<number> = new Set();

  /**
   * Updates severed status across all links based on the active set of blocked nodes.
   * An edge is severed if either of its terminal nodes is offline.
   */
  public updateBlockedNodes(blockedNodeIds: Set<number>): void {
    this.blockedNodes = new Set(blockedNodeIds);
    for (const item of this.edgeVisuals) {
      const severed = this.blockedNodes.has(item.edge.source) || this.blockedNodes.has(item.edge.target);
      item.isSevered = severed;
      if (severed) {
        item.highlightIntensity = 0;
        item.material.color.copy(this.severedColor);
        item.material.opacity = 0.06;
        item.coreMaterial.opacity = 0;
      } else {
        item.material.color.copy(this.baseCyan);
        item.material.opacity = 0.55;
        item.coreMaterial.color.copy(this.coreCyan);
        item.coreMaterial.opacity = 0.82;
      }
    }
  }

  /**
   * Visually sever or restore all edges touching a specific node (e.g. Relay-11, Relay-15, etc.).
   * Correctly accounts for multi-node failures so that restoring one node does not
   * inadvertently unsever an edge if its opposing endpoint is still offline.
   */
  public setSeveredNode(nodeId: number, severed: boolean): void {
    if (severed) {
      this.blockedNodes.add(nodeId);
    } else {
      this.blockedNodes.delete(nodeId);
    }
    this.updateBlockedNodes(this.blockedNodes);
  }

  public resetAllSevered(): void {
    this.blockedNodes.clear();
    this.updateBlockedNodes(this.blockedNodes);
  }

  /**
   * Highlights edges along a specific path (e.g. active BFS route)
   */
  public highlightPath(path: number[]): void {
    if (!path || path.length < 2) return;
    for (let i = 0; i < path.length - 1; i++) {
      this.highlightEdge(path[i], path[i + 1], 0.85);
    }
  }

  public getEdgeVisuals(): readonly EdgeVisual[] {
    return this.edgeVisuals;
  }

  public isEdgeSevered(source: number, target: number): boolean {
    const item = this.edgeVisuals.find(
      (v) =>
        (v.edge.source === source && v.edge.target === target) ||
        (v.edge.source === target && v.edge.target === source)
    );
    return item ? item.isSevered : false;
  }

  private activeRouteEdges: Set<string> = new Set();

  /**
   * Sets the active BFS routes currently engaged for hazard response or node inspection.
   * Edges along active routes are dynamically illuminated with higher luminance.
   */
  public setActiveRoutes(paths: number[][]): void {
    this.activeRouteEdges.clear();
    for (const path of paths) {
      if (!path || path.length < 2) continue;
      for (let i = 0; i < path.length - 1; i++) {
        const u = Math.min(path[i], path[i + 1]);
        const v = Math.max(path[i], path[i + 1]);
        this.activeRouteEdges.add(`${u}-${v}`);
      }
    }
    for (const item of this.edgeVisuals) {
      const edgeKey = `${Math.min(item.edge.source, item.edge.target)}-${Math.max(item.edge.source, item.edge.target)}`;
      item.isActiveRoute = this.activeRouteEdges.has(edgeKey);
    }
  }

  public isEdgeActiveRoute(source: number, target: number): boolean {
    const u = Math.min(source, target);
    const v = Math.max(source, target);
    return this.activeRouteEdges.has(`${u}-${v}`);
  }

  // Update loop for subtle idle shimmer, route illumination, and highlight decay
  public update(time: number, delta: number = 0.016): void {
    if (!this.isVisible) return;

    for (const item of this.edgeVisuals) {
      if (item.isSevered) {
        // Keep severed edges at ~6% opacity and offline color
        item.material.color.copy(this.severedColor);
        item.material.opacity = 0.06;
        item.coreMaterial.opacity = 0;
        continue;
      }

      const edgeKey = `${Math.min(item.edge.source, item.edge.target)}-${Math.max(item.edge.source, item.edge.target)}`;
      const isActiveRoute = this.activeRouteEdges.has(edgeKey);

      // Decay highlight intensity smoothly
      if (item.highlightIntensity > 0) {
        item.highlightIntensity = Math.max(0, item.highlightIntensity - delta * 2.2);
      }

      // Shimmer oscillation for outer beam (subtle for field mesh, stronger for core)
      const isCore = !!item.edge.isCoreEdge;
      const baseShimmer = isCore
        ? 0.52 + 0.10 * Math.sin(time * 1.6 + item.phaseOffset)
        : 0.28 + 0.06 * Math.sin(time * 1.6 + item.phaseOffset);
      const baseCoreShimmer = isCore
        ? 0.78 + 0.08 * Math.sin(time * 1.6 + item.phaseOffset)
        : 0.40 + 0.06 * Math.sin(time * 1.6 + item.phaseOffset);

      if (item.highlightIntensity > 0) {
        // Blend towards bright white and high opacity (pulse passing)
        item.material.color.copy(this.baseCyan).lerp(this.pulseWhite, item.highlightIntensity);
        item.material.opacity = THREE.MathUtils.lerp(baseShimmer, 0.98, item.highlightIntensity);

        item.coreMaterial.color.copy(this.coreCyan).lerp(this.pulseWhite, item.highlightIntensity);
        item.coreMaterial.opacity = THREE.MathUtils.lerp(baseCoreShimmer, 1.0, item.highlightIntensity);
      } else if (isActiveRoute) {
        // Active tactical BFS route illumination
        const routePulse = 0.82 + 0.16 * Math.sin(time * 3.2 + item.phaseOffset);
        item.material.color.copy(this.baseCyan);
        item.material.opacity = 0.88;

        item.coreMaterial.color.copy(this.coreCyan).lerp(this.pulseWhite, 0.45);
        item.coreMaterial.opacity = routePulse;
      } else {
        item.material.color.copy(this.baseCyan);
        item.material.opacity = baseShimmer;

        item.coreMaterial.color.copy(this.coreCyan);
        item.coreMaterial.opacity = baseCoreShimmer;
      }
    }
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.group.visible = visible;
  }

  public dispose(): void {
    for (const item of this.edgeVisuals) {
      item.line.geometry.dispose();
      item.material.dispose();
      item.coreMaterial.dispose();
    }
  }
}
