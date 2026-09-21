import * as THREE from 'three';
import { Terrain } from './Terrain';
import { NETWORK_NODES } from '../data/nodes';

/**
 * Seeded Pseudo-Random Number Generator (Mulberry32)
 * Ensures 100% deterministic prop generation across reloads and resets.
 */
class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  public choice<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }
}

export class WorldProps {
  public group: THREE.Group;
  private disposables: { geometry?: THREE.BufferGeometry; material?: THREE.Material }[] = [];
  private rng: SeededRandom;

  // Shared Materials
  private trunkMat: THREE.MeshStandardMaterial;
  private foliageMats: THREE.MeshStandardMaterial[];
  private rockGrayMat: THREE.MeshStandardMaterial;
  private rockTerracottaMat: THREE.MeshStandardMaterial;
  private reedStemMat: THREE.MeshStandardMaterial;
  private reedTipMat: THREE.MeshStandardMaterial;
  private woodMat: THREE.MeshStandardMaterial;
  private crateMat: THREE.MeshStandardMaterial;
  private metalDarkMat: THREE.MeshStandardMaterial;
  private metalGalvanizedMat: THREE.MeshStandardMaterial;
  private industrialOrangeMat: THREE.MeshStandardMaterial;
  private concreteMat: THREE.MeshStandardMaterial;
  private grassMat: THREE.MeshStandardMaterial;

