import * as THREE from 'three';
import { HAZARD_ZONES, getDeterministicFireTrees, getDeterministicIndustrialBuildings } from '../data/hazards';
import { Terrain } from './Terrain';

export class HazardZones {
  public group: THREE.Group;
  private disposables: { geometry?: THREE.BufferGeometry; material?: THREE.Material }[] = [];
  private riverMesh: THREE.Mesh | null = null;
  private riverMaterial: THREE.MeshBasicMaterial | null = null;
  private riverBaseY: number = 0;

  constructor() {
    this.group = new THREE.Group();

    this.createFloodZone();
    this.createFireZone();
    this.createIndustrialZone();
  }

  // Create terrain-conforming circular zone disc
  private createZoneDisc(
    cx: number,
    cz: number,
    radius: number,
    colorHex: string,
    opacity: number
  ): THREE.Mesh {
    const segments = 48;
    const ringSegments = 12;
    const geom = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];

    // Center vertex
    const centerElev = Terrain.getElevationAt(cx, cz) + 0.05;
    vertices.push(cx, centerElev, cz);

    // Rings from center to edge
    for (let r = 1; r <= ringSegments; r++) {
      const currentR = (r / ringSegments) * radius;
      for (let s = 0; s < segments; s++) {
        const angle = (s / segments) * Math.PI * 2;
        const px = cx + Math.cos(angle) * currentR;
        const pz = cz + Math.sin(angle) * currentR;
        const py = Terrain.getElevationAt(px, pz) + 0.05;
        vertices.push(px, py, pz);
      }
    }

    // Indices for center fan
    for (let s = 0; s < segments; s++) {
      const nextS = (s + 1) % segments;
      indices.push(0, 1 + s, 1 + nextS);
    }

    // Indices for concentric rings
    for (let r = 1; r < ringSegments; r++) {
      const currentRingStart = 1 + (r - 1) * segments;
      const nextRingStart = 1 + r * segments;
      for (let s = 0; s < segments; s++) {
        const nextS = (s + 1) % segments;
        const c1 = currentRingStart + s;
        const c2 = currentRingStart + nextS;
        const n1 = nextRingStart + s;
        const n2 = nextRingStart + nextS;

        indices.push(c1, n1, c2);
        indices.push(c2, n1, n2);
      }
    }

    geom.setIndex(indices);
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.computeVertexNormals();

    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex),
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.disposables.push({ geometry: geom, material: mat });
    return new THREE.Mesh(geom, mat);
  }

  // Create perimeter border ring
  private createBorderRing(
    cx: number,
    cz: number,
    radius: number,
    colorHex: string
  ): THREE.LineLoop {
    const points: THREE.Vector3[] = [];
    const segments = 64;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const px = cx + Math.cos(angle) * radius;
      const pz = cz + Math.sin(angle) * radius;
      const py = Terrain.getElevationAt(px, pz) + 0.08;
      points.push(new THREE.Vector3(px, py, pz));
    }

    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(colorHex),
      transparent: true,
      opacity: 0.85,
    });

    this.disposables.push({ geometry: geom, material: mat });
    return new THREE.LineLoop(geom, mat);
  }

  // 1. Flood Zone
  private createFloodZone(): void {
    const spec = HAZARD_ZONES.flood;
    const [cx, cz] = spec.center;

    // Disc & Ring
    this.group.add(this.createZoneDisc(cx, cz, spec.radius, spec.color, spec.opacity));
    this.group.add(this.createBorderRing(cx, cz, spec.radius, spec.color));

    // River Strip: 9 x 46 units diagonal
    const riverWidth = 9;
    const riverLength = 46;
    const riverSegmentsW = 10;
    const riverSegmentsL = 36;
    const riverGeom = new THREE.PlaneGeometry(riverWidth, riverLength, riverSegmentsW, riverSegmentsL);
    riverGeom.rotateX(-Math.PI / 2);
    // Rotate diagonally ~35 degrees
    const diagonalAngle = 0.65;
    riverGeom.rotateY(diagonalAngle);

    // Conform river vertices to terrain
    const pos = riverGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const rx = pos.getX(i) + cx;
      const rz = pos.getZ(i) + cz;
      const ry = Terrain.getElevationAt(rx, rz) + 0.07;
      pos.setY(i, ry);
      pos.setX(i, rx);
      pos.setZ(i, rz);
    }
    pos.needsUpdate = true;
    riverGeom.computeVertexNormals();

    const riverMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(spec.color),
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.riverMaterial = riverMat;
    this.riverMesh = new THREE.Mesh(riverGeom, riverMat);
    this.riverBaseY = this.riverMesh.position.y;
    this.disposables.push({ geometry: riverGeom, material: riverMat });
    this.group.add(this.riverMesh);
  }

  /**
   * Animate the river strip during flood hazard.
   * @param progress 0 = normal idle, 1 = maximum flooded height and opacity
   */
  public setRiverFloodProgress(progress: number): void {
    if (!this.riverMesh || !this.riverMaterial) return;
    this.riverMesh.position.y = this.riverBaseY + progress * 0.35;
    this.riverMaterial.opacity = 0.28 + progress * 0.44;
  }

  // 2. Forest Fire Zone
  private createFireZone(): void {
    const spec = HAZARD_ZONES.fire;
    const [cx, cz] = spec.center;

    // Disc & Ring
    this.group.add(this.createZoneDisc(cx, cz, spec.radius, spec.color, spec.opacity));
    this.group.add(this.createBorderRing(cx, cz, spec.radius, spec.color));

    // 22 Deterministic Cones / Trees
    const trees = getDeterministicFireTrees();
    trees.forEach((tree) => {
      const coneGeom = new THREE.ConeGeometry(tree.radius, tree.height, 5, 2);
      const coneMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(spec.color),
        wireframe: true,
        transparent: true,
        opacity: 0.55,
      });

      const groundY = Terrain.getElevationAt(tree.x, tree.z);
      const coneMesh = new THREE.Mesh(coneGeom, coneMat);
      coneMesh.position.set(tree.x, groundY + tree.height / 2, tree.z);

      this.disposables.push({ geometry: coneGeom, material: coneMat });
      this.group.add(coneMesh);
    });
  }

  // 3. Industrial Zone
  private createIndustrialZone(): void {
    const spec = HAZARD_ZONES.industrial;
    const [cx, cz] = spec.center;

    // Disc & Ring
    this.group.add(this.createZoneDisc(cx, cz, spec.radius, spec.color, spec.opacity));
    this.group.add(this.createBorderRing(cx, cz, spec.radius, spec.color));

    // 9 Deterministic Boxes / Buildings
    const buildings = getDeterministicIndustrialBuildings();
    buildings.forEach((b) => {
      const boxGeom = new THREE.BoxGeometry(b.width, b.height, b.depth);
      const boxMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(spec.color),
        wireframe: true,
        transparent: true,
        opacity: 0.55,
      });

      const groundY = Terrain.getElevationAt(b.x, b.z);
      const boxMesh = new THREE.Mesh(boxGeom, boxMat);
      boxMesh.position.set(b.x, groundY + b.height / 2, b.z);

      this.disposables.push({ geometry: boxGeom, material: boxMat });
      this.group.add(boxMesh);
    });
  }

  public dispose(): void {
    for (const d of this.disposables) {
      d.geometry?.dispose();
      d.material?.dispose();
    }
  }
}
