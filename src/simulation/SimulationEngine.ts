import { HazardType, HazardSimulation } from './types';
import { HAZARD_ZONES } from '../data/hazards';
import { findShortestPath } from './pathfinding';
import { SimulationEventEmitter } from './events';
import { NetworkNodes } from '../scene/NetworkNodes';
import { HazardEffects } from '../scene/HazardEffects';
import { SimulationMarkers } from '../scene/SimulationMarkers';
import { NETWORK_NODES } from '../data/nodes';
import { TelemetryService } from './telemetry';

export class SimulationEngine {
  public activeSimulations: Map<HazardType, HazardSimulation> = new Map();
  public events: SimulationEventEmitter = new SimulationEventEmitter();
  public blockedNodeIds: Set<number> = new Set();
  public telemetry: TelemetryService = new TelemetryService();

  private networkNodes: NetworkNodes;
  private hazardEffects: HazardEffects;
  private markers: SimulationMarkers;
  private totalElapsedTime: number = 0;

  // Timing specifications
  private readonly BROADCAST_DURATION = 1.1; // ~1.1s alert pulse travel
  private readonly DISPATCH_DELAY = 0.4;     // ~0.4s buffer to reach ~1.5s post-detection
  private readonly RESCUE_DURATION = 3.0;    // ~3.0s rescue unit return
  private readonly RESOLVED_HOLD = 0.9;      // ~0.9s green hold before returning to safe

  constructor(
    networkNodes: NetworkNodes,
    hazardEffects: HazardEffects,
    markers: SimulationMarkers
  ) {
    this.networkNodes = networkNodes;
    this.hazardEffects = hazardEffects;
    this.markers = markers;
  }

  /**
   * Helper to format current timestamp as HH:MM:SS
   */
  private getTimestamp(): string {
    return new Date().toTimeString().split(' ')[0];
  }

  /**
   * Toggles node operational failure status for any of the 7 network nodes.
   * Dynamically triggers self-healing BFS path re-evaluation and emits ROUTE_RECONFIGURED events.
   */
  public setNodeBlocked(nodeId: number, blocked: boolean): void {
    const node = NETWORK_NODES.find((n) => n.id === nodeId);
    const nodeName = node ? node.name : `Node-${nodeId}`;

    if (blocked) {
      this.blockedNodeIds.add(nodeId);
      this.networkNodes.setNodeStatus(nodeId, 'offline');
      this.events.emit({
        type: 'NODE_FAILED',
        nodeId,
        timestamp: this.getTimestamp(),
        message: `NODE OFFLINE — ${nodeName} failed. Mesh auto-rerouting active paths.`,
      });
    } else {
      this.blockedNodeIds.delete(nodeId);
      const restoredStatus = node?.isCommandCenter ? 'command' : 'safe';
      this.networkNodes.setNodeStatus(nodeId, restoredStatus, true);
      this.events.emit({
        type: 'NODE_RESTORED',
        nodeId,
        timestamp: this.getTimestamp(),
        message: `NODE ONLINE — ${nodeName} restored. Mesh topology recovered.`,
      });
    }

    // Dynamic Self-Healing BFS evaluation across all active simulations
    for (const [hazardType, sim] of this.activeSimulations.entries()) {
      const newPath = findShortestPath(sim.hazardNodeId, 0, this.blockedNodeIds);

      if (newPath && newPath.length >= 2) {
        const isPathChanged =
          newPath.length !== sim.path.length ||
          newPath.some((id, idx) => id !== sim.path[idx]);

        if (isPathChanged) {
          sim.path = newPath;
          this.events.emit({
            type: 'ROUTE_RECONFIGURED',
            hazardType,
            hazardNodeId: sim.hazardNodeId,
            path: newPath,
            isRerouted: true,
            timestamp: this.getTimestamp(),
            message: `[SELF-HEALING] ROUTE RECONFIGURED — Cause: ${nodeName} ${blocked ? 'OFFLINE' : 'RESTORED'}. New Route: [${newPath.join(' → ')}]`,
          });
        }
      } else {
        // No route available — sever active pulse/rescue and notify command center
        this.markers.removePulse(sim.id);
        this.markers.removeRescue(sim.id);
        this.events.emit({
          type: 'NO_ROUTE_AVAILABLE',
          hazardType,
          hazardNodeId: sim.hazardNodeId,
          timestamp: this.getTimestamp(),
          message: `NO ROUTE AVAILABLE — Communication path unavailable for Node ${sim.hazardNodeId}. ACTION REQUIRED: Restore network connectivity.`,
        });
      }
    }
  }

  public get activeAlertsCount(): number {
    return this.activeSimulations.size;
  }

  public get teamsDeployedCount(): number {
    let count = 0;
    for (const sim of this.activeSimulations.values()) {
      if (sim.stage === 'DISPATCHED') count++;
    }
    return count;
  }

