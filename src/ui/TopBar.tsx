import React from 'react';
import { Activity, ShieldAlert, Users, Radio } from 'lucide-react';

interface TopBarProps {
  totalNodes?: number;
  failedNodeCount?: number;
  activeAlerts?: number;
  teamsDeployed?: number;
  networkHealthPct?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  totalNodes = 7,
  failedNodeCount = 0,
  activeAlerts = 0,
  teamsDeployed = 0,
  networkHealthPct = 100,
}) => {
  const isDegraded = failedNodeCount > 0 || networkHealthPct < 100;

  return (
    <header className="interactive top-bar">
      <div className="top-bar-left">
        <div className={`status-beacon ${isDegraded ? 'degraded' : ''}`}>
          <span className="status-dot"></span>
          <span className="status-pulse"></span>
        </div>
        <div>
          <div className="brand-title">FineLynk // Live Network</div>
          <div className={`brand-subtitle ${isDegraded ? 'degraded-text' : ''}`}>
            {isDegraded
              ? `OFFLINE MESH DEGRADED — ${failedNodeCount} NODE${failedNodeCount > 1 ? 'S' : ''} OFFLINE (SIMULATED TELEMETRY)`
              : `OFFLINE MESH ONLINE — ALL ${totalNodes} NODES OPERATIONAL (SIMULATED TELEMETRY)`}
          </div>
        </div>
      </div>

      <div className="top-bar-right">
        <div
          className={`stat-chip ${networkHealthPct < 100 ? 'degraded-chip' : ''}`}
          title="Network Health: available active links / total network links"
        >
          <Radio size={13} className={`stat-icon ${networkHealthPct < 100 ? 'critical' : 'cyan'}`} />
          <span className="stat-label">Mesh Health</span>
          <span className="stat-value">{networkHealthPct}%</span>
        </div>

        <div className={`stat-chip ${failedNodeCount > 0 ? 'degraded-chip' : ''}`} title="Active online mesh nodes">
          <Activity size={13} className={`stat-icon ${failedNodeCount > 0 ? 'critical' : 'cyan'}`} />
          <span className="stat-label">Nodes Online</span>
          <span className="stat-value">{totalNodes - failedNodeCount}/{totalNodes}</span>
        </div>

        <div className={`stat-chip ${activeAlerts > 0 ? 'active-alert-chip' : ''}`} title="Active unhandled hazards">
          <ShieldAlert size={13} className={`stat-icon ${activeAlerts > 0 ? 'critical' : 'alert'}`} />
          <span className="stat-label">Active Alerts</span>
          <span className={`stat-value ${activeAlerts > 0 ? 'critical-val' : ''}`}>{activeAlerts}</span>
        </div>

        <div className={`stat-chip ${teamsDeployed > 0 ? 'active-teams-chip' : ''}`} title="Deployed rescue teams">
          <Users size={13} className={`stat-icon ${teamsDeployed > 0 ? 'command' : 'teams'}`} />
          <span className="stat-label">Teams Deployed</span>
          <span className={`stat-value ${teamsDeployed > 0 ? 'command-val' : ''}`}>{teamsDeployed}</span>
        </div>
      </div>

      <style>{`
        .top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          background-color: rgba(12, 21, 38, 0.90);
          border-bottom: 1px solid var(--border);
          backdrop-filter: blur(10px);
          width: 100%;
          z-index: 20;
        }

        .top-bar-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .status-beacon {
          position: relative;
          width: 10px;
          height: 10px;
        }

        .status-dot {
          position: absolute;
          width: 10px;
          height: 10px;
          background-color: var(--cyan);
          border-radius: 50%;
        }

        .status-pulse {
          position: absolute;
          width: 10px;
          height: 10px;
          background-color: var(--cyan);
          border-radius: 50%;
          animation: beaconPulse 2.4s cubic-bezier(0.25, 1, 0.5, 1) infinite;
        }

        .status-beacon.degraded .status-dot {
          background-color: var(--fire);
        }

        .status-beacon.degraded .status-pulse {
          background-color: var(--fire);
        }

        .degraded-text {
          color: var(--fire) !important;
          font-weight: 600;
        }

        .stat-chip.degraded-chip {
          border-color: rgba(249, 115, 22, 0.5);
          background-color: rgba(249, 115, 22, 0.1);
        }

        .brand-title {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 1.05rem;
          letter-spacing: 0.04em;
          color: var(--text);
        }

        .brand-subtitle {
          font-size: 0.72rem;
          color: var(--text-dim);
          letter-spacing: 0.02em;
          margin-top: 1px;
        }

        .top-bar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .stat-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: rgba(15, 28, 51, 0.75);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 5px 12px;
          font-size: 0.72rem;
        }

        .stat-icon.cyan { color: var(--cyan); }
        .stat-icon.alert { color: var(--text-dim); }
        .stat-icon.teams { color: var(--text-dim); }
        .stat-icon.critical { color: var(--critical); animation: pulseDot 1.2s infinite; }
        .stat-icon.command { color: var(--command); animation: pulseDot 1.2s infinite; }

        .stat-chip.active-alert-chip {
          border-color: rgba(239, 68, 68, 0.6);
          background-color: rgba(239, 68, 68, 0.12);
        }

        .stat-chip.active-teams-chip {
          border-color: rgba(251, 191, 36, 0.6);
          background-color: rgba(251, 191, 36, 0.12);
        }

        .stat-label {
          color: var(--text-dim);
          text-transform: uppercase;
          font-size: 0.65rem;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-family: var(--font-mono);
          font-weight: 600;
          color: var(--text);
        }

        .stat-value.critical-val {
          color: var(--critical);
        }

        .stat-value.command-val {
          color: var(--command);
        }

        @media (max-width: 760px) {
          .top-bar-right {
            display: none;
          }
          .brand-subtitle {
            display: none;
          }
        }
      `}</style>
    </header>
  );
};
