import React from 'react';
import { Waves, Flame, Biohazard, Network, Tag, AlertOctagon, RotateCcw } from 'lucide-react';
import { HazardType } from '../simulation/types';

interface LeftControlPanelProps {
  showLinks: boolean;
  onToggleLinks: (show: boolean) => void;
  showLabels: boolean;
  onToggleLabels: (show: boolean) => void;
  simulateFailure: boolean;
  onToggleSimulateFailure: (simulate: boolean) => void;
  activeHazards: Record<HazardType, boolean>;
  onTriggerHazard: (type: HazardType) => void;
  onResetSimulation: () => void;
}

export const LeftControlPanel: React.FC<LeftControlPanelProps> = ({
  showLinks,
  onToggleLinks,
  showLabels,
  onToggleLabels,
  simulateFailure,
  onToggleSimulateFailure,
  activeHazards,
  onTriggerHazard,
  onResetSimulation,
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

      {/* SECTION 2: MESH VIEW */}
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

        <div
          className="toggle-row"
          onClick={() => onToggleSimulateFailure(!simulateFailure)}
          role="switch"
          aria-checked={simulateFailure}
          aria-label="Simulate node failure on Relay-11"
          tabIndex={0}
          title="Toggle Relay-11 node failure to observe dynamic mesh self-healing"
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              onToggleSimulateFailure(!simulateFailure);
            }
          }}
        >
          <div className="toggle-label-with-icon">
            <AlertOctagon size={13} />
            <span>Simulate node failure</span>
          </div>
          <div className={`toggle-switch ${simulateFailure ? 'active' : ''}`}>
            <div className="toggle-switch-thumb" />
          </div>
        </div>
      </div>

      <div className="panel-divider" />

      {/* SECTION 3: RESET SIMULATION */}
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
