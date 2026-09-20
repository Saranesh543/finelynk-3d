import React from 'react';
import { motion } from 'motion/react';
import { TopBar } from './TopBar';
import { LeftControlPanel } from './LeftControlPanel';
import { RightAlertFeed } from './RightAlertFeed';
import { BottomLegend } from './BottomLegend';
import { NodeLabelsOverlay } from './NodeLabelsOverlay';
import { ThreeScene } from '../scene/ThreeScene';

import { HazardType } from '../simulation/types';

interface HUDProps {
  scene: ThreeScene | null;
  showLinks: boolean;
  onToggleLinks: (show: boolean) => void;
  showLabels: boolean;
  onToggleLabels: (show: boolean) => void;
  simulateFailure: boolean;
  onToggleSimulateFailure: (simulate: boolean) => void;
  activeHazards: Record<HazardType, boolean>;
  onTriggerHazard: (type: HazardType) => void;
  onResetSimulation: () => void;
  activeAlerts: number;
  teamsDeployed: number;
}

export const HUD: React.FC<HUDProps> = ({
  scene,
  showLinks,
  onToggleLinks,
  showLabels,
  onToggleLabels,
  simulateFailure,
  onToggleSimulateFailure,
  activeHazards,
  onTriggerHazard,
  onResetSimulation,
  activeAlerts,
  teamsDeployed,
}) => {
  return (
    <div className="hud-overlay">
      {/* Top Bar with entrance animation */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <TopBar totalNodes={7} activeAlerts={activeAlerts} teamsDeployed={teamsDeployed} />
      </motion.div>

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
            simulateFailure={simulateFailure}
            onToggleSimulateFailure={onToggleSimulateFailure}
            activeHazards={activeHazards}
            onTriggerHazard={onTriggerHazard}
            onResetSimulation={onResetSimulation}
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
      <NodeLabelsOverlay scene={scene} showLabels={showLabels} />

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
