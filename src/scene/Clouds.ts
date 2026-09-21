import * as THREE from 'three';

interface CloudCluster {
  group: THREE.Group;
  baseX: number;
  baseZ: number;
  altitude: number;
  speedX: number;
  speedZ: number;
}

export class Clouds {
  public group: THREE.Group;
  private clouds: CloudCluster[] = [];
  private sharedMaterial: THREE.MeshBasicMaterial;
  private disposables: THREE.BufferGeometry[] = [];

  // Toroidal boundary coordinates for continuous gentle wrap
  private readonly minBound = -75;
  private readonly maxBound = 75;

  constructor() {
    this.group = new THREE.Group();

    // Shared lightweight unlit low-poly cloud material
    this.sharedMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    this.createClouds();
  }

  private createClouds(): void {
    // 8 deterministic cloud clusters placed at fixed high altitudes ([28, 38])
    // Distributed naturally across the sky perimeter to avoid blocking central nodes
    const cloudConfigs = [
      { x: -45, z: -35, y: 32, speedX: 0.75, speedZ: 0.20, scale: 1.1 },
      { x: 38, z: -42, y: 35, speedX: 0.65, speedZ: 0.15, scale: 1.25 },
      { x: -38, z: 40, y: 30, speedX: 0.80, speedZ: 0.18, scale: 0.95 },
      { x: 42, z: 32, y: 36, speedX: 0.70, speedZ: 0.22, scale: 1.2 },
      { x: -55, z: 5, y: 34, speedX: 0.85, speedZ: 0.12, scale: 1.3 },
      { x: 50, z: -10, y: 31, speedX: 0.60, speedZ: 0.25, scale: 1.05 },
      { x: -10, z: -55, y: 37, speedX: 0.72, speedZ: 0.16, scale: 1.15 },
      { x: 12, z: 52, y: 33, speedX: 0.68, speedZ: 0.20, scale: 1.0 },
    ];

    cloudConfigs.forEach((cfg) => {
      const clusterGroup = new THREE.Group();
      clusterGroup.position.set(cfg.x, cfg.y, cfg.z);

      // Each cloud has 3 to 4 overlapping low-poly puffs (flattened icosahedra)
      const puffOffsets = [
        { dx: 0, dy: 0, dz: 0, r: 2.2 * cfg.scale, sy: 0.55 },
        { dx: -1.6 * cfg.scale, dy: -0.2, dz: 0.3 * cfg.scale, r: 1.6 * cfg.scale, sy: 0.58 },
        { dx: 1.7 * cfg.scale, dy: -0.15, dz: -0.4 * cfg.scale, r: 1.8 * cfg.scale, sy: 0.52 },
        { dx: 0.4 * cfg.scale, dy: 0.4 * cfg.scale, dz: 0.2 * cfg.scale, r: 1.4 * cfg.scale, sy: 0.60 },
      ];

      puffOffsets.forEach((p) => {
        const puffGeom = new THREE.IcosahedronGeometry(p.r, 0);
        const puffMesh = new THREE.Mesh(puffGeom, this.sharedMaterial);
        puffMesh.position.set(p.dx, p.dy, p.dz);
        puffMesh.scale.set(1.0, p.sy, 1.0);

        this.disposables.push(puffGeom);
        clusterGroup.add(puffMesh);
      });

      this.clouds.push({
        group: clusterGroup,
        baseX: cfg.x,
        baseZ: cfg.z,
        altitude: cfg.y,
        speedX: cfg.speedX,
        speedZ: cfg.speedZ,
      });

      this.group.add(clusterGroup);
    });
  }

  /**
   * Per-frame continuous gentle drifting with position wrapping.
   */
  public update(deltaTime: number): void {
    const range = this.maxBound - this.minBound;

    for (const cloud of this.clouds) {
      // Advance drift along X and Z
      cloud.group.position.x += cloud.speedX * deltaTime;
      cloud.group.position.z += cloud.speedZ * deltaTime;

      // Toroidal boundary wrapping in X
      if (cloud.group.position.x > this.maxBound) {
        cloud.group.position.x -= range;
      } else if (cloud.group.position.x < this.minBound) {
        cloud.group.position.x += range;
      }

      // Toroidal boundary wrapping in Z
      if (cloud.group.position.z > this.maxBound) {
        cloud.group.position.z -= range;
      } else if (cloud.group.position.z < this.minBound) {
        cloud.group.position.z += range;
      }
    }
  }

  public getCloudCount(): number {
    return this.clouds.length;
  }

  public dispose(): void {
    for (const geom of this.disposables) {
      geom.dispose();
    }
    this.sharedMaterial.dispose();
  }
}
