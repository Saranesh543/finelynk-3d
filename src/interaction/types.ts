import { HazardType } from '../simulation/types';
import { NodeStatus } from '../data/tokens';

export interface InteractiveNodeTarget {
  type: 'node';
  id: number;
  name: string;
  category: string;
  status: NodeStatus;
  elevation: number;
  linksCount: number;
  connectedNodeNames: string[];
  isCommandCenter: boolean;
}

export interface InteractiveHazardTarget {
  type: 'hazard';
  id: HazardType;
  name: string;
  targetNodeId: number;
  targetNodeName: string;
  color: string;
  description: string;
}

export interface InteractiveLandmarkTarget {
  type: 'landmark';
  id: string;
  name: string;
  category: string;
  description: string;
  coordinates: [number, number];
}

export type InteractiveTarget =
  | InteractiveNodeTarget
  | InteractiveHazardTarget
  | InteractiveLandmarkTarget;
