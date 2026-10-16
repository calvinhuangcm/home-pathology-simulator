import type { SimulationState } from './types';
import { clamp } from './wallModel';

export function updateRepairs(state: SimulationState, dt: number, delta: Float64Array): void {
  const { repairs, wall } = state;
  for (const port of repairs.ports) port.drillProgress = Math.min(1, port.drillProgress + dt / 2);
  const port = repairs.ports.find(p => p.id === repairs.activePortId);
  const pumping = port?.inserted && port.drillProgress === 1 && port.volumeMl < 180;
  const targetPressure = pumping ? (port.connected ? 1.4 + wall.cells[port.cell].expansion * 1.8 : 3.6) : 0;
  repairs.pressure += (targetPressure - repairs.pressure) * (1 - Math.exp(-dt * .8));
  if (pumping && port) {
    const amount = Math.min(180 - port.volumeMl, dt * 12 * clamp(repairs.pressure / 1.4));
    port.volumeMl += amount;
    wall.cells[port.cell].pu = Math.min(2, wall.cells[port.cell].pu + amount / 16);
    if (port.volumeMl >= 180) repairs.activePortId = null;
  }
  delta.fill(0);
  // Transport only through connected crack edges. A wrong hole retains its material locally.
  for (const edge of wall.edges) if (edge.channel) {
    const a = wall.cells[edge.a], b = wall.cells[edge.b];
    const flow = (a.pu - b.pu) * .9 * dt;
    delta[edge.a] -= flow;
    delta[edge.b] += flow;
  }
  for (let i = 0; i < wall.cells.length; i++) {
    const cell = wall.cells[i];
    cell.pu = Math.max(0, cell.pu + delta[i]);
    const reaction = Math.min(cell.pu, cell.pu * clamp((cell.moisture - 8) / 25) * .22 * dt);
    cell.pu -= reaction;
    cell.expansion = clamp(cell.expansion + reaction * 4);
  }
}
