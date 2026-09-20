import { SimulationEvent, SimulationEventType } from './types';

export type SimulationEventListener = (event: SimulationEvent) => void;

export class SimulationEventEmitter {
  private listeners: Map<SimulationEventType | '*', Set<SimulationEventListener>> = new Map();

  public on(type: SimulationEventType | '*', listener: SimulationEventListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    return () => this.off(type, listener);
  }

  public off(type: SimulationEventType | '*', listener: SimulationEventListener): void {
    const set = this.listeners.get(type);
    if (set) {
      set.delete(listener);
    }
  }

  public emit(event: SimulationEvent): void {
    // Specific event listeners
    const specific = this.listeners.get(event.type);
    if (specific) {
      for (const listener of specific) {
        listener(event);
      }
    }

    // Catch-all listeners
    const all = this.listeners.get('*');
    if (all) {
      for (const listener of all) {
        listener(event);
      }
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}
