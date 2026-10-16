import type { SimulationState } from '../simulation/types';
export function insertNeedle(state: SimulationState, id: number): boolean {
  const port = state.repairs.ports.find(p => p.id === id);
  if (!port || port.drillProgress < 1 || port.inserted) return false;
  port.inserted = true;
  return true;
}
export function startInjection(state: SimulationState, id: number): boolean {
  const port = state.repairs.ports.find(p => p.id === id);
  if (!port?.inserted || port.volumeMl >= 180) return false;
  state.repairs.activePortId = id;
  return true;
}
