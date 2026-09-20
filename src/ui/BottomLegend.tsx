import React from 'react';

interface LegendItem {
  label: string;
  color: string;
}

const LEGEND_ITEMS: LegendItem[] = [
  { label: 'Command Center', color: 'var(--command)' },
  { label: 'Safe', color: 'var(--cyan)' },
  { label: 'Hazard Detected', color: 'var(--critical)' },
  { label: 'Resolved', color: 'var(--resolved)' },
  { label: 'Offline', color: 'var(--offline)' },
];

export const BottomLegend: React.FC = () => {
  return (
    <div className="interactive bottom-legend-container">
      <div className="bottom-legend-pill">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="legend-entry">
            <span
              className="legend-dot"
              style={{ backgroundColor: item.color, boxShadow: `0 0 6px ${item.color}` }}
            />
            <span className="legend-label">{item.label}</span>
          </div>
        ))}
      </div>

      <style>{`
        .bottom-legend-container {
          position: absolute;
          bottom: 18px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 20;
        }

        .bottom-legend-pill {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 8px 18px;
          background-color: rgba(12, 21, 38, 0.88);
          border: 1px solid var(--border);
          border-radius: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
        }

        .legend-entry {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 0.70rem;
          color: var(--text);
          white-space: nowrap;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .legend-label {
          font-family: var(--font-mono);
          font-weight: 500;
        }

        @media (max-width: 760px) {
          .bottom-legend-container {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};
