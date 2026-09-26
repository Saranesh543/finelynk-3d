import React, { useEffect, useRef, useState } from 'react';
import { ThreeScene } from './scene/ThreeScene';
import { HUD } from './ui/HUD';
import { HazardType } from './simulation/types';
import { InteractiveTarget } from './interaction/types';

export const App: React.FC = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ThreeScene | null>(null);
  const [sceneInstance, setSceneInstance] = useState<ThreeScene | null>(null);

  // HUD Interactive States
  const [showLinks, setShowLinks] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);

  // Universal Node Failure tracking
  const [failedNodes, setFailedNodes] = useState<Set<number>>(new Set());

  // Interactive Selection and Hover states
  const [selectedTarget, setSelectedTarget] = useState<InteractiveTarget | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<InteractiveTarget | null>(null);

  // Active Hazard State tracking
  const [activeHazards, setActiveHazards] = useState<Record<HazardType, boolean>>({
    flood: false,
    fire: false,
    industrial: false,
  });

  // Telemetry chip states
  const [activeAlerts, setActiveAlerts] = useState<number>(0);
  const [teamsDeployed, setTeamsDeployed] = useState<number>(0);

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    // Initialize full-bleed 3D world
    const scene = new ThreeScene(canvasContainerRef.current);
    sceneRef.current = scene;
    setSceneInstance(scene);

    // Listen to 3D raycast selection & hover from InteractionManager
    const unselect = scene.interactionManager.onSelect((target) => {
      setSelectedTarget(target);
    });

    const unhover = scene.interactionManager.onHover((target) => {
      setHoveredTarget(target);
    });

    // Subscribe to simulation lifecycle events to reflect active hazard states & telemetry
    const unsubscribe = scene.simulationEngine.events.on('*', (event) => {
      if (event.type === 'HAZARD_DETECTED') {
        setActiveHazards((prev) => ({ ...prev, [event.hazardType as string]: true }));
        setActiveAlerts((prev) => prev + 1);
      } else if (event.type === 'RESCUE_DISPATCHED') {
        setTeamsDeployed((prev) => prev + 1);
      } else if (event.type === 'HAZARD_RESOLVED') {
        setActiveHazards((prev) => ({ ...prev, [event.hazardType as string]: false }));
        setActiveAlerts((prev) => Math.max(0, prev - 1));
        setTeamsDeployed((prev) => Math.max(0, prev - 1));
      } else if (event.type === 'NO_ROUTE_AVAILABLE') {
        setActiveHazards((prev) => ({ ...prev, [event.hazardType as string]: false }));
      } else if (event.type === 'NODE_FAILED' && event.nodeId !== undefined) {
        setFailedNodes((prev) => new Set(prev).add(event.nodeId!));
      } else if (event.type === 'NODE_RESTORED' && event.nodeId !== undefined) {
        setFailedNodes((prev) => {
          const next = new Set(prev);
          next.delete(event.nodeId!);
          return next;
        });
      } else if (event.type === 'SIMULATION_RESET') {
        setActiveHazards({ flood: false, fire: false, industrial: false });
        setActiveAlerts(0);
        setTeamsDeployed(0);
        setFailedNodes(new Set());
        setSelectedTarget(null);
        setHoveredTarget(null);
      }
    });

    return () => {
      unselect();
      unhover();
      unsubscribe();
      scene.dispose();
      sceneRef.current = null;
      setSceneInstance(null);
    };
  }, []);

  // Trigger a hazard through the simulation engine
  const handleTriggerHazard = (type: HazardType) => {
    if (sceneRef.current) {
      sceneRef.current.triggerHazard(type);
    }
  };

  // Synchronize mesh links visibility with ThreeScene
  const handleToggleLinks = (show: boolean) => {
    setShowLinks(show);
    if (sceneRef.current) {
      sceneRef.current.setMeshLinksVisible(show);
    }
  };

  // Universal Node Failure & Restoration (Nodes 0 through 6)
  const handleToggleNodeFailure = (nodeId: number, failed: boolean) => {
    if (sceneRef.current) {
      sceneRef.current.setNodeFailure(nodeId, failed);
    }
    setFailedNodes((prev) => {
      const next = new Set(prev);
      if (failed) next.add(nodeId);
      else next.delete(nodeId);
      return next;
    });
  };

  const handleSelectTarget = (target: InteractiveTarget | null) => {
    setSelectedTarget(target);
    if (sceneRef.current) {
      sceneRef.current.interactionManager.selectTarget(target);
    }
  };

  // Pristine reset of all active simulations, markers, and states
  const handleResetSimulation = () => {
    if (sceneRef.current) {
      sceneRef.current.resetSimulation();
    }
    setFailedNodes(new Set());
    setSelectedTarget(null);
    setHoveredTarget(null);
    setActiveHazards({ flood: false, fire: false, industrial: false });
    setActiveAlerts(0);
    setTeamsDeployed(0);
  };

  return (
    <main style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* 3D Scene Layer - Full-bleed, sits behind HUD */}
      <div
        ref={canvasContainerRef}
        className="canvas-container"
        aria-label="Interactive 3D Tactical Mesh Network Visualization"
      />

      {/* HUD Layer - Overlays on top with non-blocking pointer events */}
      <HUD
        scene={sceneInstance}
        showLinks={showLinks}
        onToggleLinks={handleToggleLinks}
        showLabels={showLabels}
        onToggleLabels={setShowLabels}
        activeHazards={activeHazards}
        onTriggerHazard={handleTriggerHazard}
        onResetSimulation={handleResetSimulation}
        activeAlerts={activeAlerts}
        teamsDeployed={teamsDeployed}
        selectedTarget={selectedTarget}
        onSelectTarget={handleSelectTarget}
        hoveredTarget={hoveredTarget}
        failedNodeIds={failedNodes}
        onToggleNodeFailure={handleToggleNodeFailure}
      />
    </main>
  );
};

export default App;
