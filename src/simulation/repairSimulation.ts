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
    const cell = wall.cells[port.cell];
    const field = port.material === 'epoxy' ? 'epoxy' : port.material === 'acrylate' ? 'gel' : 'pu';
    cell[field] = Math.min(2, cell[field] + amount / 16);
    if (port.volumeMl >= 180) repairs.activePortId = null;
  }
  // Each material moves only along connected crack edges. A wrong hole retains its material locally.
  const diffuse = (field: 'pu' | 'epoxy' | 'gel', rate: number): void => {
    delta.fill(0);
    for (const edge of wall.edges) if (edge.channel) {
      const a = wall.cells[edge.a], b = wall.cells[edge.b];
      const flow = (a[field] - b[field]) * rate * dt;
      delta[edge.a] -= flow;
      delta[edge.b] += flow;
    }
    for (let i = 0; i < wall.cells.length; i++) wall.cells[i][field] = Math.max(0, wall.cells[i][field] + delta[i]);
  };
  diffuse('pu', .9);
  diffuse('epoxy', .54);
  diffuse('gel', 1.05);
  for (let i = 0; i < wall.cells.length; i++) {
    const cell = wall.cells[i];
    const reaction = Math.min(cell.pu, cell.pu * clamp((cell.moisture - 8) / 25) * .22 * dt);
    cell.pu -= reaction;
    cell.expansion = clamp(cell.expansion + reaction * 4);
    // Epoxy cures slowly only in a dry, static crack; it bonds the crack instead of swelling.
    const dryCure = clamp((28 - cell.moisture) / 20);
    const epoxyCure = Math.min(cell.epoxy, cell.epoxy * dryCure * .08 * dt);
    cell.epoxy -= epoxyCure;
    cell.epoxyBond = clamp(cell.epoxyBond + epoxyCure * .78);
    // Hydrophilic gel sets in damp paths. High pressure reduces its sealing contribution.
    const wetCure = clamp((cell.moisture - 12) / 55);
    const pressurePenalty = 1 / (1 + cell.waterPressure * 2.2);
    const gelCure = Math.min(cell.gel, cell.gel * wetCure * pressurePenalty * .12 * dt);
    cell.gel -= gelCure * .28;
    cell.gelSeal = clamp(cell.gelSeal + gelCure * .62);
  }
}
