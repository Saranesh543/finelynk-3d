import React from 'react';

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  unit?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = 'var(--cyan)',
  width = 240,
  height = 42,
  unit = '',
}) => {
  if (!data || data.length < 2) {
    return (
      <div className="sparkline-placeholder" style={{ height }}>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>Gathering telemetry samples…</span>
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const paddingY = 4;
  const plotHeight = height - paddingY * 2;

  // Generate SVG coordinates
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - paddingY - ((val - min) / range) * plotHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;

  const lastPoint = points[points.length - 1].split(',');
  const lastX = parseFloat(lastPoint[0]);
  const lastY = parseFloat(lastPoint[1]);
  const currentValue = data[data.length - 1];

  return (
    <div className="sparkline-container" style={{ width: '100%', position: 'relative' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height, overflow: 'visible' }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`sparkGrad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Subtle grid line */}
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeDasharray="2 3"
          strokeWidth="0.8"
        />

        {/* Gradient Area */}
        <path d={areaD} fill={`url(#sparkGrad-${color})`} />

        {/* Crisp Line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Latest Value Indicator Point */}
        <circle cx={lastX} cy={lastY} r="3" fill={color} />
        <circle cx={lastX} cy={lastY} r="6" fill={color} opacity="0.3" />
      </svg>

      {/* Axis & Min/Max/Current Value footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.62rem',
          color: 'var(--text-dim)',
          fontFamily: 'var(--font-mono)',
          marginTop: '2px',
        }}
      >
        <span>min {min.toFixed(1)}{unit}</span>
        <span style={{ color, fontWeight: 700 }}>
          now {currentValue.toFixed(1)}{unit}
        </span>
        <span>max {max.toFixed(1)}{unit}</span>
      </div>
    </div>
  );
};
