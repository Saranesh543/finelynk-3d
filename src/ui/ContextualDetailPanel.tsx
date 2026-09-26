import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  AlertOctagon,
  RotateCcw,
  Waves,
  Flame,
  Biohazard,
  Activity,
  Cpu,
  Radio,
  Share2,
} from 'lucide-react';
import {
  InteractiveTarget,
  InteractiveNodeTarget,
  InteractiveHazardTarget,
  InteractiveLandmarkTarget,
} from '../interaction/types';
import { HazardType } from '../simulation/types';
import { TelemetryService } from '../simulation/telemetry';
import { Sparkline } from './Sparkline';

interface ContextualDetailPanelProps {
  target: InteractiveTarget | null;
  onClose: () => void;
  onToggleNodeFailure: (nodeId: number, failed: boolean) => void;
  isNodeFailed: (nodeId: number) => boolean;
  onTriggerHazard: (type: HazardType) => void;
  isHazardActive: (type: HazardType) => boolean;
  telemetry: TelemetryService | null;
  failedNodeIds: Set<number>;
  activeAlertsCount: number;
}

export const ContextualDetailPanel: React.FC<ContextualDetailPanelProps> = ({
  target,
  onClose,
  onToggleNodeFailure,
  isNodeFailed,
  onTriggerHazard,
  isHazardActive,
  telemetry,
  failedNodeIds,
  activeAlertsCount,
}) => {
  // Periodically refresh component to keep simulated sensor readings and sparkline fluid
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const [minimizedSummary, setMinimizedSummary] = useState(false);

  // If no target is selected, render the compact System Intelligence summary per Requirement 22
  if (!target) {
    if (minimizedSummary) return null;

    const sysIntel = telemetry?.getCommandCenterIntelligence(failedNodeIds, activeAlertsCount);

    return (
      <AnimatePresence>
        <motion.div
          key="system-intelligence-summary"
          className="interactive contextual-detail-panel tactical-panel"
          initial={{ opacity: 0, y: 15, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.96 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          role="region"
          aria-label="System Intelligence Summary"
        >
          <div className="context-header">
            <div className="context-title-group">
              <span className="context-type-badge">COMMAND LAYER // SIMULATED</span>
              <h3 className="context-name">SYSTEM INTELLIGENCE</h3>
            </div>
            <button
              type="button"
              className="context-close-btn"
              onClick={() => setMinimizedSummary(true)}
              aria-label="Minimize Summary"
              title="Minimize summary panel"
            >
              <X size={14} />
            </button>
          </div>

          <div className="context-body">
            <div className="spec-row">
              <span className="spec-label">Mesh Network Health</span>
              <span
                className="spec-val"
                style={{
                  color:
                    (sysIntel?.networkHealthPct ?? 100) > 75
                      ? 'var(--cyan)'
                      : (sysIntel?.networkHealthPct ?? 100) > 40
                      ? 'var(--fire)'
                      : 'var(--critical)',
                }}
              >
                {sysIntel?.networkHealthPct ?? 100}%
              </span>
            </div>

            <div className="spec-row">
              <span className="spec-label">Online Nodes</span>
              <span className="spec-val">
                {sysIntel?.onlineNodesCount ?? 24} / {sysIntel?.totalNodesCount ?? 24}
              </span>
            </div>

            <div className="spec-row">
              <span className="spec-label">Active Edges</span>
              <span className="spec-val">
                {sysIntel?.activeEdgesCount ?? 39} / {sysIntel?.totalEdgesCount ?? 39} Operational
              </span>
            </div>

            <div className="spec-row">
              <span className="spec-label">Active Alerts</span>
              <span
                className="spec-val"
                style={{
                  color: (sysIntel?.activeAlertsCount ?? 0) > 0 ? 'var(--critical)' : 'var(--text)',
                }}
              >
                {sysIntel?.activeAlertsCount ?? 0}
              </span>
            </div>

            <div className="spec-row">
              <span className="spec-label">Current Highest Risk</span>
              <span
                className="spec-val"
                style={{
                  color:
                    sysIntel?.highestRiskLevel === 'CRITICAL'
                      ? 'var(--critical)'
                      : sysIntel?.highestRiskLevel === 'HIGH'
                      ? 'var(--fire)'
                      : 'var(--cyan)',
                }}
              >
                {sysIntel?.highestRiskNodeName} ({sysIntel?.highestRiskLevel})
              </span>
            </div>

            <div className="spec-row">
              <span className="spec-label">Mesh Protocol</span>
              <span className="spec-val">OFFLINE MESH (LoRa / Simulated)</span>
            </div>

            <div className="spec-row">
              <span className="spec-label">Gateway Status</span>
              <span className="status-pill online">{sysIntel?.gatewayStatus ?? 'ONLINE'}</span>
            </div>

            <div className="system-summary-hint">
              <span>● Click any 3D node or territory to inspect live edge sensors & routing intelligence.</span>
            </div>
          </div>

          <style>{panelStyles}</style>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        key={target.name}
        className="interactive contextual-detail-panel tactical-panel"
        initial={{ opacity: 0, y: 15, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.96 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        role="region"
        aria-label="Contextual Inspector"
      >
        {/* Panel Header */}
        <div className="context-header">
          <div className="context-title-group">
            <span className="context-type-badge">
              {target.type === 'node'
                ? 'NODE INSPECTOR'
                : target.type === 'hazard'
                ? 'TERRITORY SECTOR'
                : 'LANDMARK'}
            </span>
            <h3 className="context-name">{target.name}</h3>
          </div>
          <button
            type="button"
            className="context-close-btn"
            onClick={onClose}
            aria-label="Close Inspector"
            title="Deselect and close inspector"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content based on Target Type */}
        <div className="context-body">
          {target.type === 'node' && (
            <NodeInspectorContent
              target={target}
              isFailed={isNodeFailed(target.id)}
              onToggleFailure={(failed) => onToggleNodeFailure(target.id, failed)}
              telemetry={telemetry}
              failedNodeIds={failedNodeIds}
              activeAlertsCount={activeAlertsCount}
            />
          )}

          {target.type === 'hazard' && (
            <HazardInspectorContent
              target={target}
              isActive={isHazardActive(target.id)}
              onTrigger={() => onTriggerHazard(target.id)}
              telemetry={telemetry}
            />
          )}

          {target.type === 'landmark' && <LandmarkInspectorContent target={target} />}
        </div>

        <style>{panelStyles}</style>
      </motion.div>
    </AnimatePresence>
  );
};

// ----------------------------------------------------------------------------
// Subcomponents for each Interactive Type
// ----------------------------------------------------------------------------

interface NodeInspectorContentProps {
  target: InteractiveNodeTarget;
  isFailed: boolean;
  onToggleFailure: (failed: boolean) => void;
  telemetry: TelemetryService | null;
  failedNodeIds: Set<number>;
  activeAlertsCount: number;
}

const NodeInspectorContent: React.FC<NodeInspectorContentProps> = ({
  target,
  isFailed,
  onToggleFailure,
  telemetry,
  failedNodeIds,
  activeAlertsCount,
}) => {
  const isCommand = target.isCommandCenter;
  const isHazardNode = target.id >= 1 && target.id <= 3;
  const isRelay = target.id >= 4 && target.id <= 6;
  const isFieldMesh = target.id >= 7;

  // Telemetry & Edge Intelligence
  const assessment = telemetry?.getEdgeRiskAssessment(target.id);
  const relayTelemetry = isRelay || isFieldMesh ? telemetry?.getRelayTelemetry(target.id, failedNodeIds) : null;
  const commandIntel = isCommand
    ? telemetry?.getCommandCenterIntelligence(failedNodeIds, activeAlertsCount)
    : null;

  // Route Intelligence for hazard nodes
  const hazardType =
    target.id === 1 ? 'flood' : target.id === 2 ? 'fire' : target.id === 3 ? 'industrial' : null;
  const routeIntel = hazardType
    ? telemetry?.getRouteIntelligence(hazardType, failedNodeIds)
    : null;

  // Sensor status distinction per Requirement 16 & Section 8
  const sensorStatus = isFailed
    ? 'LOCAL DATA AVAILABLE'
    : isHazardNode
    ? target.id === 1
      ? telemetry?.flood.sensorHealth ?? 'ONLINE'
      : target.id === 2
      ? telemetry?.fire.sensorHealth ?? 'ONLINE'
      : telemetry?.industrial.sensorHealth ?? 'ONLINE'
    : isRelay
    ? relayTelemetry?.sensorHealth ?? 'ONLINE'
    : 'ONLINE';

  // 5-Stage Disaster Response Pipeline calculation (Section 8 & 15)
  const stageEnvText = isFailed
    ? 'SEVERED'
    : isHazardNode
    ? assessment?.anomalyDetected
      ? 'ALERT'
      : 'NOMINAL'
    : 'MONITORED';
  const stageEnvClass = isFailed
    ? 'status-critical'
    : assessment?.anomalyDetected
    ? 'status-elevated'
    : 'status-nominal';

  const stageSensorText = isFailed
    ? 'LOCAL'
    : isHazardNode
    ? assessment?.anomalyDetected
      ? 'ANOMALY'
      : 'STREAMING'
    : 'DIAGNOSTIC';
  const stageSensorClass = isFailed
    ? 'status-critical'
    : assessment?.anomalyDetected
    ? 'status-elevated'
    : 'status-nominal';

  const stageNodeText = isFailed ? 'OFFLINE' : 'ONLINE';
  const stageNodeClass = isFailed ? 'status-critical' : 'status-nominal';

  const stageMeshText = isFailed
    ? 'ISOLATED'
    : routeIntel?.isRerouted
    ? 'REROUTED'
    : routeIntel?.statusText === 'ROUTE SEVERED'
    ? 'SEVERED'
    : 'FORWARDING';
  const stageMeshClass =
    isFailed || routeIntel?.statusText === 'ROUTE SEVERED'
      ? 'status-critical'
      : routeIntel?.isRerouted
      ? 'status-rerouted'
      : 'status-nominal';

  const stageCommandText =
    isFailed || routeIntel?.statusText === 'ROUTE SEVERED' ? 'LOST' : 'LINKED';
  const stageCommandClass =
    isFailed || routeIntel?.statusText === 'ROUTE SEVERED'
      ? 'status-critical'
      : 'status-nominal';

  return (
    <>
      {/* SECTION 1: PHYSICAL HARDWARE SPECIFICATIONS */}
      <div className="spec-row">
        <span className="spec-label">Category</span>
        <span className="spec-val">{target.category}</span>
      </div>

      <div className="spec-row">
        <span className="spec-label">Operational State</span>
        <span className={`status-pill ${isFailed ? 'offline' : 'online'}`}>
          {isFailed ? 'OFFLINE' : 'ONLINE'}
        </span>
      </div>

      <div className="spec-row">
        <span className="spec-label">Sensor Status</span>
        <span
          className={`status-pill ${
            isFailed ? 'offline' : sensorStatus === 'ONLINE' ? 'online' : 'critical'
          }`}
        >
          ● {sensorStatus}
        </span>
      </div>

      <div className="spec-row">
        <span className="spec-label">Communication</span>
        <span className={`status-pill ${isFailed ? 'critical' : 'online'}`}>
          {isFailed ? 'OFFLINE / SEVERED' : 'ONLINE / MESH P2P'}
        </span>
      </div>

      {/* 5-STAGE OPERATIONAL PIPELINE DISPLAY */}
      <div className="operational-chain-card">
        <span className="chain-title">OPERATIONAL PIPELINE (5-STAGE FLOW)</span>
        <div className="chain-stages">
          <div className={`chain-stage-pill ${stageEnvClass}`}>
            <span className="stage-num">01</span>
            <span className="stage-name">ENV</span>
            <span className="stage-state">{stageEnvText}</span>
          </div>
          <span className="chain-divider">›</span>
          <div className={`chain-stage-pill ${stageSensorClass}`}>
            <span className="stage-num">02</span>
            <span className="stage-name">SENSOR</span>
            <span className="stage-state">{stageSensorText}</span>
          </div>
          <span className="chain-divider">›</span>
          <div className={`chain-stage-pill ${stageNodeClass}`}>
            <span className="stage-num">03</span>
            <span className="stage-name">NODE</span>
            <span className="stage-state">{stageNodeText}</span>
          </div>
          <span className="chain-divider">›</span>
          <div className={`chain-stage-pill ${stageMeshClass}`}>
            <span className="stage-num">04</span>
            <span className="stage-name">MESH</span>
            <span className="stage-state">{stageMeshText}</span>
          </div>
          <span className="chain-divider">›</span>
          <div className={`chain-stage-pill ${stageCommandClass}`}>
            <span className="stage-num">05</span>
            <span className="stage-name">CMD</span>
            <span className="stage-state">{stageCommandText}</span>
          </div>
        </div>
      </div>

      <div className="spec-row" style={{ marginTop: '4px' }}>
        <span className="spec-label">Ground Altitude</span>
        <span className="spec-val">{target.elevation.toFixed(2)} m</span>
      </div>

      <div className="spec-row">
        <span className="spec-label">Connected Links</span>
        <span className="spec-val">{target.linksCount} Active Edges</span>
      </div>

      <div className="connected-links-section">
        <span className="spec-label">Topology Adjacency:</span>
        <div className="links-chip-list">
          {target.connectedNodeNames.map((name) => (
            <span key={name} className="link-chip">
              {name}
            </span>
          ))}
        </div>
      </div>

      <div className="spec-row">
        <span className="spec-label">Routing Status</span>
        <span
          className="spec-val"
          style={{ color: isFailed ? 'var(--critical)' : 'var(--resolved)' }}
        >
          {isFailed ? 'EXCLUDED FROM BFS' : 'ACTIVE IN BFS'}
        </span>
      </div>

      {/* SECTION 2: HAZARD NODE ENVIRONMENTAL TELEMETRY (Nodes 1, 2, 3) */}
      {isHazardNode && (
        <div className="intelligence-group">
          <div className="group-title-row">
            <span className="group-title">
              <Activity size={12} color="var(--cyan)" /> ENVIRONMENTAL TELEMETRY
            </span>
            <span className="telemetry-sim-badge">SIMULATED</span>
          </div>

          {target.id === 1 && telemetry && (
            <>
              <div className="telemetry-grid">
                <div className="telemetry-item">
                  <span className="t-label">Water Level</span>
                  <span className="t-val">{telemetry.flood.waterLevel.toFixed(1)} %</span>
                </div>
                <div className="telemetry-item">
                  <span className="t-label">Rainfall</span>
                  <span className="t-val">{telemetry.flood.rainfall.toFixed(1)} mm/h</span>
                </div>
                <div className="telemetry-item">
                  <span className="t-label">Soil Moisture</span>
                  <span className="t-val">{telemetry.flood.soilMoisture.toFixed(1)} %</span>
                </div>
                <div className="telemetry-item">
                  <span className="t-label">Temperature</span>
                  <span className="t-val">{telemetry.flood.temperature.toFixed(1)} °C</span>
                </div>
              </div>
              <div className="sparkline-wrapper">
                <span className="sparkline-title">Water Level Trend (% vs time)</span>
                <Sparkline data={telemetry.flood.history} color="var(--flood)" unit="%" />
              </div>
            </>
          )}

          {target.id === 2 && telemetry && (
            <>
              <div className="telemetry-grid">
                <div className="telemetry-item">
                  <span className="t-label">Smoke Level</span>
                  <span className="t-val">{telemetry.fire.smoke.toFixed(0)} ppm</span>
                </div>
                <div className="telemetry-item">
                  <span className="t-label">Air Quality</span>
                  <span className="t-val">{telemetry.fire.airQualityIndex} AQI</span>
                </div>
                <div className="telemetry-item">
                  <span className="t-label">Temperature</span>
                  <span className="t-val">{telemetry.fire.temperature.toFixed(1)} °C</span>
                </div>
                <div className="telemetry-item">
                  <span className="t-label">Humidity</span>
                  <span className="t-val">{telemetry.fire.humidity.toFixed(1)} %</span>
                </div>
              </div>
              <div className="spec-row" style={{ marginTop: '4px' }}>
                <span className="spec-label">Flame Indicator</span>
                <span
                  className="spec-val"
                  style={{
                    color: telemetry.fire.flameDetected ? 'var(--critical)' : 'var(--cyan)',
                  }}
                >
                  {telemetry.fire.flameDetected ? 'FLAME DETECTED' : 'CLEAR'}
                </span>
              </div>
              <div className="sparkline-wrapper">
                <span className="sparkline-title">Canopy Temperature Trend (°C)</span>
                <Sparkline data={telemetry.fire.history} color="var(--fire)" unit="°C" />
              </div>
            </>
          )}

          {target.id === 3 && telemetry && (
            <>
              <div className="telemetry-grid">
                <div className="telemetry-item">
                  <span className="t-label">VOC Gas</span>
                  <span className="t-val">{telemetry.industrial.vocGas.toFixed(1)} ppm</span>
                </div>
                <div className="telemetry-item">
                  <span className="t-label">Temperature</span>
                  <span className="t-val">{telemetry.industrial.temperature.toFixed(1)} °C</span>
                </div>
                <div className="telemetry-item">
                  <span className="t-label">Pressure</span>
                  <span className="t-val">{telemetry.industrial.pressure.toFixed(1)} kPa</span>
                </div>
                <div className="telemetry-item">
                  <span className="t-label">Anomaly Level</span>
                  <span className="t-val">
                    {telemetry.industrial.anomalyDeviation.toFixed(1)} %
                  </span>
                </div>
              </div>
              <div className="sparkline-wrapper">
                <span className="sparkline-title">Gas Anomaly Deviation Trend (%)</span>
                <Sparkline
                  data={telemetry.industrial.history}
                  color="var(--industrial)"
                  unit="%"
                />
              </div>
            </>
          )}

          {/* EDGE RISK ASSESSMENT */}
          {assessment && (
            <div className="edge-assessment-box">
              <div className="group-title-row">
                <span className="group-title">
                  <Cpu size={12} color="var(--command)" /> EDGE RISK SCORE
                </span>
                <span className={`risk-badge badge-${assessment.riskLevel.toLowerCase()}`}>
                  {assessment.riskLevel}
                </span>
              </div>

              <div className="risk-score-bar-container">
                <div className="risk-score-labels">
                  <span>Score: {assessment.riskScore} / 100</span>
                  <span>Priority: {assessment.priority}</span>
                </div>
                <div className="risk-meter-bg">
                  <div
                    className={`risk-meter-fill level-${assessment.riskLevel.toLowerCase()}`}
                    style={{ width: `${assessment.riskScore}%` }}
                  />
                </div>
              </div>

              <div className="spec-row" style={{ marginTop: '4px' }}>
                <span className="spec-label">Classification</span>
                <span className="spec-val">{assessment.classification}</span>
              </div>

              <div className="spec-row">
                <span className="spec-label">Condition</span>
                <span
                  className="spec-val"
                  style={{
                    color: assessment.anomalyDetected ? 'var(--critical)' : 'var(--resolved)',
                  }}
                >
                  {assessment.anomalyDetected ? 'ANOMALY DETECTED' : 'NOMINAL BASELINE'}
                </span>
              </div>

              <div className="action-recommendation">
                <span className="rec-label">Recommended Action:</span>
                <p className="rec-text">{assessment.recommendedAction}</p>
              </div>
            </div>
          )}

          {/* MESH ROUTING INTELLIGENCE */}
          {routeIntel && (
            <div className="route-intel-box">
              <div className="group-title-row">
                <span className="group-title">
                  <Share2 size={12} color="var(--cyan)" /> ROUTING INTELLIGENCE
                </span>
                <span
                  className={`route-status-pill ${
                    routeIntel.statusText === 'PRIMARY ROUTE'
                      ? 'primary'
                      : routeIntel.statusText === 'ROUTE SEVERED'
                      ? 'severed'
                      : 'rerouted'
                  }`}
                >
                  {routeIntel.statusText}
                </span>
              </div>

              <div className="route-flow">
                <span className="route-flow-text">
                  {routeIntel.currentPath
                    ? routeIntel.pathNodeNames.join(' → ')
                    : 'NO ROUTE AVAILABLE — ISOLATED'}
                </span>
              </div>
              <div className="comm-mode-row">
                <span>MODE: OFFLINE MESH</span>
                <span>LINK: LoRa / simulated</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: RELAY NODE NETWORK HEALTH (Nodes 4, 5, 6) */}
      {isRelay && relayTelemetry && (
        <div className="intelligence-group">
          <div className="group-title-row">
            <span className="group-title">
              <Radio size={12} color="var(--cyan)" /> RELAY MESH TELEMETRY
            </span>
            <span className="telemetry-sim-badge">MULTI-HOP RELAY</span>
          </div>

          <div className="spec-row">
            <span className="spec-label">Role</span>
            <span className="spec-val">MULTI-HOP RELAY ROUTER</span>
          </div>

          <div className="spec-row">
            <span className="spec-label">Link Quality / RSSI</span>
            <span className="spec-val">
              {relayTelemetry.linkQuality}% ({relayTelemetry.rssi} dBm)
            </span>
          </div>

          <div className="spec-row">
            <span className="spec-label">Connectivity</span>
            <span
              className={`status-pill ${
                relayTelemetry.connectivity === 'CONNECTED'
                  ? 'online'
                  : relayTelemetry.connectivity === 'DEGRADED'
                  ? 'active'
                  : 'offline'
              }`}
            >
              {relayTelemetry.connectivity}
            </span>
          </div>

          <div className="spec-row">
            <span className="spec-label">Topology Status</span>
            <span
              className="spec-val"
              style={{
                color: failedNodeIds.size === 0 ? 'var(--cyan)' : 'var(--fire)',
              }}
            >
              {failedNodeIds.size === 0 ? 'BALANCED TOPOLOGY' : 'DEGRADED TOPOLOGY'}
            </span>
          </div>

          <div className="spec-row">
            <span className="spec-label">Connected Nodes</span>
            <span className="spec-val">
              {relayTelemetry.neighborCount} / {relayTelemetry.totalNeighbors} Online
            </span>
          </div>

          <div className="spec-row">
            <span className="spec-label">Failed Nodes (Mesh)</span>
            <span
              className="spec-val"
              style={{
                color: failedNodeIds.size > 0 ? 'var(--critical)' : 'var(--resolved)',
              }}
            >
              {failedNodeIds.size} Node{failedNodeIds.size === 1 ? '' : 's'} Offline
            </span>
          </div>

          <div className="spec-row">
            <span className="spec-label">Packet State</span>
            <span className="spec-val">{relayTelemetry.packetState}</span>
          </div>

          <div className="spec-row">
            <span className="spec-label">Node Core Health</span>
            <span className="spec-val">{relayTelemetry.nodeHealth}%</span>
          </div>

          <div className="comm-mode-row" style={{ marginTop: '6px' }}>
            <span>MODE: OFFLINE MESH</span>
            <span>LINK: LoRa P2P (simulated)</span>
          </div>
        </div>
      )}

      {/* SECTION 3B: FIELD MESH NODE LIGHTWEIGHT TELEMETRY (Nodes 7 to 23) */}
      {isFieldMesh && (
        <div className="intelligence-group">
          <div className="group-title-row">
            <span className="group-title">
              <Radio size={12} color="var(--cyan)" /> FIELD MESH TELEMETRY
            </span>
            <span className="telemetry-sim-badge">FIELD RELAY</span>
          </div>

          <div className="spec-row">
            <span className="spec-label">Role</span>
            <span className="spec-val">FIELD RELAY (SOLAR / OFFLINE)</span>
          </div>

          <div className="spec-row">
            <span className="spec-label">Mesh Status</span>
            <span
              className={`status-pill ${
                isFailed ? 'offline' : 'online'
              }`}
            >
              {isFailed ? 'DISCONNECTED' : 'CONNECTED'}
            </span>
          </div>

          <div className="spec-row">
            <span className="spec-label">Connected Links</span>
            <span className="spec-val">
              {target.linksCount} Adjacent Mesh Links
            </span>
          </div>

          <div className="spec-row">
            <span className="spec-label">Routing State</span>
            <span
              className="spec-val"
              style={{
                color: isFailed ? 'var(--critical)' : 'var(--resolved)',
              }}
            >
              {isFailed ? 'UNAVAILABLE (ISOLATED)' : 'AVAILABLE (BFS ACTIVE)'}
            </span>
          </div>

          <div className="comm-mode-row" style={{ marginTop: '6px' }}>
            <span>PROTOCOL: LoRa P2P</span>
            <span>POWER: SOLAR / BATTERY</span>
          </div>
        </div>
      )}

      {/* SECTION 4: COMMAND CENTER SYSTEM INTELLIGENCE (Node 0) */}
      {isCommand && commandIntel && (
        <div className="intelligence-group">
          <div className="group-title-row">
            <span className="group-title">
              <Cpu size={12} color="var(--command)" /> SYSTEM INTELLIGENCE
            </span>
            <span className="telemetry-sim-badge">GATEWAY</span>
          </div>

          <div className="spec-row">
            <span className="spec-label">Role</span>
            <span className="spec-val">COMMAND CENTER & LORA GATEWAY</span>
          </div>

          <div className="spec-row">
            <span className="spec-label">Mesh Network Health</span>
            <span
              className="spec-val"
              style={{
                color: commandIntel.networkHealthPct > 70 ? 'var(--cyan)' : 'var(--critical)',
              }}
            >
              {commandIntel.networkHealthPct}% (Active Edges / {commandIntel.totalEdgesCount} Links)
            </span>
          </div>

          <div className="spec-row">
            <span className="spec-label">Online / Offline Count</span>
            <span className="spec-val">
              {commandIntel.onlineNodesCount} Online / {failedNodeIds.size} Offline
            </span>
          </div>

          <div className="spec-row">
            <span className="spec-label">Active Edges</span>
            <span className="spec-val">
              {commandIntel.activeEdgesCount} / {commandIntel.totalEdgesCount} Links Functional
            </span>
          </div>

          <div className="spec-row">
            <span className="spec-label">Highest Edge Risk</span>
            <span
              className="spec-val"
              style={{
                color:
                  commandIntel.highestRiskLevel === 'CRITICAL'
                    ? 'var(--critical)'
                    : commandIntel.highestRiskLevel === 'HIGH'
                    ? 'var(--fire)'
                    : 'var(--cyan)',
              }}
            >
              {commandIntel.highestRiskNodeName} ({commandIntel.highestRiskScore}/100 - {commandIntel.highestRiskLevel})
            </span>
          </div>

          <div className="spec-row">
            <span className="spec-label">Gateway Status</span>
            <span
              className={`status-pill ${
                commandIntel.gatewayStatus === 'ONLINE' ? 'online' : 'offline'
              }`}
            >
              {commandIntel.gatewayStatus}
            </span>
          </div>

          <div className="spec-row">
            <span className="spec-label">Self-Healing Mesh</span>
            <span className="spec-val">{commandIntel.meshStatus}</span>
          </div>

          <div className="comm-mode-row" style={{ marginTop: '6px' }}>
            <span>TOPOLOGY: 7 NODES / 8 EDGES</span>
            <span>BACKBONE: LoRa P2P</span>
          </div>
        </div>
      )}

      {/* NODE FAILURE SIMULATION ACTION BUTTON */}
      <div className="action-btn-container">
        {isFailed ? (
          <button
            type="button"
            className="context-action-btn btn-restore"
            onClick={() => onToggleFailure(false)}
            aria-label={`Restore node ${target.name}`}
          >
            <RotateCcw size={15} />
            <span>RESTORE NODE</span>
          </button>
        ) : (
          <button
            type="button"
            className="context-action-btn btn-fail"
            onClick={() => onToggleFailure(true)}
            aria-label={`Simulate failure on node ${target.name}`}
          >
            <AlertOctagon size={15} />
            <span>SIMULATE FAILURE</span>
          </button>
        )}
      </div>
    </>
  );
};

interface HazardInspectorContentProps {
  target: InteractiveHazardTarget;
  isActive: boolean;
  onTrigger: () => void;
  telemetry: TelemetryService | null;
}

const HazardInspectorContent: React.FC<HazardInspectorContentProps> = ({
  target,
  isActive,
  onTrigger,
  telemetry,
}) => {
  const getHazardIcon = () => {
    if (target.id === 'flood') return <Waves size={15} color="var(--flood)" />;
    if (target.id === 'fire') return <Flame size={15} color="var(--fire)" />;
    return <Biohazard size={15} color="var(--industrial)" />;
  };

  const assessment = telemetry?.getEdgeRiskAssessment(target.targetNodeId);

  return (
    <>
      <div className="spec-row">
        <span className="spec-label">Sector Status</span>
        <span className={`status-pill ${isActive ? 'critical' : 'online'}`}>
          {isActive ? 'ACTIVE / BROADCASTING' : 'DORMANT'}
        </span>
      </div>

      <div className="spec-row">
        <span className="spec-label">Target Field Node</span>
        <span className="spec-val">{target.targetNodeName}</span>
      </div>

      {assessment && (
        <div className="spec-row">
          <span className="spec-label">Edge Risk Level</span>
          <span
            className="spec-val"
            style={{
              color:
                assessment.riskLevel === 'CRITICAL'
                  ? 'var(--critical)'
                  : assessment.riskLevel === 'HIGH'
                  ? 'var(--fire)'
                  : 'var(--cyan)',
            }}
          >
            {assessment.riskLevel} ({assessment.riskScore}/100)
          </span>
        </div>
      )}

      <div
        className="hazard-desc"
        style={{ fontSize: '0.73rem', color: 'var(--text-dim)', lineHeight: 1.4 }}
      >
        {target.description}
      </div>

      <div className="action-btn-container">
        <button
          type="button"
          className="context-action-btn btn-trigger"
          onClick={onTrigger}
          disabled={isActive}
          aria-label={`Trigger hazard in ${target.name}`}
        >
          {getHazardIcon()}
          <span>{isActive ? 'HAZARD IN PROGRESS' : 'TRIGGER HAZARD'}</span>
        </button>
      </div>
    </>
  );
};

interface LandmarkInspectorContentProps {
  target: InteractiveLandmarkTarget;
}

const LandmarkInspectorContent: React.FC<LandmarkInspectorContentProps> = ({ target }) => {
  return (
    <>
      <div className="spec-row">
        <span className="spec-label">Facility Classification</span>
        <span className="spec-val">{target.category}</span>
      </div>

      <div className="spec-row">
        <span className="spec-label">Coordinates (X, Z)</span>
        <span className="spec-val">
          [{target.coordinates[0].toFixed(1)}, {target.coordinates[1].toFixed(1)}]
        </span>
      </div>

      <div className="spec-row">
        <span className="spec-label">Operational Status</span>
        <span className="status-pill online">ONLINE</span>
      </div>

      <div
        className="landmark-desc"
        style={{ fontSize: '0.73rem', color: 'var(--text-dim)', lineHeight: 1.4 }}
      >
        {target.description}
      </div>
    </>
  );
};

const panelStyles = `
  .contextual-detail-panel {
    position: absolute;
    left: 260px;
    top: 60px;
    width: 295px;
    max-height: 82vh;
    overflow-y: auto;
    background: rgba(12, 21, 38, 0.94);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(45, 212, 238, 0.12);
    backdrop-filter: blur(12px);
    z-index: 25;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .context-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
    padding-bottom: 8px;
  }

  .context-title-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .context-type-badge {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    letter-spacing: 0.08em;
    color: var(--cyan);
    text-transform: uppercase;
  }

  .context-name {
    font-family: var(--font-heading);
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text);
    margin: 0;
    letter-spacing: 0.02em;
  }

  .context-close-btn {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-dim);
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .context-close-btn:hover {
    color: var(--text);
    border-color: var(--cyan);
    background: rgba(45, 212, 238, 0.1);
  }

  .context-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .spec-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.72rem;
    padding: 3px 0;
    border-bottom: 1px dashed rgba(28, 44, 71, 0.6);
  }

  .spec-label {
    color: var(--text-dim);
    text-transform: uppercase;
    font-size: 0.63rem;
    letter-spacing: 0.04em;
  }

  .spec-val {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--text);
    font-size: 0.7rem;
  }

  .status-pill {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .status-pill.online {
    background: rgba(45, 212, 238, 0.15);
    color: var(--cyan);
    border: 1px solid rgba(45, 212, 238, 0.35);
  }

  .status-pill.offline {
    background: rgba(51, 65, 85, 0.4);
    color: #94a3b8;
    border: 1px solid rgba(148, 163, 184, 0.3);
  }

  .status-pill.critical {
    background: rgba(239, 68, 68, 0.2);
    color: var(--critical);
    border: 1px solid var(--critical);
  }

  .status-pill.active {
    background: rgba(249, 115, 22, 0.2);
    color: var(--fire);
    border: 1px solid var(--fire);
  }

  .links-chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 3px;
  }

  .link-chip {
    background: rgba(15, 28, 51, 0.8);
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 2px 5px;
    font-size: 0.63rem;
    color: var(--text);
    font-family: var(--font-mono);
  }

  /* 5-Stage Operational Chain Styles */
  .operational-chain-card {
    background: rgba(12, 21, 38, 0.85);
    border: 1px solid rgba(45, 212, 238, 0.2);
    border-radius: 6px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 4px;
  }

  .chain-title {
    font-size: 0.58rem;
    font-weight: 700;
    color: var(--text-dim);
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .chain-stages {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2px;
  }

  .chain-stage-pill {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 3px 2px;
    border-radius: 4px;
    background: rgba(15, 28, 51, 0.8);
    border: 1px solid var(--border);
    flex: 1;
    min-width: 0;
  }

  .chain-stage-pill.status-nominal {
    border-color: rgba(45, 212, 238, 0.3);
  }
  .chain-stage-pill.status-nominal .stage-name {
    color: var(--cyan);
  }

  .chain-stage-pill.status-elevated {
    border-color: rgba(249, 115, 22, 0.4);
    background: rgba(249, 115, 22, 0.1);
  }
  .chain-stage-pill.status-elevated .stage-name {
    color: var(--fire);
  }

  .chain-stage-pill.status-critical {
    border-color: rgba(239, 68, 68, 0.5);
    background: rgba(239, 68, 68, 0.15);
  }
  .chain-stage-pill.status-critical .stage-name {
    color: var(--critical);
  }

  .chain-stage-pill.status-rerouted {
    border-color: rgba(251, 191, 36, 0.4);
    background: rgba(251, 191, 36, 0.1);
  }
  .chain-stage-pill.status-rerouted .stage-name {
    color: var(--command);
  }

  .stage-num {
    font-size: 0.5rem;
    font-family: var(--font-mono);
    color: var(--text-dim);
  }

  .stage-name {
    font-size: 0.56rem;
    font-weight: 700;
    margin-top: 1px;
  }

  .stage-state {
    font-size: 0.48rem;
    font-family: var(--font-mono);
    color: var(--text-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .chain-divider {
    color: var(--text-dim);
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0 1px;
    opacity: 0.6;
  }

  .action-btn-container {
    margin-top: 6px;
  }

  .context-action-btn {
    width: 100%;
    min-height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 6px;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-fail {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid var(--critical);
    color: var(--critical);
  }

  .btn-fail:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.3);
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.35);
  }

  .btn-restore {
    background: rgba(45, 212, 238, 0.15);
    border: 1px solid var(--cyan);
    color: var(--cyan);
  }

  .btn-restore:hover:not(:disabled) {
    background: rgba(45, 212, 238, 0.3);
    box-shadow: 0 0 10px rgba(45, 212, 238, 0.35);
  }

  .btn-trigger {
    background: rgba(45, 212, 238, 0.15);
    border: 1px solid var(--cyan);
    color: var(--cyan);
  }

  .btn-trigger:hover:not(:disabled) {
    background: rgba(45, 212, 238, 0.28);
  }

  .btn-trigger:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Intelligence Section Styles */
  .intelligence-group {
    background: rgba(15, 28, 51, 0.65);
    border: 1px solid rgba(45, 212, 238, 0.25);
    border-radius: 6px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 4px;
  }

  .group-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(45, 212, 238, 0.15);
    padding-bottom: 4px;
  }

  .group-title {
    font-family: var(--font-heading);
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--text);
    display: flex;
    align-items: center;
    gap: 6px;
    letter-spacing: 0.04em;
  }

  .telemetry-sim-badge {
    font-family: var(--font-mono);
    font-size: 0.56rem;
    color: var(--cyan);
    background: rgba(45, 212, 238, 0.12);
    border: 1px solid rgba(45, 212, 238, 0.3);
    padding: 1px 4px;
    border-radius: 3px;
    letter-spacing: 0.06em;
  }

  .telemetry-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5px;
  }

  .telemetry-item {
    background: rgba(12, 21, 38, 0.85);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 4px 6px;
    display: flex;
    flex-direction: column;
  }

  .t-label {
    font-size: 0.58rem;
    color: var(--text-dim);
    text-transform: uppercase;
  }

  .t-val {
    font-family: var(--font-mono);
    font-size: 0.76rem;
    font-weight: 700;
    color: var(--text);
  }

  .sparkline-wrapper {
    margin-top: 4px;
    background: rgba(12, 21, 38, 0.6);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 6px;
  }

  .sparkline-title {
    font-size: 0.58rem;
    color: var(--text-dim);
    text-transform: uppercase;
    display: block;
    margin-bottom: 2px;
  }

  .edge-assessment-box {
    background: rgba(12, 21, 38, 0.85);
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: 5px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .risk-badge {
    font-family: var(--font-mono);
    font-size: 0.58rem;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 3px;
    letter-spacing: 0.05em;
  }

  .badge-low { background: rgba(45, 212, 238, 0.2); color: var(--cyan); }
  .badge-moderate { background: rgba(251, 191, 36, 0.2); color: var(--command); }
  .badge-high { background: rgba(249, 115, 22, 0.2); color: var(--fire); }
  .badge-critical { background: rgba(239, 68, 68, 0.2); color: var(--critical); animation: pulseCritical 1.2s infinite; }

  .risk-score-bar-container {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .risk-score-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.62rem;
    font-family: var(--font-mono);
    color: var(--text-dim);
  }

  .risk-meter-bg {
    width: 100%;
    height: 5px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 3px;
    overflow: hidden;
  }

  .risk-meter-fill {
    height: 100%;
    transition: width 0.4s ease;
  }

  .risk-meter-fill.level-low { background: var(--cyan); }
  .risk-meter-fill.level-moderate { background: var(--command); }
  .risk-meter-fill.level-high { background: var(--fire); }
  .risk-meter-fill.level-critical { background: var(--critical); }

  .action-recommendation {
    background: rgba(15, 28, 51, 0.9);
    border-left: 2px solid var(--command);
    padding: 4px 6px;
    margin-top: 3px;
    border-radius: 0 3px 3px 0;
  }

  .rec-label {
    font-size: 0.58rem;
    color: var(--command);
    font-weight: 700;
    text-transform: uppercase;
    display: block;
  }

  .rec-text {
    font-size: 0.65rem;
    color: var(--text);
    margin: 1px 0 0 0;
    line-height: 1.3;
  }

  .route-intel-box {
    background: rgba(12, 21, 38, 0.85);
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .route-status-pill {
    font-family: var(--font-mono);
    font-size: 0.56rem;
    font-weight: 700;
    padding: 1px 4px;
    border-radius: 3px;
  }

  .route-status-pill.primary {
    background: rgba(52, 211, 153, 0.15);
    color: var(--resolved);
    border: 1px solid rgba(52, 211, 153, 0.35);
  }

  .route-status-pill.rerouted {
    background: rgba(249, 115, 22, 0.2);
    color: var(--fire);
    border: 1px solid var(--fire);
  }

  .route-status-pill.severed {
    background: rgba(239, 68, 68, 0.2);
    color: var(--critical);
    border: 1px solid var(--critical);
  }

  .route-flow {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    color: var(--text);
    background: rgba(15, 28, 51, 0.6);
    padding: 3px 6px;
    border-radius: 3px;
    border: 1px solid var(--border);
    word-break: break-all;
  }

  .comm-mode-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.58rem;
    font-family: var(--font-mono);
    color: var(--text-dim);
  }

  .system-summary-hint {
    font-size: 0.64rem;
    color: var(--text-dim);
    line-height: 1.35;
    padding: 6px;
    background: rgba(15, 28, 51, 0.5);
    border-radius: 4px;
    border: 1px dashed var(--border);
    margin-top: 4px;
  }

  @keyframes pulseCritical {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  @media (max-width: 760px) {
    .contextual-detail-panel {
      left: 14px;
      right: 14px;
      top: auto;
      bottom: 90px;
      width: calc(100% - 28px);
      max-height: 48vh;
    }
  }
`;
