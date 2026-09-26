import React from 'react';
import { Waves, Flame, Biohazard, Network, Tag, RotateCcw } from 'lucide-react';
import { HazardType } from '../simulation/types';
import { NETWORK_NODES } from '../data/nodes';

interface LeftControlPanelProps {
  showLinks: boolean;
  onToggleLinks: (show: boolean) => void;
  showLabels: boolean;
  onToggleLabels: (show: boolean) => void;
  activeHazards: Record<HazardType, boolean>;
  onTriggerHazard: (type: HazardType) => void;
  onResetSimulation: () => void;
  selectedNodeId?: number | null;
  onSelectNode?: (nodeId: number) => void;
  failedNodeIds?: Set<number>;
  onToggleNodeFailure?: (nodeId: number, failed: boolean) => void;
}

export const LeftControlPanel: React.FC<LeftControlPanelProps> = ({
  showLinks,
  onToggleLinks,
  showLabels,
  onToggleLabels,
  activeHazards,
  onTriggerHazard,
  onResetSimulation,
  selectedNodeId = null,
  onSelectNode,
  failedNodeIds = new Set(),
  onToggleNodeFailure,
}) => {
  return (
    <aside className="interactive tactical-panel left-panel" aria-label="Tactical Command Controls">
      {/* SECTION 1: TRIGGER HAZARD */}
      <div className="panel-header">
        <span>Trigger Hazard</span>
      </div>

      <div className="hazard-buttons" role="group" aria-label="Hazard Triggers">
        <button
          type="button"
          className={`tactical-btn tactical-btn-hazard ${activeHazards.flood ? 'hazard-active flood' : ''}`}
          data-hazard="flood"
          aria-label="Trigger Flood at Node Flood-04"
          aria-pressed={activeHazards.flood}
          disabled={activeHazards.flood}
          onClick={() => onTriggerHazard('flood')}
        >
          <Waves size={15} color="var(--flood)" />
          <span>Flood — Node Flood-04</span>
          {activeHazards.flood && <span className="active-dot flood" />}
        </button>

        <button
          type="button"
          className={`tactical-btn tactical-btn-hazard ${activeHazards.fire ? 'hazard-active fire' : ''}`}
          data-hazard="fire"
          aria-label="Trigger Forest Fire at Node Forest-07"
          aria-pressed={activeHazards.fire}
          disabled={activeHazards.fire}
          onClick={() => onTriggerHazard('fire')}
        >
          <Flame size={15} color="var(--fire)" />
          <span>Forest Fire — Node Forest-07</span>
          {activeHazards.fire && <span className="active-dot fire" />}
        </button>

        <button
          type="button"
          className={`tactical-btn tactical-btn-hazard ${activeHazards.industrial ? 'hazard-active industrial' : ''}`}
          data-hazard="industrial"
          aria-label="Trigger Industrial Leak at Node Indus-02"
          aria-pressed={activeHazards.industrial}
          disabled={activeHazards.industrial}
          onClick={() => onTriggerHazard('industrial')}
        >
          <Biohazard size={15} color="var(--industrial)" />
          <span>Industrial Leak — Node Indus-02</span>
          {activeHazards.industrial && <span className="active-dot industrial" />}
        </button>
      </div>

      <div className="panel-divider" />

      {/* SECTION 2: NETWORK NODES MATRIX (ALL 24 NODES) */}
      <div className="panel-header">
        <span>Nodes ({NETWORK_NODES.length - failedNodeIds.size}/{NETWORK_NODES.length} Online)</span>
      </div>

      <div className="nodes-matrix" role="group" aria-label="Universal Nodes Quick List">
        {NETWORK_NODES.map((n) => {
          const isFailed = failedNodeIds.has(n.id);
          const isSelected = selectedNodeId === n.id;
          return (
            <div
              key={n.id}
              className={`node-matrix-item ${isSelected ? 'selected' : ''} ${isFailed ? 'failed' : ''}`}
              onClick={() => onSelectNode && onSelectNode(n.id)}
              title={`Click to inspect ${n.name}`}
            >
              <div className="node-item-left">
                <span className={`node-dot ${isFailed ? 'failed' : n.isCommandCenter ? 'command' : 'online'}`} />
                <span className="node-item-name">{n.name}</span>
              </div>
              {onToggleNodeFailure && (
                <button
                  type="button"
                  className={`node-fail-mini-btn ${isFailed ? 'btn-restore' : 'btn-fail'}`}
                  title={isFailed ? `Restore ${n.name}` : `Simulate failure on ${n.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleNodeFailure(n.id, !isFailed);
                  }}
                >
                  {isFailed ? 'RESTORE' : 'FAIL'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="panel-divider" />

      {/* SECTION 3: MESH VIEW */}
      <div className="panel-header">
        <span>Mesh View</span>
      </div>

      <div className="mesh-toggles" role="group" aria-label="Mesh Visibility Toggles">
        <div
          className="toggle-row"
          onClick={() => onToggleLinks(!showLinks)}
          role="switch"
          aria-checked={showLinks}
          aria-label="Show mesh links"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              onToggleLinks(!showLinks);
            }
          }}
        >
          <div className="toggle-label-with-icon">
            <Network size={13} />
            <span>Show mesh links</span>
          </div>
          <div className={`toggle-switch ${showLinks ? 'active' : ''}`}>
            <div className="toggle-switch-thumb" />
          </div>
        </div>

        <div
          className="toggle-row"
          onClick={() => onToggleLabels(!showLabels)}
          role="switch"
          aria-checked={showLabels}
          aria-label="Show node labels"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              onToggleLabels(!showLabels);
            }
          }}
        >
          <div className="toggle-label-with-icon">
            <Tag size={13} />
            <span>Show node labels</span>
          </div>
          <div className={`toggle-switch ${showLabels ? 'active' : ''}`}>
            <div className="toggle-switch-thumb" />
          </div>
        </div>
      </div>

      <div className="panel-divider" />

      {/* SECTION 4: RESET SIMULATION */}
      <button
        type="button"
        className="tactical-btn tactical-btn-reset"
        title="Reset simulation state to pristine baseline"
        aria-label="Reset Simulation"
        onClick={onResetSimulation}
      >
        <RotateCcw size={13} />
        <span>Reset Simulation</span>
      </button>

      <style>{`
        .left-panel {
          width: 230px;
          margin-top: 14px;
          margin-left: 18px;
          display: flex;
          flex-direction: column;
        }

        .hazard-buttons {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .tactical-btn.hazard-active {
          opacity: 0.95;
          cursor: not-allowed;
          position: relative;
        }

        .tactical-btn.hazard-active.flood {
          border-color: var(--flood);
          background-color: rgba(59, 130, 246, 0.15);
        }

        .tactical-btn.hazard-active.fire {
          border-color: var(--fire);
          background-color: rgba(249, 115, 22, 0.15);
        }

        .tactical-btn.hazard-active.industrial {
          border-color: var(--industrial);
          background-color: rgba(192, 132, 252, 0.15);
        }

        .active-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          margin-left: auto;
          animation: pulseDot 1.2s infinite ease-in-out;
        }

        .active-dot.flood { background-color: var(--flood); box-shadow: 0 0 6px var(--flood); }
        .active-dot.fire { background-color: var(--fire); box-shadow: 0 0 6px var(--fire); }
        .active-dot.industrial { background-color: var(--industrial); box-shadow: 0 0 6px var(--industrial); }

        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.4; }
        }

        .nodes-matrix {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 220px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .node-matrix-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(15, 28, 51, 0.6);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 0.72rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .node-matrix-item:hover {
          border-color: rgba(45, 212, 238, 0.4);
          background: rgba(15, 28, 51, 0.9);
        }

        .node-matrix-item.selected {
          border-color: var(--cyan);
          background: rgba(45, 212, 238, 0.12);
        }

        .node-matrix-item.failed {
          border-left: 3px solid var(--critical);
        }

        .node-item-left {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .node-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .node-dot.online { background-color: var(--cyan); box-shadow: 0 0 5px var(--cyan); }
        .node-dot.command { background-color: var(--command); box-shadow: 0 0 5px var(--command); }
        .node-dot.failed { background-color: var(--critical); }

        .node-item-name {
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 0.7rem;
        }

        .node-fail-mini-btn {
          font-family: var(--font-mono);
          font-size: 0.6rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 3px;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s ease;
        }

        .node-fail-mini-btn.btn-fail {
          background: rgba(239, 68, 68, 0.15);
          color: var(--critical);
          border-color: rgba(239, 68, 68, 0.35);
        }

        .node-fail-mini-btn.btn-fail:hover {
          background: rgba(239, 68, 68, 0.3);
        }

        .node-fail-mini-btn.btn-restore {
          background: rgba(45, 212, 238, 0.15);
          color: var(--cyan);
          border-color: rgba(45, 212, 238, 0.35);
        }

        .node-fail-mini-btn.btn-restore:hover {
          background: rgba(45, 212, 238, 0.3);
        }

        .mesh-toggles {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .toggle-label-with-icon {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        @media (max-width: 760px) {
          .left-panel {
            width: calc(100% - 32px);
            margin: 16px;
            max-height: 48vh;
            overflow-y: auto;
          }
        }
      `}</style>
    </aside>
  );
};
