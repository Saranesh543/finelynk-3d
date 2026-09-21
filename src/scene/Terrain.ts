import * as THREE from 'three';
import { TOKENS } from '../data/tokens';

export class Terrain {
  public group: THREE.Group;
  private baseMesh: THREE.Mesh;
  private streamMesh: THREE.Mesh | null = null;
  private geometry: THREE.BufferGeometry;
  private streamGeometry: THREE.BufferGeometry | null = null;
  private streamMaterial: THREE.MeshBasicMaterial | null = null;

  constructor() {
    this.group = new THREE.Group();

    // 140 x 140 plane with 60 x 60 segments as confirmed in user review
    const size = 140;
    const segments = 60;
    const planeGeom = new THREE.PlaneGeometry(size, size, segments, segments);

    // Apply deterministic multi-scale geographic elevation
    this.applyElevation(planeGeom);

    // Rotate plane to lie horizontally on XZ plane
    planeGeom.rotateX(-Math.PI / 2);

    // Convert to non-indexed geometry to guarantee true flat-shaded facets
    this.geometry = planeGeom.toNonIndexed();
    planeGeom.dispose();

    // Compute faceted vertex normals
    this.geometry.computeVertexNormals();

    // Assign height-band vertex colors
    this.applyHeightColors();

    // Flat-shaded low-poly strategy-game terrain material
    const baseMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    this.baseMesh = new THREE.Mesh(this.geometry, baseMaterial);
    this.group.add(this.baseMesh);

    // Optional decorative low-poly stream feeding into the flood river
    this.createDecorativeStream();
  }

  /**
   * Deterministic Multi-Scale Geographical Elevation Function:
   * 1. Central Valley Corridor: broad, gentle, navigable trough cutting through the midlands
   * 2. Lowland Flood Basin: natural depression around (-22, 14) where the lake/riverbed naturally sits
   * 3. Industrial Outpost Plateau: elevated flat-topped landform around (-14, -26) with surrounding slopes
   * 4. Forest Rolling Highlands: elevated rolling wooded knolls around (20, -16)
   * 5. Distant Mountain Ridges: layered background ridges along northern/northeastern perimeter (Z < -28, X > 28)
   * 6. Medium Rolling Slopes & Facet Micro-Variation for crisp low-poly facet illumination
   */
  public static getElevationAt(x: number, z: number): number {
    // 1. Central Valley Corridor: elongated trough leading towards the flood basin
    // Segment from (6, 4) to (-28, 16)
    const segDx = -34;
    const segDz = 12;
    const segLenSq = segDx * segDx + segDz * segDz;
    const segT = THREE.MathUtils.clamp(
      ((x - 6) * segDx + (z - 4) * segDz) / segLenSq,
      0,
      1
    );
    const closestX = 6 + segT * segDx;
    const closestZ = 4 + segT * segDz;
    const valleyDist = Math.hypot(x - closestX, z - closestZ);
    const valleyDepth = -1.1 * Math.exp(-(valleyDist * valleyDist) / (12 * 12));

    // 2. Lowland Flood Basin Depression around (-22, 14)
    const floodDist = Math.hypot(x - (-22), z - 14);
    const basinDepth = -1.1 * Math.exp(-(floodDist * floodDist) / (15 * 15));

    // 3. Industrial Outpost Plateau around (-14, -26) (elevated flat-topped mesa)
    const indDist = Math.hypot(x - (-14), z - (-26));
    const plateauElev = 1.85 / (1.0 + Math.pow(indDist / 10.5, 4));

    // 4. Forest Rolling Highlands around (20, -16)
    const forestDist = Math.hypot(x - 20, z - (-16));
    const forestElev = 1.65 * Math.exp(-(forestDist * forestDist) / (16 * 16));

    // 5. Distant Perimeter Mountain Ridges (Northern & Eastern horizon, away from central network)
    const distNorth = Math.max(0, -z - 28);
    const distEast = Math.max(0, x - 28);
    const perimeterRamp = Math.max(distNorth, distEast);
    const mountainRidge = Math.min(
      5.2,
      perimeterRamp * 0.18 * (2.6 + 1.2 * Math.sin(x * 0.12 + 1.0) * Math.cos(z * 0.11))
    );

    // 6. Medium-Scale Rolling Landscape (gentle, natural undulating terrain)
    const mediumRolling =
      0.75 * Math.sin(x * 0.045 + 0.4) * Math.cos(z * 0.042 - 0.3) +
      0.38 * Math.sin(x * 0.082 - z * 0.076);

    // 7. Subtle Local Micro-Variation (gives planar facets distinct light-catching angles)
    const microVariation = 0.16 * Math.sin(x * 0.16 + z * 0.13) * Math.cos(x * 0.12 - z * 0.18);

    return (
      valleyDepth +
      basinDepth +
      plateauElev +
      forestElev +
      mountainRidge +
      mediumRolling +
      microVariation
    );
  }

  private applyElevation(geom: THREE.PlaneGeometry): void {
    const positionAttr = geom.attributes.position;
    for (let i = 0; i < positionAttr.count; i++) {
      const x = positionAttr.getX(i);
      const y = positionAttr.getY(i); // Y in 2D plane corresponds to Z in 3D world after rotateX
      const elevation = Terrain.getElevationAt(x, -y);
      // Displace along local Z (which becomes world Y after rotateX)
      positionAttr.setZ(i, elevation);
    }
    positionAttr.needsUpdate = true;
  }

