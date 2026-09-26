// FineLynk Environmental Telemetry & Edge Intelligence Model
// Phase 6A: Simulated Environmental Telemetry, Edge Risk Scoring & Network Health
// Note: All measurements are strictly SIMULATED DEMO TELEMETRY.

import { MESH_EDGES } from '../data/graph';
import { NETWORK_NODES } from '../data/nodes';
import { HazardType, HazardSimulation } from './types';
import { findShortestPath } from './pathfinding';

export type SensorHealth = 'ONLINE' | 'DEGRADED' | 'FAULT';
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type PriorityLevel = 'MONITORING' | 'ELEVATED' | 'URGENT' | 'EMERGENCY';

export interface FloodTelemetry {
  waterLevel: number; // percentage (0 - 100%)
  rainfall: number; // mm/h (0 - 60 mm/h)
  soilMoisture: number; // percentage (0 - 100%)
  temperature: number; // °C
  sensorHealth: SensorHealth;
  history: number[]; // Sparkline buffer for waterLevel
}

export interface FireTelemetry {
  smoke: number; // ppm (0 - 300 ppm)
  airQualityIndex: number; // AQI (0 - 300)
  temperature: number; // °C
  humidity: number; // percentage (0 - 100%)
  flameDetected: boolean;
  sensorHealth: SensorHealth;
  history: number[]; // Sparkline buffer for temperature
}

export interface IndustrialTelemetry {
  vocGas: number; // ppm (0 - 250 ppm)
  temperature: number; // °C
  pressure: number; // kPa (nominal ~101.3 kPa)
  anomalyDeviation: number; // percentage (0 - 100%)
  sensorHealth: SensorHealth;
  history: number[]; // Sparkline buffer for anomalyDeviation
}

export interface RelayTelemetry {
  linkQuality: number; // percentage (0 - 100%)
  rssi: number; // dBm (-95 to -55 dBm)
  connectivity: 'CONNECTED' | 'DEGRADED' | 'ISOLATED';
  packetState: 'FORWARDING' | 'QUEUE_CLEAR' | 'DROPPED_ROUTE';
  neighborCount: number; // Active online neighbors
  totalNeighbors: number; // Total physical topology neighbors
  nodeHealth: number; // percentage (0 or 98-100%)
  sensorHealth: SensorHealth;
}

export interface CommandCenterIntelligence {
  networkHealthPct: number; // Available active edges / Total edges * 100%
  onlineNodesCount: number;
  totalNodesCount: number;
  activeEdgesCount: number;
  totalEdgesCount: number;
  activeAlertsCount: number;
  highestRiskNodeName: string;
  highestRiskScore: number;
  highestRiskLevel: RiskLevel;
  gatewayStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  meshStatus: 'SELF-HEALING READY' | 'TOPOLOGY DEGRADED' | 'ISOLATED';
}

export interface EdgeRiskAssessment {
  riskScore: number; // 0 - 100
  riskLevel: RiskLevel;
  priority: PriorityLevel;
  classification: string;
  anomalyDetected: boolean;
  recommendedAction: string;
}

export interface RouteIntelligence {
  primaryPath: number[];
  currentPath: number[] | null;
  pathNodeNames: string[];
  isRerouted: boolean;
  statusText: 'PRIMARY ROUTE' | 'REROUTED — NODE FAILURE' | 'ROUTE SEVERED';
}

/**
 * Deterministic pseudo-random jitter generator.
 * Produces smooth, reproducible oscillations for simulated field telemetry.
 */
class TelemetryJitter {
  private phase: number;
  constructor(seed: number = 1337) {
    this.phase = seed % 1000;
  }
  public next(frequency: number = 1.0): number {
    this.phase += frequency;
    return Math.sin(this.phase * 0.42) * Math.cos(this.phase * 0.28);
  }
}

export class TelemetryService {
  public flood: FloodTelemetry;
  public fire: FireTelemetry;
  public industrial: IndustrialTelemetry;

  private jitter = new TelemetryJitter(42);
  private lastTickTime: number = 0;
  private readonly TICK_INTERVAL_MS = 600; // Controlled update cadence (600ms)

  // Canonical baseline routes when network is 100% operational
  public readonly PRIMARY_ROUTES: Record<HazardType, number[]>;

  constructor() {
    this.PRIMARY_ROUTES = {
      flood: findShortestPath(1, 0) || [1, 10, 0],
      fire: findShortestPath(2, 0) || [2, 14, 0],
      industrial: findShortestPath(3, 0) || [3, 18, 0],
    };
    this.flood = this.createInitialFloodState();
    this.fire = this.createInitialFireState();
    this.industrial = this.createInitialIndustrialState();
  }