  constructor(seed: number = 20260921) {
    this.group = new THREE.Group();
    this.group.name = 'world_props';
    this.rng = new SeededRandom(seed);

    // 1. Initialize Shared Materials (strictly non-emissive, flat-shaded low-poly strategy palette)
    this.trunkMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#654321'),
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });

    this.foliageMats = [
      new THREE.MeshStandardMaterial({ color: new THREE.Color('#1e5e2e'), roughness: 0.85, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: new THREE.Color('#2e8b40'), roughness: 0.85, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: new THREE.Color('#4fae52'), roughness: 0.85, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: new THREE.Color('#7ac95a'), roughness: 0.85, flatShading: true }),
    ];

    this.rockGrayMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#6b7280'),
      roughness: 0.92,
      metalness: 0.08,
      flatShading: true,
    });

    this.rockTerracottaMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#a07855'),
      roughness: 0.92,
      metalness: 0.08,
      flatShading: true,
    });

    this.reedStemMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2d5a27'),
      roughness: 0.9,
      flatShading: true,
    });

    this.reedTipMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#7c4d32'),
      roughness: 0.9,
      flatShading: true,
    });

    this.woodMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#5c3d1e'),
      roughness: 0.88,
      flatShading: true,
    });

    this.crateMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#b47b48'),
      roughness: 0.85,
      flatShading: true,
    });

    this.metalDarkMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#334155'),
      roughness: 0.6,
      metalness: 0.45,
      flatShading: true,
    });

    this.metalGalvanizedMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#64748b'),
      roughness: 0.55,
      metalness: 0.5,
      flatShading: true,
    });

    this.industrialOrangeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#d97706'),
      roughness: 0.7,
      metalness: 0.1,
      flatShading: true,
    });

    this.concreteMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#94a3b8'),
      roughness: 0.95,
      metalness: 0.02,
      flatShading: true,
    });

    this.grassMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#4fae52'),
      roughness: 0.95,
      flatShading: true,
      side: THREE.DoubleSide,
    });

    this.disposables.push(
      { material: this.trunkMat },
      ...this.foliageMats.map((m) => ({ material: m })),
      { material: this.rockGrayMat },
      { material: this.rockTerracottaMat },
      { material: this.reedStemMat },
      { material: this.reedTipMat },
      { material: this.woodMat },
      { material: this.crateMat },
      { material: this.metalDarkMat },
      { material: this.metalGalvanizedMat },
      { material: this.industrialOrangeMat },
      { material: this.concreteMat },
      { material: this.grassMat }
    );

    // 2. Build Prop Systems
    this.buildVegetation();
    this.buildGeology();
    this.buildWetlandProps();
    this.buildIndustrialProps();
    this.buildCommandProps();
    this.buildLandmarks();
  }

  // --------------------------------------------------------------------------
  // Spatial Keep-Out Helpers
  // --------------------------------------------------------------------------
  /**
   * Keep-out buffer for the 7 FineLynk node platforms (radius 2.5)
   */
  private isNearNode(x: number, z: number, buffer: number = 2.5): boolean {
    for (const node of NETWORK_NODES) {
      const dx = x - node.position[0];
      const dz = z - node.position[2];
      if (dx * dx + dz * dz < buffer * buffer) return true;
    }
    return false;
  }

  /**
   * Keep-out buffer for roads, trails, bridge, and stream
   */
  private isNearRoad(x: number, z: number, buffer: number = 1.6): boolean {
    const roadSegments: [number, number, number, number][] = [
      // Command Axis
      [0, 0, 2.5, 2.8],
      [2.5, 2.8, 4.8, 5.5],
      [4.8, 5.5, 7.2, 8.5],
      [7.2, 8.5, 9.8, 11.5],
      // Flood Road
      [0, 0, -2.8, 4.2],
      [-2.8, 4.2, -5.5, 8.8],
      [-5.5, 8.8, -6.0, 14.0],
      [-6.0, 14.0, -6.0, 18.0],
      [-6.0, 18.0, -9.5, 18.2],
      [-9.5, 18.2, -13.8, 17.0],
      [-13.8, 17.0, -17.5, 15.5],
      [-17.5, 15.5, -21.5, 14.2],
      // Industrial Road
      [0, -3.0, -2.5, -7.5],
      [-2.5, -7.5, -5.5, -12.5],
      [-5.5, -12.5, -8.8, -17.8],
      [-8.8, -17.8, -11.5, -22.0],
      [-11.5, -22.0, -13.8, -25.5],
      [-13.8, -25.5, -16.0, -28.0],
      // Forest Trail
      [23.5, 3.5, 24.0, -1.5],
      [24.0, -1.5, 23.0, -6.5],
      [23.0, -6.5, 21.5, -11.0],
      [21.5, -11.0, 20.2, -15.5],
      [20.2, -15.5, 18.5, -19.0],
      // Relay-15 Trail
      [-8.0, 21.5, -7.2, 19.8],
      [-7.2, 19.8, -6.0, 18.2],
    ];

    const bufSq = buffer * buffer;
    for (const [x1, z1, x2, z2] of roadSegments) {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const lenSq = dx * dx + dz * dz;
      if (lenSq < 0.0001) continue;
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / lenSq));
      const projX = x1 + t * dx;
      const projZ = z1 + t * dz;
      const distSq = (x - projX) * (x - projX) + (z - projZ) * (z - projZ);
      if (distSq < bufSq) return true;
    }
    return false;
  }

  // --------------------------------------------------------------------------
  // 1. Natural Vegetation (Trees, Fallen Logs, Shrubs, Grass Tufts)
  // --------------------------------------------------------------------------
  private buildVegetation(): void {
    const vegGroup = new THREE.Group();
    vegGroup.name = 'vegetation';

    // Shared Geometries for Trees
    const trunkGeom = new THREE.CylinderGeometry(0.12, 0.18, 1.4, 5);
    const coneGeom1 = new THREE.ConeGeometry(0.9, 1.6, 5);
    const coneGeom2 = new THREE.ConeGeometry(0.7, 1.3, 5);
    const sphereCanopyGeom = new THREE.IcosahedronGeometry(0.95, 0);
    const bushGeom = new THREE.IcosahedronGeometry(0.5, 0);
    const logGeom = new THREE.CylinderGeometry(0.15, 0.16, 2.2, 5);

    this.disposables.push(
      { geometry: trunkGeom },
      { geometry: coneGeom1 },
      { geometry: coneGeom2 },
      { geometry: sphereCanopyGeom },
      { geometry: bushGeom },
      { geometry: logGeom }
    );

    // Helper: Create a Pine / Conifer Tree
    const createPineTree = (x: number, z: number, scale: number, foliageMat: THREE.MeshStandardMaterial) => {
      const tree = new THREE.Group();
      const gy = Terrain.getElevationAt(x, z);
      tree.position.set(x, gy, z);
      tree.scale.setScalar(scale);

      const trunk = new THREE.Mesh(trunkGeom, this.trunkMat);
      trunk.position.y = 0.7;
      tree.add(trunk);

      const c1 = new THREE.Mesh(coneGeom1, foliageMat);
      c1.position.y = 1.8;
      tree.add(c1);

      const c2 = new THREE.Mesh(coneGeom2, foliageMat);
      c2.position.y = 2.6;
      tree.add(c2);

      return tree;
    };

    // Helper: Create a Round / Deciduous Tree
    const createDeciduousTree = (x: number, z: number, scale: number, foliageMat: THREE.MeshStandardMaterial) => {
      const tree = new THREE.Group();
      const gy = Terrain.getElevationAt(x, z);
      tree.position.set(x, gy, z);
      tree.scale.setScalar(scale);

      const trunk = new THREE.Mesh(trunkGeom, this.trunkMat);
      trunk.position.y = 0.7;
      tree.add(trunk);

      const canopy = new THREE.Mesh(sphereCanopyGeom, foliageMat);
      canopy.position.y = 1.8;
      canopy.rotation.set(this.rng.range(0, 0.4), this.rng.range(0, Math.PI), 0);
      tree.add(canopy);

      return tree;
    };

    // A. Forest Territory Enrichment (Highland Knolls around X:[12, 28], Z:[-24, -8])
    // Dense woodland with variety of heights, canopies, and tones
    for (let i = 0; i < 22; i++) {
      const x = this.rng.range(12, 28);
      const z = this.rng.range(-24, -8);
      if (this.isNearNode(x, z, 3.0) || this.isNearRoad(x, z, 1.4)) continue;

      const scale = this.rng.range(0.8, 1.25);
      const mat = this.rng.choice(this.foliageMats);
      if (this.rng.next() > 0.4) {
        vegGroup.add(createPineTree(x, z, scale, mat));
      } else {
        vegGroup.add(createDeciduousTree(x, z, scale, mat));
      }
    }

    // B. Fallen Logs in Forest Territory (3 rustic fallen logs)
    const logCoords = [
      { x: 16.5, z: -12.5, rot: 0.6 },
      { x: 23.0, z: -20.0, rot: -0.8 },
      { x: 14.2, z: -21.5, rot: 1.4 },
    ];
    for (const lc of logCoords) {
      const gy = Terrain.getElevationAt(lc.x, lc.z);
      const log = new THREE.Mesh(logGeom, this.woodMat);
      log.position.set(lc.x, gy + 0.12, lc.z);
      log.rotation.x = Math.PI / 2;
      log.rotation.z = lc.rot;
      vegGroup.add(log);
    }

    // C. General Terrain Trees (Valley margins, gentle slopes, open grasslands)
    // Sparse, purposeful natural distribution
    const valleyTreeSpots = [
      { x: -2.0, z: -14.0, type: 'pine', scale: 1.0 },
      { x: 5.5, z: -8.0, type: 'round', scale: 1.15 },
      { x: 8.5, z: -2.0, type: 'round', scale: 0.95 },
      { x: 12.0, z: 4.0, type: 'pine', scale: 1.1 },
      { x: 4.0, z: 16.5, type: 'round', scale: 1.05 },
      { x: -2.5, z: 19.5, type: 'pine', scale: 0.9 },
      { x: -12.5, z: 8.5, type: 'round', scale: 0.95 },
      { x: -8.0, z: -4.0, type: 'round', scale: 1.0 },
      { x: 15.0, z: 12.0, type: 'pine', scale: 1.2 },
      { x: -16.0, z: -15.0, type: 'pine', scale: 0.85 },
      { x: 28.0, z: -4.0, type: 'pine', scale: 1.0 },
    ];

    for (const spot of valleyTreeSpots) {
      if (this.isNearNode(spot.x, spot.z, 2.5) || this.isNearRoad(spot.x, spot.z, 1.4)) continue;
      const mat = this.rng.choice(this.foliageMats);
      if (spot.type === 'pine') {
        vegGroup.add(createPineTree(spot.x, spot.z, spot.scale, mat));
      } else {
        vegGroup.add(createDeciduousTree(spot.x, spot.z, spot.scale, mat));
      }
    }

    // D. Low-Poly Bushes / Shrubs along woodland edges and road verges (16 bushes)
    for (let i = 0; i < 16; i++) {
      const x = this.rng.range(-20, 26);
      const z = this.rng.range(-26, 24);
      if (this.isNearNode(x, z, 2.2) || this.isNearRoad(x, z, 1.0)) continue;
      const gy = Terrain.getElevationAt(x, z);
      if (gy < -1.0) continue; // Don't place on submerged mud/riverbed

      const bush = new THREE.Mesh(bushGeom, this.rng.choice(this.foliageMats));
      const s = this.rng.range(0.65, 1.1);
      bush.scale.set(s, s * 0.75, s);
      bush.position.set(x, gy + s * 0.35, z);
      bush.rotation.set(this.rng.range(0, 0.4), this.rng.range(0, Math.PI), 0);
      vegGroup.add(bush);
    }

    // E. Stylized Low-Poly Grass Clusters in Valley Meadows (Merged geometry for integrated GPU efficiency)
    const grassBladeGeom = new THREE.ConeGeometry(0.06, 0.45, 3);
    this.disposables.push({ geometry: grassBladeGeom });

    const grassTuftGeom = new THREE.BufferGeometry();
    const tuftPositions: number[] = [];
    const tuftNormals: number[] = [];

    // Pre-build 20 grass cluster patches
    for (let p = 0; p < 20; p++) {
      const cx = this.rng.range(-15, 18);
      const cz = this.rng.range(-15, 15);
      if (this.isNearNode(cx, cz, 2.2) || this.isNearRoad(cx, cz, 1.0)) continue;
      const cy = Terrain.getElevationAt(cx, cz);
      if (cy < -0.6 || cy > 2.0) continue; // Placed only in fertile grass meadows

      // 4 blades per tuft
      for (let b = 0; b < 4; b++) {
        const ox = this.rng.range(-0.35, 0.35);
        const oz = this.rng.range(-0.35, 0.35);
        const h = this.rng.range(0.35, 0.55);
        const bx = cx + ox;
        const bz = cz + oz;
        const by = Terrain.getElevationAt(bx, bz);

        // Simple triangular blade
        const tiltX = this.rng.range(-0.15, 0.15);
        const tiltZ = this.rng.range(-0.15, 0.15);

        tuftPositions.push(
          bx - 0.04, by, bz,
          bx + 0.04, by, bz,
          bx + tiltX, by + h, bz + tiltZ
        );
        tuftNormals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
      }
    }

    grassTuftGeom.setAttribute('position', new THREE.Float32BufferAttribute(tuftPositions, 3));
    grassTuftGeom.setAttribute('normal', new THREE.Float32BufferAttribute(tuftNormals, 3));
    this.disposables.push({ geometry: grassTuftGeom });

    const grassMesh = new THREE.Mesh(grassTuftGeom, this.grassMat);
    grassMesh.name = 'grass_meadow_tufts';
    vegGroup.add(grassMesh);

    this.group.add(vegGroup);
  }

  // --------------------------------------------------------------------------
  // 2. Geological Formations (Low-Poly Rocks along Slopes, Ridges & Transitions)
  // --------------------------------------------------------------------------
  private buildGeology(): void {
    const geoGroup = new THREE.Group();
    geoGroup.name = 'geology';

    const rockGeomA = new THREE.DodecahedronGeometry(0.8, 0);
    const rockGeomB = new THREE.IcosahedronGeometry(0.65, 0);
    const rockGeomC = new THREE.OctahedronGeometry(0.7, 0);
    this.disposables.push(
      { geometry: rockGeomA },
      { geometry: rockGeomB },
      { geometry: rockGeomC }
    );

    const rockGeoms = [rockGeomA, rockGeomB, rockGeomC];

    // Strategic rock clusters reinforcing geography
    const rockSites = [
      // Industrial plateau slope transition
      { x: -17.5, z: -20.0, s: 1.1, mat: this.rockTerracottaMat },
      { x: -19.0, z: -21.2, s: 0.8, mat: this.rockTerracottaMat },
      { x: -7.5, z: -25.5, s: 1.2, mat: this.rockTerracottaMat },
      { x: -6.0, z: -24.0, s: 0.7, mat: this.rockTerracottaMat },
      // Eastern highland ridge shoulder
      { x: 26.5, z: -18.0, s: 1.3, mat: this.rockTerracottaMat },
      { x: 28.0, z: -15.5, s: 0.9, mat: this.rockTerracottaMat },
      { x: 25.0, z: 0.5, s: 1.0, mat: this.rockGrayMat },
      { x: 27.5, z: 2.0, s: 0.75, mat: this.rockGrayMat },
      // Northern escarpment / valley edge
      { x: 6.0, z: 21.0, s: 1.15, mat: this.rockGrayMat },
      { x: 8.0, z: 19.5, s: 0.85, mat: this.rockGrayMat },
      { x: -11.0, z: 23.5, s: 1.25, mat: this.rockGrayMat },
      // Mid-valley natural rock outcroppings
      { x: 3.5, z: -6.0, s: 0.85, mat: this.rockGrayMat },
      { x: -7.0, z: 3.5, s: 0.95, mat: this.rockGrayMat },
      { x: -12.0, z: -11.0, s: 1.05, mat: this.rockTerracottaMat },
    ];

    for (const site of rockSites) {
      if (this.isNearNode(site.x, site.z, 2.5) || this.isNearRoad(site.x, site.z, 1.2)) continue;
      const gy = Terrain.getElevationAt(site.x, site.z);
      const geom = this.rng.choice(rockGeoms);
      const mesh = new THREE.Mesh(geom, site.mat);
      mesh.position.set(site.x, gy + site.s * 0.35, site.z);
      mesh.scale.set(site.s, site.s * 0.65, site.s * 0.9);
      mesh.rotation.set(this.rng.range(0, 0.8), this.rng.range(0, Math.PI * 2), this.rng.range(0, 0.5));
      geoGroup.add(mesh);
    }

    this.group.add(geoGroup);
  }

  // --------------------------------------------------------------------------
  // 3. Wetland Storytelling Props (Flood Basin Reeds & Shoreline Rocks)
  // --------------------------------------------------------------------------
  private buildWetlandProps(): void {
    const wetGroup = new THREE.Group();
    wetGroup.name = 'wetland_props';

    const stemGeom = new THREE.CylinderGeometry(0.02, 0.03, 1.1, 4);
    const tipGeom = new THREE.CylinderGeometry(0.045, 0.045, 0.3, 4);
    const shoreRockGeom = new THREE.DodecahedronGeometry(0.6, 0);

    this.disposables.push(
      { geometry: stemGeom },
      { geometry: tipGeom },
      { geometry: shoreRockGeom }
    );

    // Wetland Reed Clusters (5 clusters along mud depression and stream borders)
    const reedClusterCenters = [
      { x: -18.5, z: 17.5 },
      { x: -24.5, z: 11.0 },
      { x: -26.0, z: 16.5 },
      { x: -14.0, z: 13.5 },
      { x: -4.5, z: 20.5 },
    ];

    for (const center of reedClusterCenters) {
      for (let i = 0; i < 6; i++) {
        const rx = center.x + this.rng.range(-1.2, 1.2);
        const rz = center.z + this.rng.range(-1.2, 1.2);
        if (this.isNearNode(rx, rz, 2.5) || this.isNearRoad(rx, rz, 1.2)) continue;

        const ry = Terrain.getElevationAt(rx, rz);
        const reedGroup = new THREE.Group();
        reedGroup.position.set(rx, ry, rz);
        reedGroup.rotation.y = this.rng.range(0, Math.PI * 2);
        reedGroup.rotation.z = this.rng.range(-0.1, 0.1);

        const stem = new THREE.Mesh(stemGeom, this.reedStemMat);
        stem.position.y = 0.55;
        reedGroup.add(stem);

        const tip = new THREE.Mesh(tipGeom, this.reedTipMat);
        tip.position.y = 1.0;
        reedGroup.add(tip);

        wetGroup.add(reedGroup);
      }
    }

    // Shoreline Smooth Boulders around Lake Edge
    const shorelineSpots = [
      { x: -26.5, z: 13.5, s: 0.9 },
      { x: -25.0, z: 19.0, s: 0.75 },
      { x: -18.0, z: 11.5, s: 0.85 },
      { x: -20.5, z: 9.0, s: 0.7 },
      { x: -13.5, z: 18.5, s: 0.8 },
    ];

    for (const spot of shorelineSpots) {
      if (this.isNearNode(spot.x, spot.z, 2.5)) continue;
      const gy = Terrain.getElevationAt(spot.x, spot.z);
      const boulder = new THREE.Mesh(shoreRockGeom, this.rockGrayMat);
      boulder.position.set(spot.x, gy + spot.s * 0.25, spot.z);
      boulder.scale.set(spot.s * 1.3, spot.s * 0.6, spot.s);
      boulder.rotation.y = this.rng.range(0, Math.PI);
      wetGroup.add(boulder);
    }

    // Flood Water-Level Marker Gauge Post near bridge approach (-8.5, 17.5)
    const gaugePost = new THREE.Group();
    const gaugeX = -8.5;
    const gaugeZ = 17.5;
    const gaugeY = Terrain.getElevationAt(gaugeX, gaugeZ);
    gaugePost.position.set(gaugeX, gaugeY, gaugeZ);

    const postGeom = new THREE.BoxGeometry(0.1, 1.6, 0.1);
    const postMesh = new THREE.Mesh(postGeom, this.woodMat);
    postMesh.position.y = 0.8;
    gaugePost.add(postMesh);

    // 3 Gauge indicator bands
    const bandGeom = new THREE.BoxGeometry(0.14, 0.08, 0.14);
    [-0.2, 0.1, 0.4].forEach((offsetY) => {
      const band = new THREE.Mesh(bandGeom, this.industrialOrangeMat);
      band.position.y = 0.8 + offsetY;
      gaugePost.add(band);
    });

    this.disposables.push({ geometry: postGeom }, { geometry: bandGeom });
    wetGroup.add(gaugePost);

    this.group.add(wetGroup);
  }

  // --------------------------------------------------------------------------
  // 4. Industrial Settlement Environmental Props (Crates, Drums, Pipes, Barriers)
  // --------------------------------------------------------------------------
  private buildIndustrialProps(): void {
    const indGroup = new THREE.Group();
    indGroup.name = 'industrial_props';

    const crateGeom = new THREE.BoxGeometry(0.75, 0.75, 0.75);
    const drumGeom = new THREE.CylinderGeometry(0.3, 0.3, 0.9, 6);
    const pipeGeom = new THREE.CylinderGeometry(0.1, 0.1, 2.6, 6);
    const barrierGeom = new THREE.BoxGeometry(1.4, 0.45, 0.15);

    this.disposables.push(
      { geometry: crateGeom },
      { geometry: drumGeom },
      { geometry: pipeGeom },
      { geometry: barrierGeom }
    );

    // Crate Stacks along Outpost Service Perimeter
    const crateLocations = [
      { x: -16.8, z: -24.2, r: 0.3 },
      { x: -16.2, z: -24.5, r: -0.2 },
      { x: -16.5, z: -24.3, r: 0.0, yOff: 0.75 }, // Stacked on top
      { x: -11.5, z: -27.5, r: 0.4 },
      { x: -12.2, z: -27.8, r: -0.5 },
      { x: -17.5, z: -28.2, r: 0.6 },
    ];

    for (const c of crateLocations) {
      const gy = Terrain.getElevationAt(c.x, c.z);
      const mesh = new THREE.Mesh(crateGeom, this.crateMat);
      mesh.position.set(c.x, gy + 0.375 + (c.yOff || 0), c.z);
      mesh.rotation.y = c.r;
      indGroup.add(mesh);
    }

    // Industrial Chemical / Fuel Drums (group of 4 drums near storage area)
    const drumSpots = [
      { x: -17.2, z: -22.5 },
      { x: -16.6, z: -22.4 },
      { x: -16.9, z: -21.8 },
      { x: -11.0, z: -24.2 },
    ];

    for (const d of drumSpots) {
      const gy = Terrain.getElevationAt(d.x, d.z);
      const drum = new THREE.Mesh(drumGeom, this.metalDarkMat);
      drum.position.set(d.x, gy + 0.45, d.z);
      indGroup.add(drum);
    }

    // Ground Utility Pipe Segment with concrete supports
    const pipeX = -12.5;
    const pipeZ = -23.0;
    const pipeY = Terrain.getElevationAt(pipeX, pipeZ);
    const pipe = new THREE.Mesh(pipeGeom, this.metalGalvanizedMat);
    pipe.position.set(pipeX, pipeY + 0.22, pipeZ);
    pipe.rotation.z = Math.PI / 2;
    pipe.rotation.y = 0.5;
    indGroup.add(pipe);

    // Industrial Steel Warning Barriers
    const barrierSpots = [
      { x: -10.5, z: -23.5, r: -0.3 },
      { x: -15.5, z: -22.0, r: 0.4 },
    ];

    for (const b of barrierSpots) {
      const gy = Terrain.getElevationAt(b.x, b.z);
      const bar = new THREE.Mesh(barrierGeom, this.industrialOrangeMat);
      bar.position.set(b.x, gy + 0.225, b.z);
      bar.rotation.y = b.r;
      indGroup.add(bar);
    }

    this.group.add(indGroup);
  }

  // --------------------------------------------------------------------------
  // 5. Command Center Station Environmental Depot
  // --------------------------------------------------------------------------
  private buildCommandProps(): void {
    const cmdPropsGroup = new THREE.Group();
    cmdPropsGroup.name = 'command_props';

    const bollardGeom = new THREE.CylinderGeometry(0.12, 0.14, 0.45, 6);
    const supplyLockerGeom = new THREE.BoxGeometry(0.9, 0.65, 0.55);
    const smallCrateGeom = new THREE.BoxGeometry(0.5, 0.5, 0.5);

    this.disposables.push(
      { geometry: bollardGeom },
      { geometry: supplyLockerGeom },
      { geometry: smallCrateGeom }
    );

    // Low Concrete Perimeter Bollards defining outer service boundary (radius 3.6, avoiding roads)
    const bollardAngles = [0.8, 1.4, 2.3, 3.8, 4.6, 5.4];
    const r = 3.6;

    for (const angle of bollardAngles) {
      const bx = Math.cos(angle) * r;
      const bz = Math.sin(angle) * r;
      if (this.isNearRoad(bx, bz, 1.2)) continue;

      const gy = Terrain.getElevationAt(bx, bz);
      const bollard = new THREE.Mesh(bollardGeom, this.concreteMat);
      bollard.position.set(bx, gy + 0.225, bz);
      cmdPropsGroup.add(bollard);
    }

    // Telemetry Battery & Tool Locker beside service structure (x: 1.8, z: -2.0)
    const lockerX = 1.8;
    const lockerZ = -2.0;
    const lockerY = Terrain.getElevationAt(lockerX, lockerZ);
    const locker = new THREE.Mesh(supplyLockerGeom, this.metalDarkMat);
    locker.position.set(lockerX, lockerY + 0.325, lockerZ);
    locker.rotation.y = -0.4;
    cmdPropsGroup.add(locker);

    // Field Supply Crates at (x: 2.2, z: -1.4)
    const crX = 2.2;
    const crZ = -1.4;
    const crY = Terrain.getElevationAt(crX, crZ);
    const smCrate = new THREE.Mesh(smallCrateGeom, this.crateMat);
    smCrate.position.set(crX, crY + 0.25, crZ);
    smCrate.rotation.y = 0.2;
    cmdPropsGroup.add(smCrate);

    this.group.add(cmdPropsGroup);
  }

  // --------------------------------------------------------------------------
  // 6. Three Major Regional Landmarks
  // --------------------------------------------------------------------------
  private buildLandmarks(): void {
    const landmarksGroup = new THREE.Group();
    landmarksGroup.name = 'landmarks';

    // ------------------------------------------------------------------------
    // Landmark 1: Highland Ranger Lookout Tower (Forest Territory Landmark)
    // Position: (28.5, -10.0) on the eastern wooded ridge, elevated with clear view
    // ------------------------------------------------------------------------
    const towerGroup = new THREE.Group();
    towerGroup.name = 'landmark_forest_lookout_tower';
    const towerX = 28.5;
    const towerZ = -10.0;
    const towerGroundY = Terrain.getElevationAt(towerX, towerZ);
    towerGroup.position.set(towerX, towerGroundY, towerZ);

    const legH = 3.6;
    const legGeom = new THREE.CylinderGeometry(0.08, 0.1, legH, 4);
    const crossBraceGeom = new THREE.BoxGeometry(0.06, 0.06, 1.8);
    const platformGeom = new THREE.BoxGeometry(2.2, 0.16, 2.2);
    const cabinWallGeom = new THREE.BoxGeometry(1.8, 1.2, 1.8);
    const roofGeom = new THREE.ConeGeometry(1.6, 0.8, 4);
    roofGeom.rotateY(Math.PI / 4);

    // 4 timber legs with inward taper
    [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeom, this.woodMat);
      leg.position.set(lx, legH / 2, lz);
      towerGroup.add(leg);
    });

    // Cross braces
    [legH * 0.35, legH * 0.7].forEach((by) => {
      const b1 = new THREE.Mesh(crossBraceGeom, this.woodMat);
      b1.position.set(0, by, -0.8);
      towerGroup.add(b1);
      const b2 = new THREE.Mesh(crossBraceGeom, this.woodMat);
      b2.position.set(0, by, 0.8);
      towerGroup.add(b2);
    });

    // Elevated Platform Deck
    const platform = new THREE.Mesh(platformGeom, this.woodMat);
    platform.position.y = legH + 0.08;
    towerGroup.add(platform);

    // Enclosed Lookout Cabin
    const cabin = new THREE.Mesh(cabinWallGeom, this.woodMat);
    cabin.position.y = legH + 0.16 + 0.6;
    towerGroup.add(cabin);

    // Weathered Steel Roof
    const roof = new THREE.Mesh(roofGeom, this.metalDarkMat);
    roof.position.y = legH + 0.16 + 1.2 + 0.4;
    towerGroup.add(roof);

    this.disposables.push(
      { geometry: legGeom },
      { geometry: crossBraceGeom },
      { geometry: platformGeom },
      { geometry: cabinWallGeom },
      { geometry: roofGeom }
    );
    landmarksGroup.add(towerGroup);

    // ------------------------------------------------------------------------
    // Landmark 2: Flood Monitoring Telemetry Station (Flood Territory Landmark)
    // Position: (-16.0, 21.0) along the stream/wetland approach
    // ------------------------------------------------------------------------
    const floodStationGroup = new THREE.Group();
    floodStationGroup.name = 'landmark_flood_monitoring_station';
    const floodStnX = -16.0;
    const floodStnZ = 21.0;
    const floodStnGroundY = Terrain.getElevationAt(floodStnX, floodStnZ);
    floodStationGroup.position.set(floodStnX, floodStnGroundY, floodStnZ);

    const stnPlatformGeom = new THREE.BoxGeometry(1.8, 0.18, 1.8);
    const sensorMastGeom = new THREE.CylinderGeometry(0.04, 0.06, 2.6, 5);
    const sensorBoxGeom = new THREE.BoxGeometry(0.65, 0.7, 0.45);
    const solarSensorGeom = new THREE.BoxGeometry(0.6, 0.04, 0.45);

    // Raised timber platform (protecting gear from high water)
    const stnPlat = new THREE.Mesh(stnPlatformGeom, this.woodMat);
    stnPlat.position.y = 0.2;
    floodStationGroup.add(stnPlat);

    // Telemetry Sensor Mast
    const mast = new THREE.Mesh(sensorMastGeom, this.metalGalvanizedMat);
    mast.position.set(0.5, 1.3 + 0.2, -0.5);
    floodStationGroup.add(mast);

    // Solar collector on top of mast
    const solar = new THREE.Mesh(solarSensorGeom, this.metalDarkMat);
    solar.position.set(0.5, 2.6 + 0.2, -0.5);
    solar.rotation.x = -0.4;
    floodStationGroup.add(solar);

    // Weatherproof Data Telemetry Enclosure
    const box = new THREE.Mesh(sensorBoxGeom, this.metalGalvanizedMat);
    box.position.set(-0.35, 0.35 + 0.2, 0.1);
    floodStationGroup.add(box);

    this.disposables.push(
      { geometry: stnPlatformGeom },
      { geometry: sensorMastGeom },
      { geometry: sensorBoxGeom },
      { geometry: solarSensorGeom }
    );
    landmarksGroup.add(floodStationGroup);

    // ------------------------------------------------------------------------
    // Landmark 3: Outpost Power & Utility Substation (Industrial Landmark)
    // Position: (-19.0, -22.5) on the industrial plateau
    // ------------------------------------------------------------------------
    const indStationGroup = new THREE.Group();
    indStationGroup.name = 'landmark_industrial_substation';
    const indStnX = -19.0;
    const indStnZ = -22.5;
    const indStnGroundY = Terrain.getElevationAt(indStnX, indStnZ);
    indStationGroup.position.set(indStnX, indStnGroundY, indStnZ);

    const padGeom = new THREE.BoxGeometry(2.8, 0.15, 2.4);
    const transformerGeom = new THREE.BoxGeometry(1.1, 1.2, 0.9);
    const horizTankGeom = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 8);
    const pipeArchGeom = new THREE.BoxGeometry(0.08, 1.8, 0.08);
    const pipeTopGeom = new THREE.BoxGeometry(1.4, 0.08, 0.08);

    // Concrete Substation Foundation Pad
    const pad = new THREE.Mesh(padGeom, this.concreteMat);
    pad.position.y = 0.075;
    indStationGroup.add(pad);

    // Step-Down Electrical Transformer Unit
    const transformer = new THREE.Mesh(transformerGeom, this.metalDarkMat);
    transformer.position.set(-0.65, 0.6 + 0.15, 0.3);
    indStationGroup.add(transformer);

    // Horizontal Pressurized Fuel/Gas Tank on Cradle
    const hTank = new THREE.Mesh(horizTankGeom, this.metalGalvanizedMat);
    hTank.position.set(0.65, 0.5 + 0.15, -0.2);
    hTank.rotation.z = Math.PI / 2;
    indStationGroup.add(hTank);

    // Overhead Cable / Conduit Arch
    const arch1 = new THREE.Mesh(pipeArchGeom, this.metalDarkMat);
    arch1.position.set(-0.7, 0.9 + 0.15, -0.9);
    indStationGroup.add(arch1);

    const arch2 = new THREE.Mesh(pipeArchGeom, this.metalDarkMat);
    arch2.position.set(0.7, 0.9 + 0.15, -0.9);
    indStationGroup.add(arch2);

    const archTop = new THREE.Mesh(pipeTopGeom, this.metalDarkMat);
    archTop.position.set(0, 1.8 + 0.15, -0.9);
    indStationGroup.add(archTop);

    this.disposables.push(
      { geometry: padGeom },
      { geometry: transformerGeom },
      { geometry: horizTankGeom },
      { geometry: pipeArchGeom },
      { geometry: pipeTopGeom }
    );
    landmarksGroup.add(indStationGroup);

    this.group.add(landmarksGroup);
  }

  // --------------------------------------------------------------------------
  // Clean Memory Disposal
  // --------------------------------------------------------------------------
  public dispose(): void {
    for (const d of this.disposables) {
      d.geometry?.dispose();
      d.material?.dispose();
    }
  }
}
