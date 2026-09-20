import * as THREE from 'three';
import { MESH_EDGES, MeshEdge } from '../data/graph';
import { TOKENS } from '../data/tokens';
import { NetworkNodes } from './NetworkNodes';

interface EdgeVisual {
  edge: MeshEdge;
  line: THREE.Line;
  material: THREE.LineBasicMaterial;
  phaseOffset: number;
  highlightIntensity: number; // 0 to 1
  isSevered: boolean;
}

export class MeshLinks {
  public group: THREE.Group;
  private edgeVisuals: EdgeVisual[] = [];
  private isVisible: boolean = true;
  private baseCyan = new THREE.Color(TOKENS.colors.cyan);
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
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(TOKENS.colors.cyan),
        transparent: true,
        opacity: 0.35,
        linewidth: 1,
      });

      const line = new THREE.Line(geometry, material);
      this.group.add(line);

      // Distinct phase offset per edge so they don't pulse simultaneously
      const phaseOffset = index * 0.85 + (edge.source + edge.target) * 0.3;

      this.edgeVisuals.push({
        edge,
        line,
        material,
        phaseOffset,
        highlightIntensity: 0,
        isSevered: false,
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

  /**
   * Visually sever or restore all edges touching a specific node (e.g. Relay-11).
   * Severed edges drop to ~6% opacity (#334155), remaining faintly visible.
   */
  public setSeveredNode(nodeId: number, severed: boolean): void {
    for (const item of this.edgeVisuals) {
      if (item.edge.source === nodeId || item.edge.target === nodeId) {
        item.isSevered = severed;
        if (severed) {
          item.highlightIntensity = 0;
          item.material.color.copy(this.severedColor);
          item.material.opacity = 0.06;
        } else {
          item.material.color.copy(this.baseCyan);
          item.material.opacity = 0.35;
        }
      }
    }
  }

  public resetAllSevered(): void {
    for (const item of this.edgeVisuals) {
      item.isSevered = false;
      item.highlightIntensity = 0;
      item.material.color.copy(this.baseCyan);
      item.material.opacity = 0.35;
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

  // Update loop for subtle idle shimmer and highlight decay
  public update(time: number, delta: number = 0.016): void {
    if (!this.isVisible) return;

    for (const item of this.edgeVisuals) {
      if (item.isSevered) {
        // Keep severed edges at ~6% opacity and offline color
        item.material.color.copy(this.severedColor);
        item.material.opacity = 0.06;
        continue;
      }

      // Decay highlight intensity smoothly
      if (item.highlightIntensity > 0) {
        item.highlightIntensity = Math.max(0, item.highlightIntensity - delta * 2.2);
      }

      // Base sine shimmer: oscillates between ~0.20 and ~0.42
      const shimmer = 0.31 + 0.11 * Math.sin(time * 1.6 + item.phaseOffset);

      if (item.highlightIntensity > 0) {
        // Blend towards bright white and high opacity
        item.material.color.copy(this.baseCyan).lerp(this.pulseWhite, item.highlightIntensity);
        item.material.opacity = THREE.MathUtils.lerp(shimmer, 0.95, item.highlightIntensity);
      } else {
        item.material.color.copy(this.baseCyan);
        item.material.opacity = shimmer;
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
    }
  }
}