  private createInitialFloodState(): FloodTelemetry {
    return {
      waterLevel: 14.5,
      rainfall: 0.8,
      soilMoisture: 32.0,
      temperature: 23.4,
      sensorHealth: 'ONLINE',
      history: [12, 13, 14, 13.5, 14, 15, 14.2, 14.8, 14.5, 14.3, 14.5, 14.5],
    };
  }

  private createInitialFireState(): FireTelemetry {
    return {
      smoke: 11.2,
      airQualityIndex: 34,
      temperature: 25.8,
      humidity: 58.0,
      flameDetected: false,
      sensorHealth: 'ONLINE',
      history: [25.2, 25.5, 25.4, 25.6, 25.8, 25.7, 25.9, 25.8, 25.7, 25.8, 25.8, 25.8],
    };
  }

  private createInitialIndustrialState(): IndustrialTelemetry {
    return {
      vocGas: 14.0,
      temperature: 24.2,
      pressure: 101.3,
      anomalyDeviation: 3.5,
      sensorHealth: 'ONLINE',
      history: [3.2, 3.5, 3.4, 3.6, 3.2, 3.5, 3.7, 3.4, 3.6, 3.5, 3.4, 3.5],
    };
  }

  /**
   * Resets all telemetry models and history buffers to pristine baselines.
   */
  public reset(): void {
    this.flood = this.createInitialFloodState();
    this.fire = this.createInitialFireState();
    this.industrial = this.createInitialIndustrialState();
    this.lastTickTime = 0;
  }

  /**
   * Updates telemetry values periodically at controlled interval (e.g. ~600ms).
   * Runs deterministically based on whether hazards are currently triggered or idle.
   */
  public update(
    elapsedSeconds: number,
    activeSimulations: Map<HazardType, HazardSimulation>,
    blockedNodeIds: Set<number>
  ): void {
    const nowMs = elapsedSeconds * 1000;
    if (nowMs - this.lastTickTime < this.TICK_INTERVAL_MS) {
      return;
    }
    this.lastTickTime = nowMs;

    const j1 = this.jitter.next(0.5);
    const j2 = this.jitter.next(0.7);
    const j3 = this.jitter.next(0.4);

    // 1. Update Flood Node Telemetry (Node 1)
    const floodActive = activeSimulations.has('flood');
    const floodSim = activeSimulations.get('flood');
    const floodStage = floodSim ? floodSim.stage : 'IDLE';

    if (floodActive && (floodStage === 'BROADCASTING' || floodStage === 'DISPATCHED')) {
      // Escalated flood conditions
      this.flood.waterLevel = Math.min(94, Math.max(72, 78 + j1 * 5));
      this.flood.rainfall = Math.min(48, Math.max(16, 22 + j2 * 4));
      this.flood.soilMoisture = Math.min(98, Math.max(80, 86 + j3 * 3));
      this.flood.temperature = Math.min(22, Math.max(18, 20.2 + j1 * 0.8));
      this.flood.sensorHealth = 'ONLINE';
    } else if (floodStage === 'RESOLVED') {
      // Recovering state
      this.flood.waterLevel = Math.max(16, this.flood.waterLevel * 0.72);
      this.flood.rainfall = Math.max(1.2, this.flood.rainfall * 0.5);
      this.flood.soilMoisture = Math.max(38, this.flood.soilMoisture * 0.85);
      this.flood.temperature = 22.8 + j1 * 0.4;
      this.flood.sensorHealth = 'ONLINE';
    } else {
      // Nominal baseline
      this.flood.waterLevel = 14.5 + j1 * 1.2;
      this.flood.rainfall = Math.max(0, 0.8 + j2 * 0.4);
      this.flood.soilMoisture = 32.0 + j3 * 1.5;
      this.flood.temperature = 23.4 + j1 * 0.5;
      this.flood.sensorHealth = blockedNodeIds.has(1) ? 'DEGRADED' : 'ONLINE';
    }
    this.appendHistory(this.flood.history, this.flood.waterLevel);

    // 2. Update Fire Node Telemetry (Node 2)
    const fireActive = activeSimulations.has('fire');
    const fireSim = activeSimulations.get('fire');
    const fireStage = fireSim ? fireSim.stage : 'IDLE';

    if (fireActive && (fireStage === 'BROADCASTING' || fireStage === 'DISPATCHED')) {
      this.fire.smoke = Math.min(280, Math.max(160, 210 + j1 * 25));
      this.fire.airQualityIndex = Math.min(290, Math.max(170, 220 + j2 * 20));
      this.fire.temperature = Math.min(84, Math.max(62, 72 + j3 * 4));
      this.fire.humidity = Math.min(22, Math.max(11, 15 + j1 * 2));
      this.fire.flameDetected = true;
      this.fire.sensorHealth = 'ONLINE';
    } else if (fireStage === 'RESOLVED') {
      this.fire.smoke = Math.max(15, this.fire.smoke * 0.65);
      this.fire.airQualityIndex = Math.max(45, this.fire.airQualityIndex * 0.7);
      this.fire.temperature = Math.max(28, this.fire.temperature * 0.78);
      this.fire.humidity = Math.min(52, this.fire.humidity * 1.3);
      this.fire.flameDetected = false;
      this.fire.sensorHealth = 'ONLINE';
    } else {
      this.fire.smoke = 11.2 + j1 * 1.5;
      this.fire.airQualityIndex = Math.round(34 + j2 * 3);
      this.fire.temperature = 25.8 + j3 * 0.6;
      this.fire.humidity = 58.0 + j1 * 1.8;
      this.fire.flameDetected = false;
      this.fire.sensorHealth = blockedNodeIds.has(2) ? 'DEGRADED' : 'ONLINE';
    }
    this.appendHistory(this.fire.history, this.fire.temperature);

    // 3. Update Industrial Node Telemetry (Node 3)
    const indusActive = activeSimulations.has('industrial');
    const indusSim = activeSimulations.get('industrial');
    const indusStage = indusSim ? indusSim.stage : 'IDLE';

    if (indusActive && (indusStage === 'BROADCASTING' || indusStage === 'DISPATCHED')) {
      this.industrial.vocGas = Math.min(220, Math.max(130, 175 + j1 * 18));
      this.industrial.temperature = Math.min(56, Math.max(40, 48 + j2 * 3));
      this.industrial.pressure = 138.5 + j3 * 6;
      this.industrial.anomalyDeviation = Math.min(96, Math.max(74, 85 + j1 * 5));
      this.industrial.sensorHealth = 'ONLINE';
    } else if (indusStage === 'RESOLVED') {
      this.industrial.vocGas = Math.max(18, this.industrial.vocGas * 0.68);
      this.industrial.temperature = Math.max(26, this.industrial.temperature * 0.82);
      this.industrial.pressure = 101.3 + (this.industrial.pressure - 101.3) * 0.6;
      this.industrial.anomalyDeviation = Math.max(4.5, this.industrial.anomalyDeviation * 0.65);
      this.industrial.sensorHealth = 'ONLINE';
    } else {
      this.industrial.vocGas = 14.0 + j1 * 1.8;
      this.industrial.temperature = 24.2 + j2 * 0.5;
      this.industrial.pressure = 101.3 + j3 * 0.8;
      this.industrial.anomalyDeviation = Math.max(1, 3.5 + j1 * 0.8);
      this.industrial.sensorHealth = blockedNodeIds.has(3) ? 'DEGRADED' : 'ONLINE';
    }
    this.appendHistory(this.industrial.history, this.industrial.anomalyDeviation);
  }

