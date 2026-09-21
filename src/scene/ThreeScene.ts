import * as THREE from 'three';
import { TOKENS } from '../data/tokens';
import { CustomCamera } from './CustomCamera';
import { Terrain } from './Terrain';
import { HazardZones } from './HazardZones';
import { NetworkNodes } from './NetworkNodes';
import { MeshLinks } from './MeshLinks';
import { HazardEffects } from './HazardEffects';
import { SimulationMarkers } from './SimulationMarkers';
import { Clouds } from './Clouds';
import { WorldInfrastructure } from './WorldInfrastructure';
import { WorldProps } from './WorldProps';
import { SimulationEngine } from '../simulation/SimulationEngine';
import { HazardType } from '../simulation/types';

export type FrameCallback = (camera: THREE.PerspectiveCamera, width: number, height: number) => void;

export class ThreeScene {
  public scene: THREE.Scene;
  public renderer: THREE.WebGLRenderer;
  public customCamera: CustomCamera;
  public terrain: Terrain;
  public hazardZones: HazardZones;
  public networkNodes: NetworkNodes;
  public meshLinks: MeshLinks;
  public hazardEffects: HazardEffects;
  public markers: SimulationMarkers;
  public clouds: Clouds;
  public infrastructure: WorldInfrastructure;
  public worldProps: WorldProps;
  public simulationEngine: SimulationEngine;

  private domContainer: HTMLElement;
  private animFrameId: number | null = null;
  private clock: THREE.Clock;
  private onFrameCallbacks: Set<FrameCallback> = new Set();
  private resizeObserver: ResizeObserver | null = null;
  private bgTexture: THREE.CanvasTexture | null = null;
  private unsubscribeEngineEvents: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.domContainer = container;
    this.clock = new THREE.Clock();

    // 1. Scene & Bright Daytime Sky
    this.scene = new THREE.Scene();
    this.setupDaytimeSky();

    // 2. Soft Warm Atmospheric Fog blending with horizon (#cfe8f5)
    this.scene.fog = new THREE.Fog(new THREE.Color(TOKENS.colors.fog), 75, 185);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // 4. Custom Orbit Camera (pure spherical coordinates)
    const aspect = container.clientWidth / container.clientHeight;
    this.customCamera = new CustomCamera(this.renderer.domElement, aspect);

    // 5. Balanced Daytime Strategy Lighting (Faceted flat-shading illumination)
    this.setupDaytimeLighting();

    // 6. Terrain (Flat-shaded 5-band low-poly palette)
    this.terrain = new Terrain();
    this.scene.add(this.terrain.group);

    // 6.5. World Infrastructure (Roads, Trails, Bridge, Fences, Utilities & Node Hardware)
    this.infrastructure = new WorldInfrastructure();
    this.scene.add(this.infrastructure.group);

    // 6.6. World Props & Environmental Storytelling (Vegetation, Geology, Wetlands, Landmarks)
    this.worldProps = new WorldProps();
    this.scene.add(this.worldProps.group);

    // 7. Hazard Zones (Living Forest, Warm Outpost, Vivid Turquoise Water & Readable Rings)
    this.hazardZones = new HazardZones();
    this.scene.add(this.hazardZones.group);

    // 8. Dynamic Hazard Visual Effects (animated river, fire embers, expanding gas)
    this.hazardEffects = new HazardEffects(this.hazardZones);
    this.scene.add(this.hazardEffects.group);

    // 9. Network Nodes (Outpost base platforms, punchy emissive core & beacon lights)
    this.networkNodes = new NetworkNodes();
    this.scene.add(this.networkNodes.group);

    // 10. Mesh Links (Exactly 8 edges floating at network horizon)
    this.meshLinks = new MeshLinks(this.networkNodes);
    this.scene.add(this.meshLinks.group);

    // 11. Simulation Waypoint Markers (Alert Pulse + Rescue Unit)
    this.markers = new SimulationMarkers(this.networkNodes, this.meshLinks);
    this.scene.add(this.markers.group);

    // 12. Procedural Atmospheric Clouds (gentle continuous drift)
    this.clouds = new Clouds();
    this.scene.add(this.clouds.group);

    // 13. Simulation Engine
    this.simulationEngine = new SimulationEngine(
      this.networkNodes,
      this.hazardEffects,
      this.markers
    );

    // 13. Connect simulation lifecycle to territory visual transitions (Dormant ↔ Active)
    this.setupTerritoryVisualSubscriptions();

    // Set up responsive resize observation
    this.setupResizeObserver();

