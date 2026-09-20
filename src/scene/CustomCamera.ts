import * as THREE from 'three';

export class CustomCamera {
  public camera: THREE.PerspectiveCamera;
  public target: THREE.Vector3 = new THREE.Vector3(0, 3, 0);

  // Spherical coordinates
  // Theta: azimuth, Phi: polar angle from +Y axis, Radius: distance to target
  private theta: number = 0.9;
  private phi: number = 1.02;
  private radius: number = 62;

  // Target values for smooth lerp damping
  private targetTheta: number = 0.9;
  private targetPhi: number = 1.02;
  private targetRadius: number = 62;

  // Clamps per specification
  // 20° = ~0.349 rad, 83° = ~1.448 rad
  private readonly minPhi = 20 * (Math.PI / 180);
  private readonly maxPhi = 83 * (Math.PI / 180);
  private readonly minRadius = 22;
  private readonly maxRadius = 120;

  // Interaction tracking
  private domElement: HTMLElement;
  private isInteracting: boolean = false;
  private activePointers: Map<number, { x: number; y: number }> = new Map();
  private prevPinchDist: number = 0;

  public get isUserInteracting(): boolean {
    return this.isInteracting;
  }

  constructor(domElement: HTMLElement, aspect: number) {
    this.domElement = domElement;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.5, 500);

    this.updateCameraPosition(true);
    this.attachEventListeners();
  }

  public updateAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  public update(): void {
    // Smooth damping
    const damping = 0.12;
    this.theta += (this.targetTheta - this.theta) * damping;
    this.phi += (this.targetPhi - this.phi) * damping;
    this.radius += (this.targetRadius - this.radius) * damping;

    this.updateCameraPosition();
  }

  private updateCameraPosition(force: boolean = false): void {
    // Spherical to Cartesian conversion
    const sinPhi = Math.sin(this.phi);
    const cosPhi = Math.cos(this.phi);
    const sinTheta = Math.sin(this.theta);
    const cosTheta = Math.cos(this.theta);

    this.camera.position.x = this.target.x + this.radius * sinPhi * sinTheta;
    this.camera.position.y = this.target.y + this.radius * cosPhi;
    this.camera.position.z = this.target.z + this.radius * sinPhi * cosTheta;

    this.camera.lookAt(this.target);
    if (force) {
      this.camera.updateMatrixWorld();
    }
  }

  private attachEventListeners(): void {
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
    this.domElement.addEventListener('pointercancel', this.onPointerUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
  }

  public dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('pointercancel', this.onPointerUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
  }

  private onPointerDown = (e: PointerEvent): void => {
    // Only handle primary or touch pointers
    this.domElement.setPointerCapture(e.pointerId);
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.isInteracting = true;

    if (this.activePointers.size === 2) {
      const pts = Array.from(this.activePointers.values());
      this.prevPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.activePointers.has(e.pointerId)) return;

    const prevPos = this.activePointers.get(e.pointerId)!;
    const currentPos = { x: e.clientX, y: e.clientY };

    if (this.activePointers.size === 1) {
      // 1-pointer drag: rotate azimuth (theta) and polar (phi)
      const deltaX = currentPos.x - prevPos.x;
      const deltaY = currentPos.y - prevPos.y;

      const rotSpeed = 0.005;
      this.targetTheta -= deltaX * rotSpeed;
      this.targetPhi -= deltaY * rotSpeed;

      // Clamp polar angle
      this.targetPhi = Math.max(this.minPhi, Math.min(this.maxPhi, this.targetPhi));
    } else if (this.activePointers.size === 2) {
      // 2-pointer pinch: zoom
      this.activePointers.set(e.pointerId, currentPos);
      const pts = Array.from(this.activePointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);

      if (this.prevPinchDist > 0) {
        const pinchDelta = dist - this.prevPinchDist;
        const zoomSpeed = 0.15;
        this.targetRadius -= pinchDelta * zoomSpeed;
        this.targetRadius = Math.max(this.minRadius, Math.min(this.maxRadius, this.targetRadius));
      }
      this.prevPinchDist = dist;
      return;
    }

    this.activePointers.set(e.pointerId, currentPos);
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.domElement.hasPointerCapture(e.pointerId)) {
      this.domElement.releasePointerCapture(e.pointerId);
    }
    this.activePointers.delete(e.pointerId);
    if (this.activePointers.size === 0) {
      this.isInteracting = false;
      this.prevPinchDist = 0;
    } else if (this.activePointers.size === 1) {
      this.prevPinchDist = 0;
    }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const zoomSpeed = 0.04;
    this.targetRadius += e.deltaY * zoomSpeed;
    this.targetRadius = Math.max(this.minRadius, Math.min(this.maxRadius, this.targetRadius));
  };
}