  /**
   * Returns all active route paths across running simulations.
   */
  public getActiveRoutes(): number[][] {
    const routes: number[][] = [];
    for (const sim of this.activeSimulations.values()) {
      if (sim.path && sim.path.length > 0) {
        routes.push(sim.path);
      }
    }
    return routes;
  }

  /**
   * Triggers a hazard simulation if not already active.
   * @returns true if started, false if already active/ignored
   */
  public triggerHazard(type: HazardType): boolean {
    // Repeated click guard: ignore if already active
    if (this.isHazardActive(type)) {
      return false;
    }

    const spec = HAZARD_ZONES[type];
    const hazardNodeId = spec.targetNodeId;

    // Check if origin hazard node is offline
    if (this.blockedNodeIds.has(hazardNodeId)) {
      console.warn(`Hazard node ${spec.name} is OFFLINE`);
      this.events.emit({
        type: 'NO_ROUTE_AVAILABLE',
        hazardType: type,
        hazardNodeId,
        timestamp: this.getTimestamp(),
        message: `NO_ROUTE_AVAILABLE — ${spec.name} is OFFLINE. Telemetry transmission failed.`,
      });
      return false;
    }

    // Immediately mark node critical (urgency cue)
    this.networkNodes.setNodeStatus(hazardNodeId, 'critical');

    // Immediately start visual hazard effect
    this.hazardEffects.startHazardEffect(type);

    // Calculate BFS route to Command Center (Node 0) respecting all blocked nodes
    const path = findShortestPath(hazardNodeId, 0, this.blockedNodeIds);

    if (!path || path.length < 2) {
      console.warn(`No route available from Node ${hazardNodeId} to Command Center`);
      let failureReason = `No viable mesh path found for ${spec.name}. All redundant routes blocked.`;
      if (this.blockedNodeIds.has(0)) {
        failureReason = 'COMMAND NODE OFFLINE. Rescue dispatch unavailable.';
      }

      this.events.emit({
        type: 'NO_ROUTE_AVAILABLE',
        hazardType: type,
        hazardNodeId,
        timestamp: this.getTimestamp(),
        message: `NO_ROUTE_AVAILABLE — ${failureReason}`,
      });

      // Stop hazard visual effect and recover node state after brief warning cue
      this.hazardEffects.stopHazardEffect(type);
      setTimeout(() => {
        if (!this.blockedNodeIds.has(hazardNodeId) && !this.isHazardActive(type)) {
          this.networkNodes.setNodeStatus(hazardNodeId, 'safe');
        }
      }, 1200);
      return false;
    }

    const simId = `${type}-${Date.now()}`;
    const simulation: HazardSimulation = {
      id: simId,
      hazardType: type,
      hazardNodeId,
      stage: 'BROADCASTING',
      path,
      stageStartedAt: 0,
      elapsedInStage: 0,
      pulseProgress: 0,
      rescueProgress: 0,
    };

    this.activeSimulations.set(type, simulation);

    // Update telemetry state immediately for this active hazard and evaluate edge risk
    this.telemetry.update(this.totalElapsedTime + 0.1, this.activeSimulations, this.blockedNodeIds);
    const assessment = this.telemetry.getEdgeRiskAssessment(hazardNodeId);
    const routeIntel = this.telemetry.getRouteIntelligence(type, this.blockedNodeIds);

    // Emit initial detection event with complete Edge Intelligence
    this.events.emit({
      type: 'HAZARD_DETECTED',
      hazardType: type,
      hazardNodeId,
      path,
      riskScore: assessment.riskScore,
      riskLevel: assessment.riskLevel,
      priority: assessment.priority,
      classification: assessment.classification,
      recommendedAction: assessment.recommendedAction,
      isRerouted: routeIntel.isRerouted,
      timestamp: this.getTimestamp(),
      message: `[AI EDGE] ${assessment.riskLevel} RISK — ${spec.name} (${assessment.classification}). Score: ${assessment.riskScore}/100. Route: [${path.join(' → ')}]${routeIntel.isRerouted ? ' (REROUTED)' : ''}`,
    });

    // Start Alert Pulse marker along path
    this.markers.createPulse(simId, path);
    this.events.emit({
      type: 'BROADCAST_STARTED',
      hazardType: type,
      hazardNodeId,
      path,
      riskScore: assessment.riskScore,
      riskLevel: assessment.riskLevel,
      priority: assessment.priority,
      classification: assessment.classification,
      isRerouted: routeIntel.isRerouted,
      timestamp: this.getTimestamp(),
      message: `[TELEMETRY] Broadcasting emergency pulse to Command Center via [${path.join(' → ')}]`,
    });

    return true;
  }

  public isHazardActive(type: HazardType): boolean {
    const sim = this.activeSimulations.get(type);
    return sim !== undefined && sim.stage !== 'IDLE';
  }

  public getSimulation(type: HazardType): HazardSimulation | undefined {
    return this.activeSimulations.get(type);
  }