  /**
   * Assigns colorful 5-band low-poly palette calibrated for the rich geography:
   * Low / Mud (#8a6b3f)      — Basin floors and riverbanks (avgY < -0.7)
   * Grass (#4fae52)          — Plains & lowlands (-0.7 <= avgY < 0.9)
   * Upper Grass (#7ac95a)    — Rolling slopes & plateau (0.9 <= avgY < 2.6)
   * Rock (#c98a5e)           — High ridges & cliffs (2.6 <= avgY < 4.2)
   * Snow (#ffffff)           — Mountain peaks (avgY >= 4.2)
   */
  private applyHeightColors(): void {
    const posAttr = this.geometry.attributes.position;
    const count = posAttr.count;
    const colors = new Float32Array(count * 3);

    const cMud = new THREE.Color(TOKENS.colors.terrainLowMud);
    const cGrass = new THREE.Color(TOKENS.colors.terrainGrass);
    const cUpperGrass = new THREE.Color(TOKENS.colors.terrainUpperGrass);
    const cRock = new THREE.Color(TOKENS.colors.terrainRock);
    const cSnow = new THREE.Color(TOKENS.colors.terrainSnow);

    // Calculate per-face elevation to preserve uniform flat facet coloration
    for (let i = 0; i < count; i += 3) {
      const y0 = posAttr.getY(i);
      const y1 = posAttr.getY(i + 1);
      const y2 = posAttr.getY(i + 2);
      const avgY = (y0 + y1 + y2) / 3;

      let faceColor: THREE.Color;
      if (avgY < -0.7) {
        // Basin floor / muddy riverbank
        const t = Math.max(0, Math.min(1, (avgY - (-2.4)) / 1.7));
        faceColor = cMud.clone().lerp(cGrass, t * 0.25);
      } else if (avgY < 0.9) {
        // Mud -> Vivid Grass lowlands
        const t = (avgY - (-0.7)) / 1.6;
        faceColor = cMud.clone().lerp(cGrass, 0.25 + t * 0.75);
      } else if (avgY < 2.6) {
        // Grass -> Upper Grass rolling slopes & plateau
        const t = (avgY - 0.9) / 1.7;
        faceColor = cGrass.clone().lerp(cUpperGrass, t);
      } else if (avgY < 4.2) {
        // Upper Grass -> Terracotta Rock ridges
        const t = (avgY - 2.6) / 1.6;
        faceColor = cUpperGrass.clone().lerp(cRock, t);
      } else {
        // Rock -> Snow mountain peaks
        const t = Math.min(1, Math.max(0, (avgY - 4.2) / 0.9));
        faceColor = cRock.clone().lerp(cSnow, t);
      }

      for (let v = 0; v < 3; v++) {
        const idx = (i + v) * 3;
        colors[idx] = faceColor.r;
        colors[idx + 1] = faceColor.g;
        colors[idx + 2] = faceColor.b;
      }
    }

    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  /**
   * Purely decorative lightweight low-poly stream feeding into the flood river
   * from the upper central valley. Zero simulation interaction.
   */
  private createDecorativeStream(): void {
    // 12 centerline waypoints meandering from valley (2, 22) down to flood river (-16, 14)
    const streamWaypoints = [
      new THREE.Vector2(2.0, 22.0),
      new THREE.Vector2(-0.5, 21.0),
      new THREE.Vector2(-3.2, 19.8),
      new THREE.Vector2(-6.0, 19.0),
      new THREE.Vector2(-8.8, 17.5),
      new THREE.Vector2(-11.5, 16.5),
      new THREE.Vector2(-14.0, 15.2),
      new THREE.Vector2(-16.0, 14.0),
    ];

    const streamWidth = 1.4;
    const positions: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < streamWaypoints.length; i++) {
      const p = streamWaypoints[i];
      // Tangent vector
      let tx = 0;
      let tz = 0;
      if (i < streamWaypoints.length - 1) {
        tx = streamWaypoints[i + 1].x - p.x;
        tz = streamWaypoints[i + 1].y - p.y;
      } else {
        tx = p.x - streamWaypoints[i - 1].x;
        tz = p.y - streamWaypoints[i - 1].y;
      }
      const len = Math.hypot(tx, tz) || 1;
      const nx = -tz / len;
      const nz = tx / len;

      const pLeftX = p.x + nx * (streamWidth * 0.5);
      const pLeftZ = p.y + nz * (streamWidth * 0.5);
      const pLeftY = Terrain.getElevationAt(pLeftX, pLeftZ) + 0.05;

      const pRightX = p.x - nx * (streamWidth * 0.5);
      const pRightZ = p.y - nz * (streamWidth * 0.5);
      const pRightY = Terrain.getElevationAt(pRightX, pRightZ) + 0.05;

      positions.push(pLeftX, pLeftY, pLeftZ);
      positions.push(pRightX, pRightY, pRightZ);

      if (i < streamWaypoints.length - 1) {
        const v1 = i * 2;
        const v2 = i * 2 + 1;
        const v3 = (i + 1) * 2;
        const v4 = (i + 1) * 2 + 1;
        indices.push(v1, v2, v3);
        indices.push(v2, v4, v3);
      }
    }

    const streamGeom = new THREE.BufferGeometry();
    streamGeom.setIndex(indices);
    streamGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    streamGeom.computeVertexNormals();

    const streamMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(TOKENS.colors.flood), // Vivid turquoise #2dd4c8
      transparent: true,
      opacity: 0.52,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.streamGeometry = streamGeom;
    this.streamMaterial = streamMat;
    this.streamMesh = new THREE.Mesh(streamGeom, streamMat);
    this.group.add(this.streamMesh);
  }

  public dispose(): void {
    this.geometry.dispose();
    (this.baseMesh.material as THREE.Material).dispose();

    if (this.streamGeometry) {
      this.streamGeometry.dispose();
    }
    if (this.streamMaterial) {
      this.streamMaterial.dispose();
    }
  }
}
