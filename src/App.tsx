import React, { useEffect, useRef, useState } from 'react';
import { ThreeScene } from './scene/ThreeScene';
import { HUD } from './ui/HUD';

import { HazardType } from './simulation/types';

export const App: React.FC = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ThreeScene | null>(null);
  const [sceneInstance, setSceneInstance] = useState<ThreeScene | null>(null);

  // HUD Interactive States
  const [showLinks, setShowLinks] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [simulateFailure, setSimulateFailure] = useState<boolean>(false);

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
      } else if (event.type === 'SIMULATION_RESET') {
        setActiveHazards({ flood: false, fire: false, industrial: false });
        setActiveAlerts(0);
        setTeamsDeployed(0);
        setSimulateFailure(false);
      }
    });

    return () => {
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

  // Simulate node failure (Node 4: Relay-11)
  const handleToggleSimulateFailure = (simulate: boolean) => {
    setSimulateFailure(simulate);
    if (sceneRef.current) {
      sceneRef.current.setNodeFailure(4, simulate);
    }
  };

  // Pristine reset of all active simulations, markers, and states
  const handleResetSimulation = () => {
    if (sceneRef.current) {
      sceneRef.current.resetSimulation();
    }
    setSimulateFailure(false);
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
        simulateFailure={simulateFailure}
        onToggleSimulateFailure={handleToggleSimulateFailure}
        activeHazards={activeHazards}
        onTriggerHazard={handleTriggerHazard}
        onResetSimulation={handleResetSimulation}
        activeAlerts={activeAlerts}
        teamsDeployed={teamsDeployed}
      />
    </main>
  );
};

export default App;
