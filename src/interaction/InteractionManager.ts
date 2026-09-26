import * as THREE from 'three';
import { RaycastRegistry } from './RaycastRegistry';
import { InteractiveTarget } from './types';

export type SelectCallback = (target: InteractiveTarget | null) => void;
export type HoverCallback = (target: InteractiveTarget | null) => void;

export class InteractionManager {
  private domElement: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private registry: RaycastRegistry;
  private raycaster: THREE.Raycaster;
  private mouseNDC: THREE.Vector2;

  // Pointer discrimination state
  private startPointerX: number = 0;
  private startPointerY: number = 0;
  private startPointerTime: number = 0;
  private isPointerDown: boolean = false;
  private readonly dragThresholdSq: number = 8 * 8; // 8px displacement threshold
  private readonly maxClickDurationMs: number = 600;

  // Selection & Hover State
  private selectedTarget: InteractiveTarget | null = null;
  private hoveredTarget: InteractiveTarget | null = null;

  // Callbacks
  private selectCallbacks: Set<SelectCallback> = new Set();
  private hoverCallbacks: Set<HoverCallback> = new Set();

  constructor(domElement: HTMLElement, camera: THREE.PerspectiveCamera, registry: RaycastRegistry) {
    this.domElement = domElement;
    this.camera = camera;
    this.registry = registry;
    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();

    this.attachListeners();
  }

  private attachListeners(): void {
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
    this.domElement.addEventListener('pointercancel', this.onPointerCancel);
  }

  private onPointerDown = (e: PointerEvent): void => {
    // Only track primary clicks (left-click or single touch)
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    this.isPointerDown = true;
    this.startPointerX = e.clientX;
    this.startPointerY = e.clientY;
    this.startPointerTime = performance.now();
  };

  private onPointerMove = (e: PointerEvent): void => {
    // Desktop hover feedback only when not dragging/clicking
    if (this.isPointerDown && e.pointerType === 'mouse') {
      const dx = e.clientX - this.startPointerX;
      const dy = e.clientY - this.startPointerY;
      if (dx * dx + dy * dy >= this.dragThresholdSq) {
        // Active camera drag in progress
        this.domElement.style.cursor = 'grabbing';
      }
      return;
    }

    if (e.pointerType === 'touch') return; // Do not execute hover logic on touch devices

    const rect = this.domElement.getBoundingClientRect();
    this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const intersects = this.raycaster.intersectObjects(this.registry.getInteractiveObjects(), false);

    if (intersects.length > 0) {
      const target = intersects[0].object.userData.interactiveTarget as InteractiveTarget;
      this.domElement.style.cursor = 'pointer';
      if (!this.hoveredTarget || this.hoveredTarget.name !== target.name) {
        this.hoveredTarget = target;
        this.notifyHover(target);
      }
    } else {
      this.domElement.style.cursor = 'default';
      if (this.hoveredTarget !== null) {
        this.hoveredTarget = null;
        this.notifyHover(null);
      }
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.isPointerDown) return;
    this.isPointerDown = false;

    const dx = e.clientX - this.startPointerX;
    const dy = e.clientY - this.startPointerY;
    const duration = performance.now() - this.startPointerTime;

    // Pointer Discrimination:
    // If pointer moved more than 8px or took longer than 600ms, it is a CAMERA ORBIT / PAN drag.
    if (dx * dx + dy * dy >= this.dragThresholdSq || duration > this.maxClickDurationMs) {
      this.domElement.style.cursor = 'default';
      return;
    }

    // Genuine Click or Tap!
    const rect = this.domElement.getBoundingClientRect();
    this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const intersects = this.raycaster.intersectObjects(this.registry.getInteractiveObjects(), false);

    if (intersects.length > 0) {
      const target = intersects[0].object.userData.interactiveTarget as InteractiveTarget;
      this.selectTarget(target);
    } else {
      // Clicked on empty terrain or background -> deselect
      this.selectTarget(null);
    }
  };

  private onPointerCancel = (): void => {
    this.isPointerDown = false;
  };

  public selectTarget(target: InteractiveTarget | null): void {
    this.selectedTarget = target;
    for (const cb of this.selectCallbacks) {
      cb(target);
    }
  }

  public getSelectedTarget(): InteractiveTarget | null {
    return this.selectedTarget;
  }

  private notifyHover(target: InteractiveTarget | null): void {
    for (const cb of this.hoverCallbacks) {
      cb(target);
    }
  }

  public onSelect(cb: SelectCallback): () => void {
    this.selectCallbacks.add(cb);
    return () => this.selectCallbacks.delete(cb);
  }

  public onHover(cb: HoverCallback): () => void {
    this.hoverCallbacks.add(cb);
    return () => this.hoverCallbacks.delete(cb);
  }

  public dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('pointercancel', this.onPointerCancel);
    this.selectCallbacks.clear();
    this.hoverCallbacks.clear();
  }
}
