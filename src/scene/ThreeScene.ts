import * as THREE from 'three';
import { TOKENS } from '../data/tokens';
import { CustomCamera } from './CustomCamera';
import { Terrain } from './Terrain';
import { HazardZones } from './HazardZones';
import { NetworkNodes } from './NetworkNodes';
import { MeshLinks } from './MeshLinks';
import { HazardEffects } from './HazardEffects';
import { SimulationMarkers } from './SimulationMarkers';
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
  public simulationEngine: SimulationEngine;

  private domContainer: HTMLElement;
  private animFrameId: number | null = null;
  private clock: THREE.Clock;
  private onFrameCallbacks: Set<FrameCallback> = new Set();
  private resizeObserver: ResizeObserver | null = null;

  constructor(container: HTMLElement) {
    this.domContainer = container;
    this.clock = new THREE.Clock();

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(TOKENS.colors.void);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // Custom Orbit Camera (pure spherical coordinates)
    const aspect = container.clientWidth / container.clientHeight;
    this.customCamera = new CustomCamera(this.renderer.domElement, aspect);

    // 1. Terrain (Dual mesh: base #081222 + wireframe #1c3a5c)
    this.terrain = new Terrain();
    this.scene.add(this.terrain.group);

    // 2. Hazard Zones (Flood + river, Fire + 22 cones, Industrial + 9 boxes)
    this.hazardZones = new HazardZones();
    this.scene.add(this.hazardZones.group);

    // 3. Dynamic Hazard Visual Effects (animated river, fire embers, expanding gas)
    this.hazardEffects = new HazardEffects(this.hazardZones);
    this.scene.add(this.hazardEffects.group);

    // 4. Network Nodes (Exactly 7 nodes, 3-layer anatomy)
    this.networkNodes = new NetworkNodes();
    this.scene.add(this.networkNodes.group);

    // 5. Mesh Links (Exactly 8 edges floating at network horizon)
    this.meshLinks = new MeshLinks(this.networkNodes);
    this.scene.add(this.meshLinks.group);

    // 6. Simulation Waypoint Markers (Alert Pulse + Rescue Unit)
    this.markers = new SimulationMarkers(this.networkNodes, this.meshLinks);
    this.scene.add(this.markers.group);

    // 7. Simulation Engine
    this.simulationEngine = new SimulationEngine(
      this.networkNodes,
      this.hazardEffects,
      this.markers
    );

    // Set up responsive resize observation
    this.setupResizeObserver();

    // Start render loop
    this.startLoop();
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

    this.simulationEngine.dispose();
    this.markers.dispose();
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
