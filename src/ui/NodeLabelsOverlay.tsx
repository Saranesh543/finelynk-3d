import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { NETWORK_NODES, NodeData } from '../data/nodes';
import { NodeStatus } from '../data/tokens';
import { projectToScreen, ScreenPosition } from '../scene/Projection';
import { ThreeScene } from '../scene/ThreeScene';

interface NodeLabelsOverlayProps {
  scene: ThreeScene | null;
  showLabels: boolean;
}

interface ProjectedLabel {
  node: NodeData;
  status: NodeStatus;
  screenPos: ScreenPosition;
}

export const NodeLabelsOverlay: React.FC<NodeLabelsOverlayProps> = ({ scene, showLabels }) => {
  const [projected, setProjected] = useState<ProjectedLabel[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scene) return;

    // Register frame callback to continuously project 3D coordinates onto 2D viewport
    const unregister = scene.addFrameCallback((camera: THREE.PerspectiveCamera, width: number, height: number) => {
      if (!showLabels) return;

      const results: ProjectedLabel[] = [];

      for (const node of NETWORK_NODES) {
        const corePos = scene.networkNodes.getCoreWorldPosition(node.id);
        if (!corePos) continue;

        // Position slightly above the node's floating core
        const labelWorldPos: [number, number, number] = [
          corePos.x,
          corePos.y + node.coreRadius + 0.6,
          corePos.z,
        ];

        const currentStatus = scene.networkNodes.getNodeStatus(node.id) || node.status;
        const screenPos = projectToScreen(labelWorldPos, camera, width, height);
        results.push({ node, status: currentStatus, screenPos });
      }

      setProjected(results);
    });

    return () => unregister();
  }, [scene, showLabels]);

  if (!showLabels) return null;

  return (
    <div ref={containerRef} className="node-labels-container">
      {projected.map(({ node, status, screenPos }) => {
        if (!screenPos.visible) return null;

        return (
          <div
            key={node.id}
            className={`node-label-item ${status}`}
            style={{
              left: `${screenPos.x}px`,
              top: `${screenPos.y}px`,
            }}
          >
            {node.name}
          </div>
        );
      })}

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
