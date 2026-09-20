import { NodeStatus } from './tokens';

export interface NodeData {
  id: number;
  name: string;
  type: 'command' | 'hazard:flood' | 'hazard:fire' | 'hazard:industrial' | 'relay';
  position: [number, number, number]; // [x, y, z] base position on ground
  status: NodeStatus;
  beamHeight: number;
  coreRadius: number;
  coreElevation: number; // Height at which core and mesh-links sit (~55% of beam)
  isCommandCenter?: boolean;
}

// Unified network floating horizon altitude
// 55% of standard relay beam height (6.4 * 0.55 = 3.52)
export const NETWORK_PLANE_Y = 3.52;

// Exact seven nodes specified in Section 12
export const NETWORK_NODES: NodeData[] = [
  {
    id: 0,
    name: 'COMMAND CENTER',
    type: 'command',
    position: [0, 0, 0],
    status: 'command',
    beamHeight: 11.0,
    coreRadius: 1.15,
    coreElevation: NETWORK_PLANE_Y,
    isCommandCenter: true,
  },
  {
    id: 1,
    name: 'Flood-04',
    type: 'hazard:flood',
    position: [-22, 0, 14],
    status: 'safe',
    beamHeight: 6.4,
    coreRadius: 0.5,
    coreElevation: NETWORK_PLANE_Y,
  },
  {
    id: 2,
    name: 'Forest-07',
    type: 'hazard:fire',
    position: [20, 0, -16],
    status: 'safe',
    beamHeight: 6.4,
    coreRadius: 0.5,
    coreElevation: NETWORK_PLANE_Y,
  },
  {
    id: 3,
    name: 'Indus-02',
    type: 'hazard:industrial',
    position: [-14, 0, -26],
    status: 'safe',
    beamHeight: 6.4,
    coreRadius: 0.5,
    coreElevation: NETWORK_PLANE_Y,
  },
  {
    id: 4,
    name: 'Relay-11',
    type: 'relay',
    position: [10, 0, 12],
    status: 'safe',
    beamHeight: 6.4,
    coreRadius: 0.5,
    coreElevation: NETWORK_PLANE_Y,
  },
  {
    id: 5,
    name: 'Relay-15',
    type: 'relay',
    position: [-8, 0, 22],
    status: 'safe',
    beamHeight: 6.4,
    coreRadius: 0.5,
    coreElevation: NETWORK_PLANE_Y,
  },
  {
    id: 6,
    name: 'Relay-19',
    type: 'relay',
    position: [24, 0, 4],
    status: 'safe',
    beamHeight: 6.4,
    coreRadius: 0.5,
    coreElevation: NETWORK_PLANE_Y,
  },
];
