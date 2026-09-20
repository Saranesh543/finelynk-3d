import { TOKENS } from './tokens';

export interface HazardZoneData {
  id: 'flood' | 'fire' | 'industrial';
  name: string;
  targetNodeId: number;
  center: [number, number]; // [x, z]
  radius: number;
  color: string;
  opacity: number;
}

export const HAZARD_ZONES: Record<'flood' | 'fire' | 'industrial', HazardZoneData> = {
  flood: {
    id: 'flood',
    name: 'Flood — Node Flood-04',
    targetNodeId: 1,
    center: [-22, 14],
    radius: 11,
    color: TOKENS.colors.flood,
    opacity: 0.10,
  },
  fire: {
    id: 'fire',
    name: 'Forest Fire — Node Forest-07',
    targetNodeId: 2,
    center: [20, -16],
    radius: 11,
    color: TOKENS.colors.fire,
    opacity: 0.08,
  },
  industrial: {
    id: 'industrial',
    name: 'Industrial Leak — Node Indus-02',
    targetNodeId: 3,
    center: [-14, -26],
    radius: 10,
    color: TOKENS.colors.industrial,
    opacity: 0.08,
  },
};

// Deterministic Pseudo-Random Number Generator (LCG)
class DeterministicPRNG {
  private state: number;
  constructor(seed: number) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }
  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }
}

// Generate exactly 22 deterministic trees for Fire zone
export function getDeterministicFireTrees(): Array<{ x: number; z: number; height: number; radius: number }> {
  const prng = new DeterministicPRNG(4242);
  const trees: Array<{ x: number; z: number; height: number; radius: number }> = [];
  const [cx, cz] = HAZARD_ZONES.fire.center;
  const maxR = HAZARD_ZONES.fire.radius * 0.85;

  for (let i = 0; i < 22; i++) {
    const angle = prng.next() * Math.PI * 2;
    const r = Math.sqrt(prng.next()) * maxR;
    const x = cx + Math.cos(angle) * r;
    const z = cz + Math.sin(angle) * r;
    const height = 1.6 + prng.next() * 1.4;
    const radius = 0.5 + prng.next() * 0.4;
    trees.push({ x, z, height, radius });
  }
  return trees;
}

// Generate exactly 9 deterministic buildings for Industrial zone
export function getDeterministicIndustrialBuildings(): Array<{ x: number; z: number; width: number; height: number; depth: number }> {
  const prng = new DeterministicPRNG(9090);
  const buildings: Array<{ x: number; z: number; width: number; height: number; depth: number }> = [];
  const [cx, cz] = HAZARD_ZONES.industrial.center;
  const maxR = HAZARD_ZONES.industrial.radius * 0.82;

  for (let i = 0; i < 9; i++) {
    const angle = prng.next() * Math.PI * 2;
    const r = Math.sqrt(prng.next()) * maxR;
    const x = cx + Math.cos(angle) * r;
    const z = cz + Math.sin(angle) * r;
    const width = 1.4 + prng.next() * 1.6;
    const height = 2.0 + prng.next() * 3.2;
    const depth = 1.4 + prng.next() * 1.6;
    buildings.push({ x, z, width, height, depth });
  }
  return buildings;
}
