import * as THREE from 'three';
import { TOKENS } from '../data/tokens';

export class Terrain {
  public group: THREE.Group;
  private baseMesh: THREE.Mesh;
  private wireMesh: THREE.Mesh;
  private geometry: THREE.PlaneGeometry;

  constructor() {
    this.group = new THREE.Group();

    // 140 x 140 plane with 60 x 60 segments as confirmed in user review
    const size = 140;
    const segments = 60;
    this.geometry = new THREE.PlaneGeometry(size, size, segments, segments);

    // Apply deterministic rolling terrain elevation
    this.applyElevation();

    // Rotate plane to lie horizontally on XZ plane
    this.geometry.rotateX(-Math.PI / 2);
    this.geometry.computeVertexNormals();

    // Base Mesh (Near-black #081222, blocks the void, unlit)
    const baseMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(TOKENS.colors.terrainBase),
      side: THREE.DoubleSide,
    });
    this.baseMesh = new THREE.Mesh(this.geometry, baseMaterial);

    // Wireframe Mesh (Holographic tactical grid, #1c3a5c, 50% opacity)
    const wireMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(TOKENS.colors.terrainWire),
      wireframe: true,
      transparent: true,
      opacity: 0.50,
      depthWrite: false, // Prevents z-fighting with the base mesh
    });
    this.wireMesh = new THREE.Mesh(this.geometry, wireMaterial);
    // Slight upward offset to guarantee wireframe visibility over base
    this.wireMesh.position.y = 0.02;

    this.group.add(this.baseMesh);
    this.group.add(this.wireMesh);
  }

  // Deterministic elevation function
  // Amplitude ~1.5 - 2.2 units
  public static getElevationAt(x: number, z: number): number {
    return (
      Math.sin(x * 0.052) * Math.cos(z * 0.052) * 1.5 +
      Math.sin(x * 0.11 + z * 0.09) * 0.65
    );
  }

  private applyElevation(): void {
    const positionAttr = this.geometry.attributes.position;
    for (let i = 0; i < positionAttr.count; i++) {
      const x = positionAttr.getX(i);
      const y = positionAttr.getY(i); // Y in 2D plane corresponds to Z in 3D world after rotateX
      const elevation = Terrain.getElevationAt(x, -y);
      // Displace along local Z (which becomes world Y after rotateX)
      positionAttr.setZ(i, elevation);
    }
    positionAttr.needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    (this.baseMesh.material as THREE.Material).dispose();
    (this.wireMesh.material as THREE.Material).dispose();
  }
}