  /**
   * Main per-frame update loop called inside ThreeScene requestAnimationFrame.
   */
  public update(deltaTime: number): void {
    this.totalElapsedTime += deltaTime;
    this.telemetry.update(this.totalElapsedTime, this.activeSimulations, this.blockedNodeIds);

    for (const [type, sim] of Array.from(this.activeSimulations.entries())) {
      sim.elapsedInStage += deltaTime;

      switch (sim.stage) {
        case 'BROADCASTING': {
          // Pulse moves from hazard to Command Center
          sim.pulseProgress = Math.min(1, sim.elapsedInStage / this.BROADCAST_DURATION);
          this.markers.updatePulseProgress(sim.id, sim.pulseProgress);

          if (sim.pulseProgress >= 1) {
            // Pulse arrived at Command Center
            this.markers.removePulse(sim.id);
            const assessment = this.telemetry.getEdgeRiskAssessment(sim.hazardNodeId);
            this.events.emit({
              type: 'BROADCAST_COMPLETED',
              hazardType: type,
              hazardNodeId: sim.hazardNodeId,
              path: sim.path,
              riskScore: assessment.riskScore,
              riskLevel: assessment.riskLevel,
              priority: assessment.priority,
              classification: assessment.classification,
              timestamp: this.getTimestamp(),
              message: `Alert received at Command Center from Node ${sim.hazardNodeId}. Risk Score: ${assessment.riskScore}/100. Authorizing rescue unit.`,
            });

            // Transition to DISPATCHED with delay buffer
            sim.stage = 'DISPATCHED';
            sim.elapsedInStage = -this.DISPATCH_DELAY; // brief tactical buffer
            sim.rescueProgress = 0;

            const spec = HAZARD_ZONES[type];
            // Spawn rescue unit at Command Center
            this.markers.createRescue(sim.id, sim.path);
            this.events.emit({
              type: 'RESCUE_DISPATCHED',
              hazardType: type,
              hazardNodeId: sim.hazardNodeId,
              path: [...sim.path].reverse(),
              riskScore: assessment.riskScore,
              riskLevel: assessment.riskLevel,
              priority: assessment.priority,
              classification: assessment.classification,
              recommendedAction: assessment.recommendedAction,
              timestamp: this.getTimestamp(),
              message: `[ACTION] Rescue unit dispatched for ${spec.name}. Action: ${assessment.recommendedAction}`,
            });
          }
          break;
        }

        case 'DISPATCHED': {
          if (sim.elapsedInStage < 0) {
            // In dispatch buffer, rescue unit stays at origin
            this.markers.updateRescueProgress(sim.id, 0);
            break;
          }

          // Rescue marker travels along reversed path
          sim.rescueProgress = Math.min(1, sim.elapsedInStage / this.RESCUE_DURATION);
          this.markers.updateRescueProgress(sim.id, sim.rescueProgress);

          if (sim.rescueProgress >= 1) {
            // Rescue unit arrived at hazard node
            this.markers.removeRescue(sim.id);

            // Node turns green
            this.networkNodes.setNodeStatus(sim.hazardNodeId, 'resolved');

            // Stop hazard visual effect
            this.hazardEffects.stopHazardEffect(type);

            this.events.emit({
              type: 'RESCUE_ARRIVED',
              hazardType: type,
              hazardNodeId: sim.hazardNodeId,
              timestamp: this.getTimestamp(),
              message: `Rescue team arrived on site at Node ${sim.hazardNodeId}. Neutralizing hazard.`,
            });

            this.events.emit({
              type: 'HAZARD_RESOLVED',
              hazardType: type,
              hazardNodeId: sim.hazardNodeId,
              timestamp: this.getTimestamp(),
              message: `Hazard resolved at Node ${sim.hazardNodeId}. Restoring telemetry.`,
            });

            sim.stage = 'RESOLVED';
            sim.elapsedInStage = 0;
          }
          break;
        }

        case 'RESOLVED': {
          // Hold resolved (green) status for ~0.9s
          if (sim.elapsedInStage >= this.RESOLVED_HOLD) {
            // Transition node back to safe state
            this.networkNodes.setNodeStatus(sim.hazardNodeId, 'safe');

            sim.stage = 'IDLE';
            this.activeSimulations.delete(type);
          }
          break;
        }

        default:
          break;
      }
    }
  }

  /**
   * Resets all simulation instances, stops hazard effects, cleans up markers, and resets nodes.
   */
  public reset(): void {
    this.markers.clearAll();
    this.hazardEffects.reset();
    this.activeSimulations.clear();
    this.blockedNodeIds.clear();
    this.telemetry.reset();
    this.totalElapsedTime = 0;
    this.networkNodes.resetAllNodes();

    this.events.emit({
      type: 'SIMULATION_RESET',
      timestamp: this.getTimestamp(),
      message: 'System online. Awaiting hazard trigger…',
    });
  }

  public dispose(): void {
    this.markers.clearAll();
    this.hazardEffects.reset();
    this.activeSimulations.clear();
    this.events.clear();
  }
}
