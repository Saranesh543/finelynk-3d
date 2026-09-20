import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';
import { SimulationEventEmitter } from '../simulation/events';
import { SimulationEvent } from '../simulation/types';

export interface AlertLogItem {
  id: string;
  time: string;
  type: 'SYSTEM' | 'ALERT' | 'DISPATCH' | 'RESOLVED';
  message: string;
}

interface RightAlertFeedProps {
  events?: SimulationEventEmitter;
}

export const RightAlertFeed: React.FC<RightAlertFeedProps> = ({ events }) => {
  // Format current system time as HH:MM:SS
  const formatCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  };

  // Initial seed entry per Section 14
  const [logs, setLogs] = useState<AlertLogItem[]>([
    {
      id: 'init-1',
      time: formatCurrentTime(),
      type: 'SYSTEM',
      message: 'System online. Awaiting hazard trigger…',
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
      // Handle full simulation reset
      if (event.type === 'SIMULATION_RESET') {
        setLogs([
          {
            id: `reset-${Date.now()}`,
            time: event.timestamp,
            type: 'SYSTEM',
            message: 'System online. Awaiting hazard trigger…',
          },
        ]);
        return;
      }

      // Filter out high-frequency sub-steps to keep feed clean
      if (event.type === 'BROADCAST_STARTED' || event.type === 'RESCUE_ARRIVED') {
        return;
      }

      setLogs((prev) => {
        const newItem: AlertLogItem = {
          id: `log-${Date.now()}-${Math.random()}`,
          time: event.timestamp,
          type: mapEventType(event.type),
          message: event.message,
        };
        // Strict cap at 10 items maximum per Section 14
        return [...prev.slice(-9), newItem];
      });
    });

    return () => unsubscribe();
  }, [events]);

  useEffect(() => {
    // Auto-scroll to latest entry
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <aside className="interactive tactical-panel right-panel">
      <div className="panel-header alert-header">
        <div className="alert-header-left">
          <Terminal size={14} color="var(--cyan)" />
          <span>ALERT FEED</span>
        </div>
        <span className="live-pill">REC</span>
      </div>

      <div className="alert-feed-list" role="log" aria-live="polite">
        {logs.map((log) => (
          <div key={log.id} className={`alert-entry type-${log.type.toLowerCase()}`}>
            <div className="entry-meta">
              <span className="entry-time">[{log.time}]</span>
              <span className={`entry-tag tag-${log.type.toLowerCase()}`}>{log.type}</span>
            </div>
            <div className="entry-text">{log.message}</div>
          </div>
        ))}
        <div ref={listEndRef} />
      </div>

      <style>{`
        .right-panel {
          width: 270px;
          margin-top: 14px;
          margin-right: 18px;
          display: flex;
          flex-direction: column;
          max-height: 480px;
        }

        .alert-header {
          justify-content: space-between;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border);
        }

        .alert-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
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
          gap: 10px;
          overflow-y: auto;
          padding-top: 10px;
          flex: 1;
        }

        .alert-entry {
          background-color: rgba(15, 28, 51, 0.5);
          border-left: 2px solid var(--border);
          padding: 6px 8px;
          border-radius: 0 4px 4px 0;
          font-size: 0.72rem;
        }

        .alert-entry.type-system { border-left-color: var(--cyan); }
        .alert-entry.type-alert { border-left-color: var(--critical); }
        .alert-entry.type-dispatch { border-left-color: var(--command); }
        .alert-entry.type-resolved { border-left-color: var(--resolved); }

        .entry-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.65rem;
          margin-bottom: 3px;
        }

        .entry-time {
          color: var(--text-dim);
        }

        .entry-tag {
          font-weight: 600;
          padding: 1px 4px;
          border-radius: 2px;
          font-size: 0.6rem;
        }

        .tag-system { background: rgba(45, 212, 238, 0.15); color: var(--cyan); }
        .tag-alert { background: rgba(239, 68, 68, 0.15); color: var(--critical); }
        .tag-dispatch { background: rgba(251, 191, 36, 0.15); color: var(--command); }
        .tag-resolved { background: rgba(52, 211, 153, 0.15); color: var(--resolved); }

        .entry-text {
          color: var(--text);
          line-height: 1.35;
          word-break: break-word;
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
