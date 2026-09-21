import * as THREE from 'three';
import { Terrain } from './Terrain';

export class WorldInfrastructure {
  public group: THREE.Group;
  private disposables: { geometry?: THREE.BufferGeometry; material?: THREE.Material }[] = [];

  // Road materials (warm natural dirt/earth palette)
  private roadMaterial: THREE.MeshStandardMaterial;
  private trailMaterial: THREE.MeshStandardMaterial;
  private woodMaterial: THREE.MeshStandardMaterial;
  private metalMaterial: THREE.MeshStandardMaterial;
  private solarMaterial: THREE.MeshStandardMaterial;

  constructor() {
    this.group = new THREE.Group();

    // 1. Shared Materials
    this.roadMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#8f6b45'), // Warm natural dirt base
      roughness: 0.92,
      metalness: 0.05,
      flatShading: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.trailMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#9e7952'), // Slightly lighter secondary path
      roughness: 0.94,
      metalness: 0.02,
      flatShading: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.woodMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#654321'), // Dark rustic timber
      roughness: 0.88,
      metalness: 0.05,
      flatShading: true,
    });

    this.metalMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#3b4554'), // Weatherproof equipment steel
      roughness: 0.65,
      metalness: 0.45,
      flatShading: true,
    });

    this.solarMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1e293b'), // Deep silicon blue
      roughness: 0.35,
      metalness: 0.6,
      flatShading: true,
    });

    this.disposables.push(
      { material: this.roadMaterial },
      { material: this.trailMaterial },
      { material: this.woodMaterial },
      { material: this.metalMaterial },
      { material: this.solarMaterial }
    );

    // 2. Build World Infrastructure
    this.buildRoadNetwork();
    this.buildStreamBridge();
    this.buildFences();
    this.buildUtilityStructures();
    this.buildNodeCommunicationHardware();
  }

  // --------------------------------------------------------------------------
  // A. Procedural Roads & Trails
  // --------------------------------------------------------------------------
  private buildRoadRibbon(
    waypoints: THREE.Vector2[],
    width: number,
    material: THREE.MeshStandardMaterial
  ): THREE.Mesh {
    const positions: number[] = [];
    const indices: number[] = [];
    const halfWidth = width * 0.5;

    for (let i = 0; i < waypoints.length; i++) {
      const p = waypoints[i];
      let tx = 0;
      let tz = 0;
      if (i < waypoints.length - 1) {
        tx = waypoints[i + 1].x - p.x;
        tz = waypoints[i + 1].y - p.y;
      } else {
        tx = p.x - waypoints[i - 1].x;
        tz = p.y - waypoints[i - 1].y;
      }
      const len = Math.hypot(tx, tz) || 1;
      const nx = -tz / len;
      const nz = tx / len;

      const pLeftX = p.x + nx * halfWidth;
      const pLeftZ = p.y + nz * halfWidth;
      const pLeftY = Terrain.getElevationAt(pLeftX, pLeftZ) + 0.04;

      const pRightX = p.x - nx * halfWidth;
      const pRightZ = p.y - nz * halfWidth;
      const pRightY = Terrain.getElevationAt(pRightX, pRightZ) + 0.04;

      positions.push(pLeftX, pLeftY, pLeftZ);
      positions.push(pRightX, pRightY, pRightZ);

      if (i < waypoints.length - 1) {
        const v1 = i * 2;
        const v2 = i * 2 + 1;
        const v3 = (i + 1) * 2;
        const v4 = (i + 1) * 2 + 1;
        indices.push(v1, v2, v3);
        indices.push(v2, v4, v3);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setIndex(indices);
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.computeVertexNormals();

    this.disposables.push({ geometry: geom });
    const mesh = new THREE.Mesh(geom, material);
    return mesh;
  }

  private buildRoadNetwork(): void {
    const roadGroup = new THREE.Group();
    roadGroup.name = 'world_roads';

    // 1. Major Road 1: Command Center Axis (Command [0, 0] -> Relay-11 [10, 12])
    const roadCommandAxis = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(2.5, 2.8),
      new THREE.Vector2(4.8, 5.5),
      new THREE.Vector2(7.2, 8.5),
      new THREE.Vector2(9.8, 11.5),
    ];
    roadGroup.add(this.buildRoadRibbon(roadCommandAxis, 1.6, this.roadMaterial));

    // 2. Major Road 2: Flood Basin Approach (Command [0, 0] -> crossing stream -> Flood-04 [-22, 14])
    const roadFloodApproach = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(-2.8, 4.2),
      new THREE.Vector2(-5.5, 8.8),
      new THREE.Vector2(-6.0, 14.0),
      new THREE.Vector2(-6.0, 18.0), // Bridge crossing point
      new THREE.Vector2(-9.5, 18.2),
      new THREE.Vector2(-13.8, 17.0),
      new THREE.Vector2(-17.5, 15.5),
      new THREE.Vector2(-21.5, 14.2),
    ];
    roadGroup.add(this.buildRoadRibbon(roadFloodApproach, 1.5, this.roadMaterial));

    // 3. Major Road 3: Industrial Outpost Supply Road (Valley [0, -5] -> Plateau [-14, -26])
    const roadIndustrial = [
      new THREE.Vector2(0, -3.0),
      new THREE.Vector2(-2.5, -7.5),
      new THREE.Vector2(-5.5, -12.5),
      new THREE.Vector2(-8.8, -17.8),
      new THREE.Vector2(-11.5, -22.0),
      new THREE.Vector2(-13.8, -25.5),
      new THREE.Vector2(-16.0, -28.0),
    ];
    roadGroup.add(this.buildRoadRibbon(roadIndustrial, 1.5, this.roadMaterial));

    // 4. Secondary Trail 1: Forest Highland Ridge Trail (Relay-19 [24, 4] -> Forest-07 [20, -16])
    const trailForest = [
      new THREE.Vector2(23.5, 3.5),
      new THREE.Vector2(24.0, -1.5),
      new THREE.Vector2(23.0, -6.5),
      new THREE.Vector2(21.5, -11.0),
      new THREE.Vector2(20.2, -15.5),
      new THREE.Vector2(18.5, -19.0),
    ];
    roadGroup.add(this.buildRoadRibbon(trailForest, 0.85, this.trailMaterial));

    // 5. Secondary Trail 2: Relay-15 Valley Track (Relay-15 [-8, 22] -> Flood Road Junction [-6, 18])
    const trailRelay15 = [
      new THREE.Vector2(-8.0, 21.5),
      new THREE.Vector2(-7.2, 19.8),
      new THREE.Vector2(-6.0, 18.2),
    ];
    roadGroup.add(this.buildRoadRibbon(trailRelay15, 0.8, this.trailMaterial));

    this.group.add(roadGroup);
  }

  // --------------------------------------------------------------------------
  // B. Stream Crossing Bridge at (-6, 18)
  // --------------------------------------------------------------------------
  private buildStreamBridge(): void {
    const bridgeGroup = new THREE.Group();
    bridgeGroup.name = 'timber_bridge';
    const bridgeX = -6.0;
    const bridgeZ = 18.0;
    const groundY = Terrain.getElevationAt(bridgeX, bridgeZ) + 0.12;

    bridgeGroup.position.set(bridgeX, groundY, bridgeZ);

    // Bridge Deck (Planks / timber slab, 4.2 length along Z, 2.2 width along X)
    const deckLength = 4.2;
    const deckWidth = 2.2;
    const deckThick = 0.18;
    const deckGeom = new THREE.BoxGeometry(deckWidth, deckThick, deckLength);
    const deckMesh = new THREE.Mesh(deckGeom, this.woodMaterial);
    deckMesh.position.y = deckThick / 2;
    bridgeGroup.add(deckMesh);

    // Side Timber Railings (4 posts + 2 handrails)
    const railH = 0.65;
    const postGeom = new THREE.BoxGeometry(0.12, railH, 0.12);
    const railGeom = new THREE.BoxGeometry(0.08, 0.08, deckLength);

    const leftX = -deckWidth / 2 + 0.06;
    const rightX = deckWidth / 2 - 0.06;

    // Posts
    [-1.8, 0, 1.8].forEach((pz) => {
      const pLeft = new THREE.Mesh(postGeom, this.woodMaterial);
      pLeft.position.set(leftX, railH / 2 + deckThick, pz);
      bridgeGroup.add(pLeft);

      const pRight = new THREE.Mesh(postGeom, this.woodMaterial);
      pRight.position.set(rightX, railH / 2 + deckThick, pz);
      bridgeGroup.add(pRight);
    });

    // Horizontal Handrails
    const railLeft = new THREE.Mesh(railGeom, this.woodMaterial);
    railLeft.position.set(leftX, railH + deckThick, 0);
    bridgeGroup.add(railLeft);

    const railRight = new THREE.Mesh(railGeom, this.woodMaterial);
    railRight.position.set(rightX, railH + deckThick, 0);
    bridgeGroup.add(railRight);

    this.disposables.push(
      { geometry: deckGeom },
      { geometry: postGeom },
      { geometry: railGeom }
    );

    this.group.add(bridgeGroup);
  }

  // --------------------------------------------------------------------------
  // C. Sparse Fences (Industrial Gate & Valley Crossing)
  // --------------------------------------------------------------------------
  private buildFences(): void {
    const fenceGroup = new THREE.Group();
    fenceGroup.name = 'world_fences';

    const postGeom = new THREE.BoxGeometry(0.12, 0.9, 0.12);
    const railGeom = new THREE.BoxGeometry(1.6, 0.08, 0.06);
    this.disposables.push({ geometry: postGeom }, { geometry: railGeom });

    // Section 1: Industrial Plateau Perimeter (-10, -22) to (-6, -22)
    const indPosts = [
      { x: -11.2, z: -21.8 },
      { x: -9.6, z: -21.8 },
      { x: -8.0, z: -21.8 },
      { x: -6.4, z: -21.8 },
    ];
    for (let i = 0; i < indPosts.length; i++) {
      const p = indPosts[i];
      const gy = Terrain.getElevationAt(p.x, p.z);
      const postMesh = new THREE.Mesh(postGeom, this.woodMaterial);
      postMesh.position.set(p.x, gy + 0.45, p.z);
      fenceGroup.add(postMesh);

      if (i < indPosts.length - 1) {
        const nextP = indPosts[i + 1];
        const midX = (p.x + nextP.x) / 2;
        const midZ = (p.z + nextP.z) / 2;
        const midY = Terrain.getElevationAt(midX, midZ);

        const r1 = new THREE.Mesh(railGeom, this.woodMaterial);
        r1.position.set(midX, midY + 0.35, midZ);
        fenceGroup.add(r1);

        const r2 = new THREE.Mesh(railGeom, this.woodMaterial);
        r2.position.set(midX, midY + 0.7, midZ);
        fenceGroup.add(r2);
      }
    }

    // Section 2: Valley Stream approach fence near (-8, 16)
    const valPosts = [
      { x: -8.5, z: 15.5 },
      { x: -7.0, z: 16.0 },
      { x: -5.5, z: 16.5 },
    ];
    for (let i = 0; i < valPosts.length; i++) {
      const p = valPosts[i];
      const gy = Terrain.getElevationAt(p.x, p.z);
      const postMesh = new THREE.Mesh(postGeom, this.woodMaterial);
      postMesh.position.set(p.x, gy + 0.45, p.z);
      fenceGroup.add(postMesh);

      if (i < valPosts.length - 1) {
        const nextP = valPosts[i + 1];
        const midX = (p.x + nextP.x) / 2;
        const midZ = (p.z + nextP.z) / 2;
        const midY = Terrain.getElevationAt(midX, midZ);

        const r1 = new THREE.Mesh(railGeom, this.woodMaterial);
        r1.position.set(midX, midY + 0.35, midZ);
        r1.rotation.y = -0.3;
        fenceGroup.add(r1);
      }
    }

    this.group.add(fenceGroup);
  }

  // --------------------------------------------------------------------------
  // D. Utility Structures (6-8 across the world)
  // --------------------------------------------------------------------------
  private buildUtilityStructures(): void {
    const utilityGroup = new THREE.Group();
    utilityGroup.name = 'utility_structures';

    // 1. Elevated Water Tank near valley stream (1.5, 23.5)
    const tankGroup = new THREE.Group();
    const tankX = 1.5;
    const tankZ = 23.5;
    const tankGroundY = Terrain.getElevationAt(tankX, tankZ);
    tankGroup.position.set(tankX, tankGroundY, tankZ);

    const legGeom = new THREE.CylinderGeometry(0.08, 0.08, 2.4, 4);
    const tankCylinderGeom = new THREE.CylinderGeometry(1.0, 1.0, 1.6, 8);
    const tankConeGeom = new THREE.ConeGeometry(1.05, 0.5, 8);

    // 4 legs
    [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeom, this.woodMaterial);
      leg.position.set(lx, 1.2, lz);
      tankGroup.add(leg);
    });

    const tankBody = new THREE.Mesh(tankCylinderGeom, this.metalMaterial);
    tankBody.position.y = 2.4 + 0.8;
    tankGroup.add(tankBody);

    const tankRoof = new THREE.Mesh(tankConeGeom, this.woodMaterial);
    tankRoof.position.y = 2.4 + 1.6 + 0.25;
    tankGroup.add(tankRoof);

    this.disposables.push(
      { geometry: legGeom },
      { geometry: tankCylinderGeom },
      { geometry: tankConeGeom }
    );
    utilityGroup.add(tankGroup);

    // 2. Outpost Utility Shed near Industrial road junction (-4.5, -10.0)
    const shedGroup = new THREE.Group();
    const shedX = -4.5;
    const shedZ = -10.0;
    const shedGroundY = Terrain.getElevationAt(shedX, shedZ);
    shedGroup.position.set(shedX, shedGroundY, shedZ);

    const shedBodyGeom = new THREE.BoxGeometry(2.0, 1.6, 1.6);
    const shedRoofGeom = new THREE.ConeGeometry(1.6, 0.7, 4);
    shedRoofGeom.rotateY(Math.PI / 4);

    const shedBody = new THREE.Mesh(shedBodyGeom, this.woodMaterial);
    shedBody.position.y = 0.8;
    shedGroup.add(shedBody);

    const shedRoof = new THREE.Mesh(shedRoofGeom, this.metalMaterial);
    shedRoof.position.y = 1.6 + 0.35;
    shedGroup.add(shedRoof);

    this.disposables.push({ geometry: shedBodyGeom }, { geometry: shedRoofGeom });
    utilityGroup.add(shedGroup);

    // 3. Three Weatherproof Ground Equipment / Generator Cabinets along routes
    const cabinetGeom = new THREE.BoxGeometry(0.8, 1.0, 0.6);
    this.disposables.push({ geometry: cabinetGeom });

    const cabinetCoords = [
      { x: 3.5, z: 3.5, rot: 0.4 },
      { x: -3.5, z: 6.5, rot: -0.6 },
      { x: -10.5, z: -20.5, rot: 0.2 },
    ];

    cabinetCoords.forEach((c) => {
      const gy = Terrain.getElevationAt(c.x, c.z);
      const cab = new THREE.Mesh(cabinetGeom, this.metalMaterial);
      cab.position.set(c.x, gy + 0.5, c.z);
      cab.rotation.y = c.rot;
      utilityGroup.add(cab);
    });

    this.group.add(utilityGroup);
  }

  // --------------------------------------------------------------------------
  // E. Node Physical Communication Infrastructure (Command & Relays)
  // --------------------------------------------------------------------------
  private buildNodeCommunicationHardware(): void {
    const nodeGearGroup = new THREE.Group();
    nodeGearGroup.name = 'node_communication_hardware';

    // 1. Command Center Hardware: Antenna Mast, Dual Solar Array, Server Vault
    const cmdGroup = new THREE.Group();
    const cmdGroundY = Terrain.getElevationAt(0, 0);
    cmdGroup.position.set(0, cmdGroundY, 0);

    // Antenna Mast (offset beside platform at x=2.8, z=1.8)
    const mastGeom = new THREE.CylinderGeometry(0.06, 0.1, 4.8, 6);
    const crossbarGeom = new THREE.BoxGeometry(0.9, 0.05, 0.05);
    const mastMesh = new THREE.Mesh(mastGeom, this.metalMaterial);
    mastMesh.position.set(2.8, 2.4, 1.8);
    cmdGroup.add(mastMesh);

    const cross1 = new THREE.Mesh(crossbarGeom, this.metalMaterial);
    cross1.position.set(2.8, 4.2, 1.8);
    cmdGroup.add(cross1);

    const cross2 = new THREE.Mesh(crossbarGeom, this.metalMaterial);
    cross2.position.set(2.8, 3.4, 1.8);
    cross2.rotation.y = Math.PI / 2;
    cmdGroup.add(cross2);

    // Dual Solar Array at x=-2.6, z=1.6 (tilted 35 degrees toward south)
    const solarFrameGeom = new THREE.BoxGeometry(1.6, 0.08, 1.1);
    const solarMesh = new THREE.Mesh(solarFrameGeom, this.solarMaterial);
    solarMesh.position.set(-2.6, 0.65, 1.6);
    solarMesh.rotation.x = -0.45;
    cmdGroup.add(solarMesh);

    // Weatherproof Server Vault Box
    const vaultGeom = new THREE.BoxGeometry(1.1, 0.9, 0.8);
    const vaultMesh = new THREE.Mesh(vaultGeom, this.metalMaterial);
    vaultMesh.position.set(-2.2, 0.45, -1.8);
    cmdGroup.add(vaultMesh);

    this.disposables.push(
      { geometry: mastGeom },
      { geometry: crossbarGeom },
      { geometry: solarFrameGeom },
      { geometry: vaultGeom }
    );
    nodeGearGroup.add(cmdGroup);

    // 2. Relay Nodes Hardware (Relay-11 [10, 12], Relay-15 [-8, 22], Relay-19 [24, 4])
    const relayNodes = [
      { id: 4, x: 10, z: 12, angle: 0.3 },
      { id: 5, x: -8, z: 22, angle: -0.4 },
      { id: 6, x: 24, z: 4, angle: 0.8 },
    ];

    const whipGeom = new THREE.CylinderGeometry(0.03, 0.05, 2.4, 4);
    const relaySolarGeom = new THREE.BoxGeometry(0.9, 0.06, 0.7);
    const relayBoxGeom = new THREE.BoxGeometry(0.7, 0.65, 0.5);

    this.disposables.push(
      { geometry: whipGeom },
      { geometry: relaySolarGeom },
      { geometry: relayBoxGeom }
    );

    relayNodes.forEach((rn) => {
      const rGroup = new THREE.Group();
      const gy = Terrain.getElevationAt(rn.x, rn.z);
      rGroup.position.set(rn.x, gy, rn.z);
      rGroup.rotation.y = rn.angle;

      // Whip antenna pole offset beside platform
      const whip = new THREE.Mesh(whipGeom, this.metalMaterial);
      whip.position.set(1.8, 1.2, 0.6);
      rGroup.add(whip);

      // Single solar panel on stand
      const rSolar = new THREE.Mesh(relaySolarGeom, this.solarMaterial);
      rSolar.position.set(-1.6, 0.45, 0.8);
      rSolar.rotation.x = -0.4;
      rGroup.add(rSolar);

      // Equipment cabinet
      const rBox = new THREE.Mesh(relayBoxGeom, this.metalMaterial);
      rBox.position.set(-1.5, 0.32, -0.6);
      rGroup.add(rBox);

      nodeGearGroup.add(rGroup);
    });

    this.group.add(nodeGearGroup);
  }

  public dispose(): void {
    for (const d of this.disposables) {
      d.geometry?.dispose();
      d.material?.dispose();
    }
  }
}
