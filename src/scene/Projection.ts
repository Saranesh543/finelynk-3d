import * as THREE from 'three';

const tempVec = new THREE.Vector3();
const camForward = new THREE.Vector3();
const objToCam = new THREE.Vector3();

export interface ScreenPosition {
  x: number;
  y: number;
  visible: boolean;
}

export function projectToScreen(
  worldPos: THREE.Vector3 | [number, number, number],
  camera: THREE.Camera,
  width: number,
  height: number
): ScreenPosition {
  if (Array.isArray(worldPos)) {
    tempVec.set(worldPos[0], worldPos[1], worldPos[2]);
  } else {
    tempVec.copy(worldPos);
  }

  // Check if position is in front of camera
  camera.getWorldDirection(camForward);
  objToCam.subVectors(tempVec, camera.position);
  const dot = camForward.dot(objToCam);
  if (dot <= 0) {
    return { x: -1000, y: -1000, visible: false };
  }

  // Project to NDC
  tempVec.project(camera);

  // Behind camera or clipped
  if (tempVec.z > 1.0) {
    return { x: -1000, y: -1000, visible: false };
  }

  const x = (tempVec.x * 0.5 + 0.5) * width;
  const y = (-(tempVec.y * 0.5) + 0.5) * height;

  // Margin buffer check
  const visible = x >= -50 && x <= width + 50 && y >= -50 && y <= height + 50;

  return { x, y, visible };
}
