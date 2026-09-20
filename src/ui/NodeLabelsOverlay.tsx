import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { NETWORK_NODES } from '../data/nodes';
import { NodeStatus } from '../data/tokens';
import { projectToScreen } from '../scene/Projection';
import { ThreeScene } from '../scene/ThreeScene';

interface NodeLabelsOverlayProps {
  scene: ThreeScene | null;
  showLabels: boolean;
}

// Module-level reusable vector to avoid per-frame allocations
const labelPosVec = new THREE.Vector3();

export const NodeLabelsOverlay: React.FC<NodeLabelsOverlayProps> = ({ scene, showLabels }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const lastStatusMap = useRef<Map<number, NodeStatus>>(new Map());

  useEffect(() => {
    if (!scene) return;

    // Register high-performance frame callback updating DOM transforms directly
    // Avoids 60 React re-renders per second & eliminates GC pressure
    const unregister = scene.addFrameCallback((camera: THREE.PerspectiveCamera, width: number, height: number) => {
      if (!showLabels) return;

      for (const node of NETWORK_NODES) {
        const el = labelRefs.current.get(node.id);
        if (!el) continue;

        const corePos = scene.networkNodes.getCoreWorldPosition(node.id);
        if (!corePos) {
          el.style.display = 'none';
          continue;
        }

        // Reusable vector position slightly above the node's floating core
        labelPosVec.set(corePos.x, corePos.y + node.coreRadius + 0.6, corePos.z);

        const screenPos = projectToScreen(labelPosVec, camera, width, height);

        if (!screenPos.visible) {
          el.style.display = 'none';
        } else {
          el.style.display = 'block';
          // Use GPU-accelerated translate3d to avoid browser layout thrashing
          el.style.transform = `translate3d(${screenPos.x}px, ${screenPos.y}px, 0) translate(-50%, -100%)`;
        }

        // Only update class name if status actually changed
        const currentStatus = scene.networkNodes.getNodeStatus(node.id) || node.status;
        if (lastStatusMap.current.get(node.id) !== currentStatus) {
          lastStatusMap.current.set(node.id, currentStatus);
          el.className = `node-label-item ${currentStatus}`;
        }
      }
    });

    return () => unregister();
  }, [scene, showLabels]);

  if (!showLabels) return null;

  return (
    <div ref={containerRef} className="node-labels-container" aria-hidden="true">
      {NETWORK_NODES.map((node) => (
        <div
          key={node.id}
          ref={(el) => {
            if (el) {
              labelRefs.current.set(node.id, el);
            } else {
              labelRefs.current.delete(node.id);
            }
          }}
          className={`node-label-item ${node.status}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            display: 'none',
          }}
        >
          {node.name}
        </div>
      ))}

      <style>{`
        .node-labels-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 15;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};