    // Start render loop
    this.startLoop();
  }

  /**
   * Set up bright daytime sky gradient:
   * Zenith (#2f7fd6) → Middle (#6fb3e8) → Horizon (#cfe8f5)
   */
  private setupDaytimeSky(): void {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 2;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, 512);
        grad.addColorStop(0.0, TOKENS.colors.skyZenith);
        grad.addColorStop(0.48, TOKENS.colors.skyMiddle);
        grad.addColorStop(1.0, TOKENS.colors.skyHorizon);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 2, 512);

        this.bgTexture = new THREE.CanvasTexture(canvas);
        this.bgTexture.colorSpace = THREE.SRGBColorSpace;
        this.scene.background = this.bgTexture;
        return;
      }
    }
    this.scene.background = new THREE.Color(TOKENS.colors.skyHorizon);
  }

  /**
   * Balanced daytime lighting for flat-shaded low-poly strategy game world.
   */
  private setupDaytimeLighting(): void {
    // Warm Sun Directional Light
    const sunLight = new THREE.DirectionalLight('#fff7e6', 0.88);
    sunLight.position.set(50, 75, 40);
    this.scene.add(sunLight);

    // Daylight Ambient Light
    const ambientLight = new THREE.AmbientLight('#f0f6ff', 0.72);
    this.scene.add(ambientLight);

    // Hemisphere Light (Sky blue from above, warm earth from below)
    const hemiLight = new THREE.HemisphereLight(
      TOKENS.colors.skyMiddle,
      TOKENS.colors.terrainLowMud,
      0.38
    );
    this.scene.add(hemiLight);
  }

  /**
   * Decoupled presentation layer subscription:
   * Translates simulation engine events into territory Dormant ↔ Active transitions
   * without modifying SimulationEngine.
   */
  private setupTerritoryVisualSubscriptions(): void {
    this.unsubscribeEngineEvents = this.simulationEngine.events.on('*', (event) => {
      if (event.type === 'HAZARD_DETECTED' && event.hazardType) {
        this.hazardZones.setTerritoryActive(event.hazardType as HazardType, true);
      } else if (
        (event.type === 'HAZARD_RESOLVED' || event.type === 'NO_ROUTE_AVAILABLE') &&
        event.hazardType
      ) {
        this.hazardZones.setTerritoryActive(event.hazardType as HazardType, false);
      } else if (event.type === 'SIMULATION_RESET') {
        this.hazardZones.resetAllTerritories();
      }
    });
  }

  public addFrameCallback(cb: FrameCallback): () => void {
    this.onFrameCallbacks.add(cb);
    return () => this.onFrameCallbacks.delete(cb);
  }

  public setMeshLinksVisible(visible: boolean): void {
    this.meshLinks.setVisible(visible);
  }

  public triggerHazard(type: HazardType): boolean {
    return this.simulationEngine.triggerHazard(type);
  }

  public isHazardActive(type: HazardType): boolean {
    return this.simulationEngine.isHazardActive(type);
  }

  public setNodeFailure(nodeId: number, failed: boolean): void {
    this.simulationEngine.setNodeBlocked(nodeId, failed);
    this.meshLinks.setSeveredNode(nodeId, failed);
  }

  public resetSimulation(): void {
    this.simulationEngine.reset();
    this.meshLinks.resetAllSevered();
    this.networkNodes.resetAllNodes();
    this.hazardZones.resetAllTerritories();
  }

  private startLoop = (): void => {
    const loop = () => {
      this.animFrameId = requestAnimationFrame(loop);
      const delta = Math.min(this.clock.getDelta(), 0.1);
      const elapsedTime = this.clock.getElapsedTime();

      // Camera interpolation
      this.customCamera.update();

      // Ambient 3D animations
      this.networkNodes.update(elapsedTime);
      this.meshLinks.update(elapsedTime, delta);
      this.clouds.update(delta);

      // Territory visual transitions (smooth Dormant ↔ Active interpolation)
      this.hazardZones.update(delta);

      // Simulation Engine updates (stage progression, waypoint interpolation)
      this.simulationEngine.update(delta);

      // Hazard Visual Effects updates (embers bob/flicker, gas expansion, flood rise)
      this.hazardEffects.update(delta, elapsedTime);

      // Render
      this.renderer.render(this.scene, this.customCamera.camera);

      // Notify external observers (e.g. HTML label projection)
      const width = this.domContainer.clientWidth;
      const height = this.domContainer.clientHeight;
      for (const cb of this.onFrameCallbacks) {
        cb(this.customCamera.camera, width, height);
      }
    };
    loop();
  };

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          this.renderer.setSize(width, height);
          this.customCamera.updateAspect(width / height);
        }
      }
    });
    this.resizeObserver.observe(this.domContainer);
  }

  public dispose(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.unsubscribeEngineEvents) {
      this.unsubscribeEngineEvents();
    }
    if (this.bgTexture) {
      this.bgTexture.dispose();
    }

    this.simulationEngine.dispose();
    this.markers.dispose();
    this.clouds.dispose();
    this.infrastructure.dispose();
    this.worldProps.dispose();
    this.hazardEffects.dispose();
    this.customCamera.dispose();
    this.terrain.dispose();
    this.hazardZones.dispose();
    this.networkNodes.dispose();
    this.meshLinks.dispose();

    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
