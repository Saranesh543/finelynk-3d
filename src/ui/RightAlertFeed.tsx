import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';
import { SimulationEventEmitter } from '../simulation/events';
import { SimulationEvent } from '../simulation/types';

export interface AlertLogItem {
  id: string;
  time: string;
  type: 'SYSTEM' | 'ALERT' | 'DISPATCH' | 'RESOLVED' | 'REROUTE';
  message: string;
  riskScore?: number;
  riskLevel?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  priority?: 'MONITORING' | 'ELEVATED' | 'URGENT' | 'EMERGENCY';
  classification?: string;
  recommendedAction?: string;
  isRerouted?: boolean;
}

interface RightAlertFeedProps {
  events?: SimulationEventEmitter;
}

export const RightAlertFeed: React.FC<RightAlertFeedProps> = ({ events }) => {
  const formatCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  };

  const [logs, setLogs] = useState<AlertLogItem[]>([
    {
      id: 'init-1',
      time: formatCurrentTime(),
      type: 'SYSTEM',
      message: 'System online. Edge telemetry monitoring active…',
    },
  ]);

  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!events) return;

    const mapEventType = (type: SimulationEvent['type']): AlertLogItem['type'] => {
      switch (type) {
        case 'HAZARD_DETECTED':
        case 'NO_ROUTE_AVAILABLE':
          return 'ALERT';
        case 'ROUTE_RECONFIGURED':
          return 'REROUTE';
        case 'RESCUE_DISPATCHED':
          return 'DISPATCH';
        case 'HAZARD_RESOLVED':
          return 'RESOLVED';
        case 'NODE_FAILED':
        case 'NODE_RESTORED':
        case 'SIMULATION_RESET':
        default:
          return 'SYSTEM';
      }
    };

    const unsubscribe = events.on('*', (event: SimulationEvent) => {
      if (event.type === 'SIMULATION_RESET') {
        setLogs([
          {
            id: `reset-${Date.now()}`,
            time: event.timestamp,
            type: 'SYSTEM',
            message: 'System online. Edge telemetry monitoring active…',
          },
        ]);
        return;
      }

      // Filter out high-frequency pulse movement ticks
      if (event.type === 'BROADCAST_STARTED' || event.type === 'RESCUE_ARRIVED') {
        return;
      }

      setLogs((prev) => {
        const newItem: AlertLogItem = {
          id: `log-${Date.now()}-${Math.random()}`,
          time: event.timestamp,
          type: mapEventType(event.type),
          message: event.message,
          riskScore: event.riskScore,
          riskLevel: event.riskLevel,
          priority: event.priority,
          classification: event.classification,
          recommendedAction: event.recommendedAction,
          isRerouted: event.isRerouted,
        };
        // Strict cap at 10 items maximum per Section 14
        return [...prev.slice(-9), newItem];
      });
    });

    return () => unsubscribe();
  }, [events]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <aside className="interactive tactical-panel right-panel" aria-label="Tactical Alert Feed">
      <div className="panel-header alert-header">
        <div className="alert-header-left">
          <Terminal size={14} color="var(--cyan)" />
          <span>ALERT FEED</span>
          <span className="sim-telemetry-tag">SIMULATED</span>
        </div>
        <span className="live-pill">REC</span>
      </div>

      <div className="alert-feed-list" role="log" aria-live="polite">
        {logs.map((log) => (
          <div key={log.id} className={`alert-entry type-${log.type.toLowerCase()}`}>
            <div className="entry-meta">
              <span className="entry-time">[{log.time}]</span>
              <span className={`entry-tag tag-${log.type.toLowerCase()}`}>{log.type}</span>
              {log.riskLevel && (
                <span className={`entry-risk-tag tag-${log.riskLevel.toLowerCase()}`}>
                  {log.riskLevel}
                </span>
              )}
            </div>

            <div className="entry-text">{log.message}</div>

            {/* Environmental Intelligence Metadata Card */}
            {(log.riskScore !== undefined || log.classification || log.recommendedAction || log.isRerouted) && (
              <div className="entry-intel-card">
                {log.riskScore !== undefined && (
                  <div className="intel-row">
                    <span className="intel-label">EDGE RISK:</span>
                    <span className="intel-val">{log.riskScore} / 100 ({log.priority})</span>
                  </div>
                )}
                {log.classification && (
                  <div className="intel-row">
                    <span className="intel-label">CLASS:</span>
                    <span className="intel-val">{log.classification}</span>
                  </div>
                )}
                {log.isRerouted && (
                  <div className="intel-reroute-notice">
                    ⚡ REROUTED VIA RESILIENT MESH
                  </div>
                )}
                {log.recommendedAction && (
                  <div className="intel-action-row">
                    <span className="intel-action-label">ACTION:</span>
                    <span className="intel-action-text">{log.recommendedAction}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={listEndRef} />
      </div>

      <style>{`
        .right-panel {
          width: 285px;
          margin-top: 14px;
          margin-right: 18px;
          display: flex;
          flex-direction: column;
          max-height: 520px;
        }

        .alert-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border);
        }

        .alert-header-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sim-telemetry-tag {
          font-family: var(--font-mono);
          font-size: 0.54rem;
          color: var(--cyan);
          background: rgba(45, 212, 238, 0.1);
          border: 1px solid rgba(45, 212, 238, 0.25);
          padding: 1px 4px;
          border-radius: 3px;
          letter-spacing: 0.05em;
        }

        .live-pill {
          font-family: var(--font-mono);
          font-size: 0.6rem;
          font-weight: 700;
          color: var(--critical);
          background-color: rgba(239, 68, 68, 0.15);
          padding: 1px 5px;
          border-radius: 4px;
          border: 1px solid rgba(239, 68, 68, 0.3);
          animation: blink 2s infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .alert-feed-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
          padding-top: 8px;
          flex: 1;
        }

        .alert-entry {
          background-color: rgba(15, 28, 51, 0.65);
          border-left: 3px solid var(--border);
          padding: 6px 8px;
          border-radius: 0 4px 4px 0;
          font-size: 0.72rem;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .alert-entry.type-system { border-left-color: var(--cyan); }
        .alert-entry.type-alert { border-left-color: var(--critical); }
        .alert-entry.type-dispatch { border-left-color: var(--command); }
        .alert-entry.type-resolved { border-left-color: var(--resolved); }
        .alert-entry.type-reroute { border-left-color: var(--fire); background-color: rgba(28, 22, 34, 0.75); }

        .entry-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.63rem;
        }

        .entry-time {
          color: var(--text-dim);
          font-family: var(--font-mono);
        }

        .entry-tag {
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 2px;
          font-size: 0.58rem;
          letter-spacing: 0.03em;
        }

        .tag-system { background: rgba(45, 212, 238, 0.15); color: var(--cyan); }
        .tag-alert { background: rgba(239, 68, 68, 0.15); color: var(--critical); }
        .tag-dispatch { background: rgba(251, 191, 36, 0.15); color: var(--command); }
        .tag-resolved { background: rgba(52, 211, 153, 0.15); color: var(--resolved); }
        .tag-reroute { background: rgba(249, 115, 22, 0.2); color: var(--fire); border: 1px solid rgba(249, 115, 22, 0.4); }

        .entry-risk-tag {
          font-family: var(--font-mono);
          font-weight: 700;
          font-size: 0.55rem;
          padding: 1px 4px;
          border-radius: 2px;
          margin-left: auto;
        }

        .entry-risk-tag.tag-critical { background: rgba(239, 68, 68, 0.25); color: var(--critical); }
        .entry-risk-tag.tag-high { background: rgba(249, 115, 22, 0.25); color: var(--fire); }
        .entry-risk-tag.tag-moderate { background: rgba(251, 191, 36, 0.25); color: var(--command); }
        .entry-risk-tag.tag-low { background: rgba(45, 212, 238, 0.2); color: var(--cyan); }

        .entry-text {
          color: var(--text);
          line-height: 1.35;
          word-break: break-word;
          font-size: 0.7rem;
        }

        .entry-intel-card {
          background: rgba(12, 21, 38, 0.9);
          border: 1px solid rgba(45, 212, 238, 0.18);
          border-radius: 4px;
          padding: 4px 6px;
          margin-top: 3px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 0.63rem;
        }

        .intel-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .intel-label {
          color: var(--text-dim);
          font-weight: 600;
          font-size: 0.58rem;
        }

        .intel-val {
          color: var(--text);
          font-family: var(--font-mono);
          font-weight: 700;
        }

        .intel-reroute-notice {
          color: var(--fire);
          font-family: var(--font-mono);
          font-size: 0.58rem;
          font-weight: 700;
          background: rgba(249, 115, 22, 0.12);
          border: 1px solid rgba(249, 115, 22, 0.3);
          border-radius: 2px;
          padding: 1px 4px;
          margin-top: 2px;
        }

        .intel-action-row {
          display: flex;
          flex-direction: column;
          margin-top: 2px;
          border-top: 1px dashed rgba(28, 44, 71, 0.8);
          padding-top: 2px;
        }

        .intel-action-label {
          color: var(--command);
          font-size: 0.56rem;
          font-weight: 700;
        }

        .intel-action-text {
          color: var(--text);
          font-size: 0.63rem;
          line-height: 1.25;
        }

        @media (max-width: 760px) {
          .right-panel {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
};
