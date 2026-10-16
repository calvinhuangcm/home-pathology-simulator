import type { Domain, Point, SimulationState } from '../simulation/types';
import { pointIndex } from '../simulation/wallModel';

export function moistureReading(state: SimulationState, point: Point, mode: 'pin' | 'pinless' = 'pinless', domain: Domain = 'wall'): number {
  // Both probes sample actual cells; the inserted probe reaches the putty layer.
  const grid = state[domain];
  if (!grid) throw new Error('Measurement surface is not modeled');
  return grid.cells[pointIndex(grid, point, mode === 'pin' ? 1 : 0)].moisture;
}
export function moistureStatus(reading: number): string {
  return reading < 20 ? 'NORMAL' : reading < 40 ? 'WARNING' : reading < 65 ? 'HIGH' : 'VERY HIGH';
}
