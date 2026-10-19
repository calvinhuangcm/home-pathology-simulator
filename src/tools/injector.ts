import type { SimulationState } from '../simulation/types';
export function insertNeedle(state: SimulationState, id: number): boolean {
  const port = state.repairs.ports.find(p => p.id === id);
  if (!port || port.drillProgress < 1 || port.inserted) return false;
  port.inserted = true;
  return true;
}
export function startInjection(state: SimulationState, id: number, material: 'pu' | 'epoxy' | 'acrylate' = 'pu'): boolean {
  const port = state.repairs.ports.find(p => p.id === id);
  if (!port?.inserted || port.volumeMl >= 180) return false;
  if (port.material && port.material !== material) return false;
  const target = state.wall.cells[port.cell];
  if (material === 'epoxy' && (!port.connected || target.moisture > 24 || target.waterPressure > .25)) return false;
  if (material === 'acrylate' && (!port.connected || target.moisture < 18)) return false;
  port.material = material;
  state.repairs.activePortId = id;
  return true;
}
