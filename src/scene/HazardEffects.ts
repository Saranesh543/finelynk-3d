import * as THREE from 'three';
import { HazardType } from '../simulation/types';
import { HAZARD_ZONES } from '../data/hazards';
import { HazardZones } from './HazardZones';
import { Terrain } from './Terrain';

interface FireEmber {
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshBasicMaterial;
  baseX: number;
  baseY: number;
  baseZ: number;
  bobHeight: number;
  bobSpeed: number;
  phase: number;
  flickerSpeed: number;
}

export class HazardEffects {
  public group: THREE.Group;
  private hazardZones: HazardZones;

  // Flood state
  private isFloodActive: boolean = false;
  private floodProgress: number = 0; // 0 to 1

  // Fire state: exactly 26 ember objects
  private isFireActive: boolean = false;
  private fireEmbers: FireEmber[] = [];

  // Industrial state: 1 expanding translucent gas sphere
  private isIndustrialActive: boolean = false;
  private industrialMesh: THREE.Mesh | null = null;
  private industrialProgress: number = 0; // 0 to 1
  private industrialTargetRadius: number = 7.5;

  constructor(hazardZones: HazardZones) {
    this.group = new THREE.Group();
    this.hazardZones = hazardZones;
  }

  public startHazardEffect(type: HazardType): void {
    if (type === 'flood') {
      this.isFloodActive = true;
    } else if (type === 'fire') {
      if (this.isFireActive) return;
      this.isFireActive = true;
      this.spawnFireEmbers();
    } else if (type === 'industrial') {
      if (this.isIndustrialActive) return;
      this.isIndustrialActive = true;
      this.spawnIndustrialCloud();
    }
  }

  public stopHazardEffect(type: HazardType): void {
    if (type === 'flood') {
      this.isFloodActive = false;
    } else if (type === 'fire') {
      this.isFireActive = false;
      this.cleanupFireEmbers();
    } else if (type === 'industrial') {
      this.isIndustrialActive = false;
      this.cleanupIndustrialCloud();
    }
  }

  // -------------------------------------------------------------
  // Fire Effect Implementation
  // -------------------------------------------------------------
  private spawnFireEmbers(): void {
    this.cleanupFireEmbers(); // Guard against any prior leftovers

    const [cx, cz] = HAZARD_ZONES.fire.center;
    const maxR = HAZARD_ZONES.fire.radius * 0.85;
    const emberCount = 26;

    for (let i = 0; i < emberCount; i++) {
      const angle = (i / emberCount) * Math.PI * 2 + Math.random() * 0.4;
      const r = Math.sqrt(Math.random()) * maxR;
      const x = cx + Math.cos(angle) * r;
      const z = cz + Math.sin(angle) * r;
      const groundY = Terrain.getElevationAt(x, z);

      const radius = 0.12 + Math.random() * 0.14;
      const geom = new THREE.SphereGeometry(radius, 6, 6);

      // Alternate orange (#f97316) and gold (#fbbf24)
      const colorHex = i % 2 === 0 ? '#f97316' : '#fbbf24';
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(colorHex),
        transparent: true,
        opacity: 0.8,
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(x, groundY + 0.3, z);
      this.group.add(mesh);

      this.fireEmbers.push({
        mesh,
        geometry: geom,
        material: mat,
        baseX: x,
        baseY: groundY + 0.3,
        baseZ: z,
        bobHeight: 0.6 + Math.random() * 1.4,
        bobSpeed: 1.8 + Math.random() * 2.5,
        phase: Math.random() * Math.PI * 2,
        flickerSpeed: 3.5 + Math.random() * 4.0,
      });
    }
  }

  private cleanupFireEmbers(): void {
    for (const ember of this.fireEmbers) {
      this.group.remove(ember.mesh);
      ember.geometry.dispose();
      ember.material.dispose();
    }
    this.fireEmbers = [];
  }

  // -------------------------------------------------------------
  // Industrial Effect Implementation
  // -------------------------------------------------------------
  private spawnIndustrialCloud(): void {
    this.cleanupIndustrialCloud(); // Guard against leftovers

    const [cx, cz] = HAZARD_ZONES.industrial.center;
    const groundY = Terrain.getElevationAt(cx, cz);

    // Initial unit sphere with scale close to zero
    const geom = new THREE.SphereGeometry(1, 18, 18);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#c084fc'),
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      wireframe: false,
    });

    this.industrialMesh = new THREE.Mesh(geom, mat);
    this.industrialMesh.position.set(cx, groundY + 2.5, cz);
    this.industrialMesh.scale.set(0.01, 0.01, 0.01);
    this.industrialProgress = 0;

    this.group.add(this.industrialMesh);
  }

  private cleanupIndustrialCloud(): void {
    if (this.industrialMesh) {
      this.group.remove(this.industrialMesh);
      this.industrialMesh.geometry.dispose();
      (this.industrialMesh.material as THREE.Material).dispose();
      this.industrialMesh = null;
    }
    this.industrialProgress = 0;
  }

  // -------------------------------------------------------------
  // Update Loop
  // -------------------------------------------------------------
  public update(deltaTime: number, elapsedTime: number): void {
    // 1. Flood interpolation (rising over ~1.8s, receding over ~1.0s)
    if (this.isFloodActive) {
      this.floodProgress = Math.min(1, this.floodProgress + deltaTime / 1.8);
    } else {
      this.floodProgress = Math.max(0, this.floodProgress - deltaTime / 1.0);
    }
    this.hazardZones.setRiverFloodProgress(this.floodProgress);

    // 2. Fire embers animation
    if (this.isFireActive) {
      for (const ember of this.fireEmbers) {
        // Vertical sinusoidal bob
        const bob = Math.sin(elapsedTime * ember.bobSpeed + ember.phase) * ember.bobHeight;
        ember.mesh.position.y = ember.baseY + Math.max(0, bob);

        // Opacity flicker
        const flicker = 0.55 + 0.45 * Math.sin(elapsedTime * ember.flickerSpeed + ember.phase);
        ember.material.opacity = flicker;
      }
    }

    // 3. Industrial cloud expansion and slow rotation (~1.6s expansion)
    if (this.isIndustrialActive && this.industrialMesh) {
      this.industrialProgress = Math.min(1, this.industrialProgress + deltaTime / 1.6);
      const currentRadius = THREE.MathUtils.lerp(0.05, this.industrialTargetRadius, this.industrialProgress);
      this.industrialMesh.scale.set(currentRadius, currentRadius * 0.75, currentRadius);

      // Gentle continuous rotation
      this.industrialMesh.rotation.y = elapsedTime * 0.25;
      this.industrialMesh.rotation.x = Math.sin(elapsedTime * 0.2) * 0.1;
    }
  }

  public reset(): void {
    this.isFloodActive = false;
    this.floodProgress = 0;
    this.hazardZones.setRiverFloodProgress(0);
    this.isFireActive = false;
    this.cleanupFireEmbers();
    this.isIndustrialActive = false;
    this.cleanupIndustrialCloud();
  }

  public dispose(): void {
    this.reset();
  }
}
