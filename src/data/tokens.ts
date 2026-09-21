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
    // Territory & hazard specifics
    flood: '#2dd4c8', // Vivid turquoise/cyan
    fire: '#f97316',
    industrial: '#c084fc',
    critical: '#ef4444',
    resolved: '#34d399',
    command: '#fbbf24',
    offline: '#334155',
    // Daytime World & Terrain specifics
    skyZenith: '#2f7fd6',
    skyMiddle: '#6fb3e8',
    skyHorizon: '#cfe8f5',
    fog: '#cfe8f5',
    terrainLowMud: '#8a6b3f',
    terrainGrass: '#4fae52',
    terrainUpperGrass: '#7ac95a',
    terrainRock: '#c98a5e',
    terrainSnow: '#ffffff',
    terrainBase: '#4fae52',
    terrainWire: '#7ac95a',
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
