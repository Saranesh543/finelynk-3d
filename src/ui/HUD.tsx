import React from 'react';
import { motion } from 'motion/react';
import { TopBar } from './TopBar';
import { LeftControlPanel } from './LeftControlPanel';
import { RightAlertFeed } from './RightAlertFeed';
import { BottomLegend } from './BottomLegend';
import { NodeLabelsOverlay } from './NodeLabelsOverlay';
import { ContextualDetailPanel } from './ContextualDetailPanel';
import { ThreeScene } from '../scene/ThreeScene';
import { HazardType } from '../simulation/types';
import { InteractiveTarget } from '../interaction/types';
import { NETWORK_NODES } from '../data/nodes';

interface HUDProps {
  scene: ThreeScene | null;
  showLinks: boolean;
  onToggleLinks: (show: boolean) => void;
  showLabels: boolean;
  onToggleLabels: (show: boolean) => void;
  activeHazards: Record<HazardType, boolean>;
  onTriggerHazard: (type: HazardType) => void;
  onResetSimulation: () => void;
  activeAlerts: number;
  teamsDeployed: number;
  selectedTarget: InteractiveTarget | null;
  onSelectTarget: (target: InteractiveTarget | null) => void;
  hoveredTarget: InteractiveTarget | null;
  failedNodeIds: Set<number>;
  onToggleNodeFailure: (nodeId: number, failed: boolean) => void;
}

export const HUD: React.FC<HUDProps> = ({
  scene,
  showLinks,
  onToggleLinks,
  showLabels,
  onToggleLabels,
  activeHazards,
  onTriggerHazard,
  onResetSimulation,
  activeAlerts,
  teamsDeployed,
  selectedTarget,
  onSelectTarget,
  hoveredTarget,
  failedNodeIds,
  onToggleNodeFailure,
}) => {
  const selectedNodeId = selectedTarget?.type === 'node' ? selectedTarget.id : null;
  const hoveredNodeId = hoveredTarget?.type === 'node' ? hoveredTarget.id : null;

  const telemetry = scene?.simulationEngine.telemetry ?? null;
  const networkHealthPct = telemetry
    ? telemetry.getCommandCenterIntelligence(failedNodeIds, activeAlerts).networkHealthPct
    : 100;

  return (
    <div className="hud-overlay">
      {/* Top Bar with entrance animation */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <TopBar
          totalNodes={NETWORK_NODES.length}
          failedNodeCount={failedNodeIds.size}
          activeAlerts={activeAlerts}
          teamsDeployed={teamsDeployed}
          networkHealthPct={networkHealthPct}
        />
      </motion.div>

      {/* Contextual Inspector Panel for Selected Object or System Intelligence Summary */}
      <ContextualDetailPanel
        target={selectedTarget}
        onClose={() => onSelectTarget(null)}
        onToggleNodeFailure={onToggleNodeFailure}
        isNodeFailed={(id) => failedNodeIds.has(id)}
        onTriggerHazard={onTriggerHazard}
        isHazardActive={(type) => !!activeHazards[type]}
        telemetry={telemetry}
        failedNodeIds={failedNodeIds}
        activeAlertsCount={activeAlerts}
      />

      {/* Center Layout with Left and Right Panels */}
      <div className="hud-body">
        <motion.div
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
        >
          <LeftControlPanel
            showLinks={showLinks}
            onToggleLinks={onToggleLinks}
            showLabels={showLabels}
            onToggleLabels={onToggleLabels}
            activeHazards={activeHazards}
            onTriggerHazard={onTriggerHazard}
            onResetSimulation={onResetSimulation}
            selectedNodeId={selectedNodeId}
            onSelectNode={(nodeId) => {
              const nodeMesh = scene?.networkNodes.nodeMeshes.get(nodeId);
              if (nodeMesh) {
                // Find target from raycast registry or construct target
                const hit = scene?.raycastRegistry
                  .getInteractiveObjects()
                  .find((m) => m.userData?.interactiveTarget?.id === nodeId);
                if (hit) {
                  onSelectTarget(hit.userData.interactiveTarget);
                  scene?.interactionManager.selectTarget(hit.userData.interactiveTarget);
                }
              }
            }}
            failedNodeIds={failedNodeIds}
            onToggleNodeFailure={onToggleNodeFailure}
          />
        </motion.div>

        <motion.div
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.15, ease: 'easeOut' }}
        >
          <RightAlertFeed events={scene?.simulationEngine.events} />
        </motion.div>
      </div>

      {/* Floating Bottom Legend */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
      >
        <BottomLegend />
      </motion.div>

      {/* Floating 2D HTML Labels projected from 3D Nodes */}
      <NodeLabelsOverlay
        scene={scene}
        showLabels={showLabels}
        selectedNodeId={selectedNodeId}
        hoveredNodeId={hoveredNodeId}
      />

      <style>{`
        .hud-body {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          width: 100%;
          flex: 1;
          pointer-events: none;
        }

        @media (max-width: 760px) {
          .hud-body {
            flex-direction: column;
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
};
