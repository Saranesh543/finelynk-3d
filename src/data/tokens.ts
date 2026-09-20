// FineLynk Centralized Design Tokens
// Strictly adheres to Section 5 of production specification

export const TOKENS = {
  colors: {
    void: '#060a14',
    panel: '#0c1526',
    panel2: '#0f1c33',
    border: '#1c2c47',
    text: '#dbe4f3',
    textDim: '#6b7c99',
    cyan: '#2dd4ee',
    flood: '#3b82f6',
    fire: '#f97316',
    industrial: '#c084fc',
    critical: '#ef4444',
    resolved: '#34d399',
    command: '#fbbf24',
    offline: '#334155',
    // Terrain specifics
    terrainBase: '#081222',
    terrainWire: '#1c3a5c',
  },
  typography: {
    headings: '"Space Grotesk", -apple-system, BlinkMacSystemFont, sans-serif',
    mono: '"JetBrains Mono", monospace',
  },
  dimensions: {
    panelRadius: '8px',
    panelPadding: '14px',
    leftPanelWidth: 230,
    rightPanelWidth: 270,
  }
} as const;

export type NodeStatus = 'safe' | 'critical' | 'resolved' | 'command' | 'offline';

export const STATUS_COLORS: Record<NodeStatus, string> = {
  safe: TOKENS.colors.cyan,
  critical: TOKENS.colors.critical,
  resolved: TOKENS.colors.resolved,
  command: TOKENS.colors.command,
  offline: TOKENS.colors.offline,
};