  private appendHistory(history: number[], value: number): void {
    history.push(parseFloat(value.toFixed(1)));
    if (history.length > 14) {
      history.shift();
    }
  }

  /**
   * Deterministic Edge Risk Score & Classification Model.
   * Uses clear weighted normalization of environmental sensors.
   * Documented formula:
   * 0-24: LOW, 25-49: MODERATE, 50-74: HIGH, 75-100: CRITICAL
   */
  public getEdgeRiskAssessment(nodeId: number): EdgeRiskAssessment {
    if (nodeId === 1) {
      // Flood-04 Risk Assessment
      const wNorm = Math.min(1, Math.max(0, (this.flood.waterLevel - 10) / 80));
      const rNorm = Math.min(1, Math.max(0, this.flood.rainfall / 35));
      const sNorm = Math.min(1, Math.max(0, (this.flood.soilMoisture - 25) / 70));
      const tNorm = Math.min(1, Math.max(0, (26 - this.flood.temperature) / 8));

      // Weights: Water Level 45%, Rainfall 25%, Soil Moisture 20%, Temp drop 10%
      const rawScore = wNorm * 45 + rNorm * 25 + sNorm * 20 + tNorm * 10;
      const riskScore = Math.min(100, Math.max(0, Math.round(rawScore)));

      const riskLevel = this.scoreToLevel(riskScore);
      const priority = this.levelToPriority(riskLevel);
      const anomalyDetected = riskScore >= 25;

      return {
        riskScore,
        riskLevel,
        priority,
        classification: anomalyDetected ? 'FLOOD RISK' : 'NOMINAL',
        anomalyDetected,
        recommendedAction: anomalyDetected
          ? 'Inspect flood corridor & deploy drainage barriers'
          : 'Continuous watershed monitoring',
      };
    }

    if (nodeId === 2) {
      // Forest-07 Risk Assessment
      const sNorm = Math.min(1, Math.max(0, (this.fire.smoke - 10) / 200));
      const tNorm = Math.min(1, Math.max(0, (this.fire.temperature - 24) / 50));
      const hNorm = Math.min(1, Math.max(0, (60 - this.fire.humidity) / 45));
      const fNorm = this.fire.flameDetected ? 1 : 0;

      // Weights: Smoke 35%, Temperature 30%, Low Humidity 20%, Flame 15%
      const rawScore = sNorm * 35 + tNorm * 30 + hNorm * 20 + fNorm * 15;
      const riskScore = Math.min(100, Math.max(0, Math.round(rawScore)));

      const riskLevel = this.scoreToLevel(riskScore);
      const priority = this.levelToPriority(riskLevel);
      const anomalyDetected = riskScore >= 25;

      return {
        riskScore,
        riskLevel,
        priority,
        classification: anomalyDetected ? 'FOREST FIRE RISK' : 'NOMINAL',
        anomalyDetected,
        recommendedAction: anomalyDetected
          ? 'Deploy thermal aerial drone & isolate perimeter'
          : 'Continuous canopy thermal monitoring',
      };
    }

    if (nodeId === 3) {
      // Indus-02 Risk Assessment
      const gNorm = Math.min(1, Math.max(0, (this.industrial.vocGas - 10) / 160));
      const aNorm = Math.min(1, Math.max(0, (this.industrial.anomalyDeviation - 3) / 80));
      const pNorm = Math.min(1, Math.max(0, Math.abs(this.industrial.pressure - 101.3) / 35));
      const tNorm = Math.min(1, Math.max(0, (this.industrial.temperature - 24) / 30));

      // Weights: VOC Gas 40%, Anomaly Deviation 30%, Pressure Delta 15%, Temp 15%
      const rawScore = gNorm * 40 + aNorm * 30 + pNorm * 15 + tNorm * 15;
      const riskScore = Math.min(100, Math.max(0, Math.round(rawScore)));

      const riskLevel = this.scoreToLevel(riskScore);
      const priority = this.levelToPriority(riskLevel);
      const anomalyDetected = riskScore >= 25;

      return {
        riskScore,
        riskLevel,
        priority,
        classification: anomalyDetected ? 'INDUSTRIAL RISK' : 'NOMINAL',
        anomalyDetected,
        recommendedAction: anomalyDetected
          ? 'Trigger containment scrubber & inspect pipeline seals'
          : 'Air quality baseline validation',
      };
    }

    // Default for non-hazard nodes
    return {
      riskScore: 0,
      riskLevel: 'LOW',
      priority: 'MONITORING',
      classification: 'NOMINAL',
      anomalyDetected: false,
      recommendedAction: 'Normal operation',
    };
  }

