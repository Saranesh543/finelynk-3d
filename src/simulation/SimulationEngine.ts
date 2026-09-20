import { HazardType, HazardSimulation } from './types';
import { HAZARD_ZONES } from '../data/hazards';
import { findShortestPath } from './pathfinding';
import { SimulationEventEmitter } from './events';
import { NetworkNodes } from '../scene/NetworkNodes';
import { HazardEffects } from '../scene/HazardEffects';
import { SimulationMarkers } from '../scene/SimulationMarkers';

export class SimulationEngine {
  public activeSimulations: Map<HazardType, HazardSimulation> = new Map();
  public events: SimulationEventEmitter = new SimulationEventEmitter();
  public blockedNodeIds: Set<number> = new Set();

  private networkNodes: NetworkNodes;
  private hazardEffects: HazardEffects;
  private markers: SimulationMarkers;

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
   * Toggles node operational failure status (e.g. Relay-11 offline).
   */
  public setNodeBlocked(nodeId: number, blocked: boolean): void {
    if (blocked) {
      this.blockedNodeIds.add(nodeId);
      this.networkNodes.setNodeStatus(nodeId, 'offline');
      this.events.emit({
        type: 'NODE_FAILED',
        nodeId,
        timestamp: this.getTimestamp(),
        message: 'Relay-11 marked OFFLINE — mesh rerouting around failed node',
      });
    } else {
      this.blockedNodeIds.delete(nodeId);
      this.networkNodes.setNodeStatus(nodeId, 'safe', true);
      this.events.emit({
        type: 'NODE_RESTORED',
        nodeId,
        timestamp: this.getTimestamp(),
        message: 'Relay-11 back ONLINE — mesh restored',
      });
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

    // Immediately mark node critical (urgency cue)
    this.networkNodes.setNodeStatus(hazardNodeId, 'critical');

    // Immediately start visual hazard effect
    this.hazardEffects.startHazardEffect(type);

    // Calculate BFS route to Command Center (Node 0) respecting blocked nodes
    const path = findShortestPath(hazardNodeId, 0, this.blockedNodeIds);

    if (!path || path.length < 2) {
      console.warn(`No route available from Node ${hazardNodeId} to Command Center`);
      this.events.emit({
        type: 'NO_ROUTE_AVAILABLE',
        hazardType: type,
        hazardNodeId,
        timestamp: this.getTimestamp(),
        message: `Routing failure: No viable mesh path found for ${spec.name}`,
      });

      // Gracefully terminate and reset node
      this.hazardEffects.stopHazardEffect(type);
      this.networkNodes.setNodeStatus(hazardNodeId, 'safe');
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

    // Emit initial detection event
    this.events.emit({
      type: 'HAZARD_DETECTED',
      hazardType: type,
      hazardNodeId,
      path,
      timestamp: this.getTimestamp(),
      message: `Hazard detected at Node ${spec.name}. Calculating tactical mesh route: ${path.join(' → ')}`,
    });

    // Start Alert Pulse marker along path
    this.markers.createPulse(simId, path);
    this.events.emit({
      type: 'BROADCAST_STARTED',
      hazardType: type,
      hazardNodeId,
      path,
      timestamp: this.getTimestamp(),
      message: `Broadcasting emergency alert pulse to Command Center via [${path.join(' → ')}]`,
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
            this.events.emit({
              type: 'BROADCAST_COMPLETED',
              hazardType: type,
              hazardNodeId: sim.hazardNodeId,
              path: sim.path,
              timestamp: this.getTimestamp(),
              message: `Alert received at Command Center from Node ${sim.hazardNodeId}. Authorizing rescue unit.`,
            });

            // Transition to DISPATCHED with delay buffer
            sim.stage = 'DISPATCHED';
            sim.elapsedInStage = -this.DISPATCH_DELAY; // brief tactical buffer
            sim.rescueProgress = 0;

            // Spawn rescue unit at Command Center
            this.markers.createRescue(sim.id, sim.path);
            this.events.emit({
              type: 'RESCUE_DISPATCHED',
              hazardType: type,
              hazardNodeId: sim.hazardNodeId,
              path: [...sim.path].reverse(),
              timestamp: this.getTimestamp(),
              message: `Rescue team dispatched along route [${[...sim.path].reverse().join(' → ')}]`,
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
    for (const [type, sim] of this.activeSimulations) {
      this.markers.removePulse(sim.id);
      this.markers.removeRescue(sim.id);
      this.hazardEffects.stopHazardEffect(type);
    }
    this.activeSimulations.clear();
    this.blockedNodeIds.clear();
    this.networkNodes.resetAllNodes();

    this.events.emit({
      type: 'SIMULATION_RESET',
      timestamp: this.getTimestamp(),
      message: 'System online. Awaiting hazard trigger…',
    });
  }

  public dispose(): void {
    for (const [type] of this.activeSimulations) {
      this.hazardEffects.stopHazardEffect(type);
    }
    this.activeSimulations.clear();
    this.events.clear();
  }
}