  private scoreToLevel(score: number): RiskLevel {
    if (score >= 75) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 25) return 'MODERATE';
    return 'LOW';
  }

  private levelToPriority(level: RiskLevel): PriorityLevel {
    switch (level) {
      case 'CRITICAL':
        return 'EMERGENCY';
      case 'HIGH':
        return 'URGENT';
      case 'MODERATE':
        return 'ELEVATED';
      case 'LOW':
      default:
        return 'MONITORING';
    }
  }

  /**
   * Retrieves relay node telemetry derived from actual physical network topology.
   */
  public getRelayTelemetry(nodeId: number, blockedNodeIds: Set<number>): RelayTelemetry {
    const isNodeOffline = blockedNodeIds.has(nodeId);

    // Compute online neighbors from MESH_EDGES
    let totalNeighbors = 0;
    let onlineNeighbors = 0;

    for (const edge of MESH_EDGES) {
      let neighborId: number | null = null;
      if (edge.source === nodeId) neighborId = edge.target;
      else if (edge.target === nodeId) neighborId = edge.source;

      if (neighborId !== null) {
        totalNeighbors++;
        if (!blockedNodeIds.has(neighborId)) {
          onlineNeighbors++;
        }
      }
    }

    if (isNodeOffline) {
      return {
        linkQuality: 0,
        rssi: -115,
        connectivity: 'ISOLATED',
        packetState: 'DROPPED_ROUTE',
        neighborCount: 0,
        totalNeighbors,
        nodeHealth: 0,
        sensorHealth: 'FAULT',
      };
    }

    const connectivity =
      onlineNeighbors === totalNeighbors
        ? 'CONNECTED'
        : onlineNeighbors > 0
        ? 'DEGRADED'
        : 'ISOLATED';

    const qualityRatio = totalNeighbors > 0 ? onlineNeighbors / totalNeighbors : 1;
    const linkQuality = Math.round(65 + qualityRatio * 32);
    const rssi = Math.round(-88 + qualityRatio * 22);

    return {
      linkQuality,
      rssi,
      connectivity,
      packetState: onlineNeighbors > 0 ? 'FORWARDING' : 'DROPPED_ROUTE',
      neighborCount: onlineNeighbors,
      totalNeighbors,
      nodeHealth: 99,
      sensorHealth: connectivity === 'ISOLATED' ? 'DEGRADED' : 'ONLINE',
    };
  }

  /**
   * Calculates overall System & Network Health from actual topology state.
   * Documented formula:
   * Network Health % = (Active Operational Edges / Total 8 Edges) * 100%
   * If Command Center is blocked, Network Health is 0% (gateway severed).
   */
  public getCommandCenterIntelligence(
    blockedNodeIds: Set<number>,
    activeAlertsCount: number
  ): CommandCenterIntelligence {
    const totalNodesCount = NETWORK_NODES.length; // 7
    const offlineNodesCount = blockedNodeIds.size;
    const onlineNodesCount = totalNodesCount - offlineNodesCount;

    const totalEdgesCount = MESH_EDGES.length; // 8
    let activeEdgesCount = 0;

    for (const edge of MESH_EDGES) {
      if (!blockedNodeIds.has(edge.source) && !blockedNodeIds.has(edge.target)) {
        activeEdgesCount++;
      }
    }

    const commandOffline = blockedNodeIds.has(0);
    const networkHealthPct = commandOffline
      ? 0
      : Math.round((activeEdgesCount / totalEdgesCount) * 100);

    // Find current highest risk among all 3 hazard nodes
    let highestRiskScore = 0;
    let highestRiskNodeName = 'All Nodes Nominal';
    let highestRiskLevel: RiskLevel = 'LOW';

    const hazardIds: Array<{ id: number; name: string }> = [
      { id: 1, name: 'Flood-04' },
      { id: 2, name: 'Forest-07' },
      { id: 3, name: 'Indus-02' },
    ];

    for (const item of hazardIds) {
      const assessment = this.getEdgeRiskAssessment(item.id);
      if (assessment.riskScore > highestRiskScore) {
        highestRiskScore = assessment.riskScore;
        highestRiskNodeName = item.name;
        highestRiskLevel = assessment.riskLevel;
      }
    }

    const gatewayStatus = commandOffline
      ? 'OFFLINE'
      : activeEdgesCount >= 2
      ? 'ONLINE'
      : 'DEGRADED';

    const meshStatus =
      activeEdgesCount === totalEdgesCount
        ? 'SELF-HEALING READY'
        : activeEdgesCount > 0
        ? 'TOPOLOGY DEGRADED'
        : 'ISOLATED';

    return {
      networkHealthPct,
      onlineNodesCount,
      totalNodesCount,
      activeEdgesCount,
      totalEdgesCount,
      activeAlertsCount,
      highestRiskNodeName,
      highestRiskScore,
      highestRiskLevel,
      gatewayStatus,
      meshStatus,
    };
  }

  /**
   * Evaluates the routing intelligence for a hazard node.
   * Compares the actual current BFS route with the canonical primary route to
   * detect and explain self-healing reroutes.
   */
  public getRouteIntelligence(
    hazardType: HazardType,
    blockedNodeIds: Set<number>
  ): RouteIntelligence {
    const primaryPath = this.PRIMARY_ROUTES[hazardType];
    const hazardNodeId = primaryPath[0];

    const currentPath = findShortestPath(hazardNodeId, 0, blockedNodeIds);

    if (!currentPath || currentPath.length < 2) {
      return {
        primaryPath,
        currentPath: null,
        pathNodeNames: [],
        isRerouted: false,
        statusText: 'ROUTE SEVERED',
      };
    }

    // Check if current route diverges from primary route
    const isRerouted =
      currentPath.length !== primaryPath.length ||
      currentPath.some((id, idx) => id !== primaryPath[idx]);

    const pathNodeNames = currentPath.map((id) => {
      const node = NETWORK_NODES.find((n) => n.id === id);
      return node ? node.name : `Node-${id}`;
    });

    return {
      primaryPath,
      currentPath,
      pathNodeNames,
      isRerouted,
      statusText: isRerouted ? 'REROUTED — NODE FAILURE' : 'PRIMARY ROUTE',
    };
  }
}
