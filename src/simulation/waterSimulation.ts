import { updateFloorWaterTests } from './floorModel';
import type { SimulationState, WallCell, WallModel } from './types';
import { clamp, conductivity } from './wallModel';

export function permeability(cell: WallCell): number {
  const base = cell.crackLevel > 0 ? 2.8 : cell.material === 'waterproof' ? .0001 + (1 - cell.waterproofLevel) * .8 : conductivity[cell.material];
  return base * cell.permeabilityScale
    * (1 - clamp(cell.expansion * 1.9, 0, .985))
    * (1 - clamp(cell.epoxyBond * .92, 0, .92))
    * (1 - clamp(cell.gelSeal * .82, 0, .82))
    * (1 - cell.surfaceCoating * .85);
}
const harmonic = (a: number, b: number): number => 2 * a * b / Math.max(.00001, a + b);
function transport(grid: WallModel, dt: number, delta: Float64Array, defects: Set<number>, gravity: -1 | 0 | 1 = 0, dryingRates?: number[]): { flow: number; reference: number } {
  const { cells, edges, cols, rows } = grid;
  delta.fill(0);
  let infiltration = 0, reference = 0;
  for (const cell of cells) cell.flowX = cell.flowY = cell.flowZ = 0;
  for (const { a, b, axis, channel, direction } of edges) {
    const ca = cells[a], cb = cells[b];
    const k = harmonic(permeability(ca), permeability(cb));
    let flow = (ca.moisture - cb.moisture) * k;
    if (channel) {
      const up = direction > 0 ? ca : cb, down = direction > 0 ? cb : ca;
      flow += direction * Math.min(up.moisture - 8, 100 - down.moisture) * k * 2;
    }
    const gravityDrive = gravity && axis === 'z' ? (gravity < 0 ? Math.min(cb.moisture - 8, 100 - ca.moisture) : Math.min(ca.moisture - 8, 100 - cb.moisture)) * 1.5 : 0;
    flow += gravity * gravityDrive * k;
    delta[a] -= flow * dt;
    delta[b] += flow * dt;
    const key = axis === 'x' ? 'flowX' : axis === 'y' ? 'flowY' : 'flowZ';
    ca[key] += flow; cb[key] += flow;
    // Actual flux across the membrane into the slab, not water added to the tile surface.
    if (axis === 'z' && ca.material === 'rc' && cb.material === 'waterproof') {
      infiltration += Math.max(0, -flow);
      const referenceK = defects.has(b) ? harmonic(permeability(ca), .0001 + .96 * .8) : k;
      reference += Math.max(0, (cb.moisture - ca.moisture + gravityDrive) * referenceK);
    }
  }
  const evaporation = dryingRates ?? [.018, .012, .009, .003, .002, .004];
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i], layer = Math.floor(i / (cols * rows));
    const drying = (cell.moisture - 8) * evaporation[layer] * (1 - .8 * cell.surfaceCoating) * dt;
    cell.moisture = clamp(cell.moisture + delta[i] - drying, 8, 100);
  }
  return { flow: infiltration / 160, reference: reference / 160 };
}
export function updateWater(state: SimulationState, dt: number, delta: Float64Array, slabDelta: Float64Array = new Float64Array(state.slab?.cells.length ?? 0), floorDelta: Float64Array = new Float64Array(state.floor.cells.length)): void {
  transport(state.wall, dt, delta, new Set());
  const areaSource = state.waterSources.find(s => s.kind === 'area');
  const slabFlux = state.slab ? transport(state.slab, dt, slabDelta, new Set(areaSource?.defects), -1) : null;
  transport(state.floor, dt, floorDelta, new Set(), 1, [.022, .006, .002]);
  let floorInflow = 0;
  for (const junction of state.floorJunctions) {
    const a = state.wall.cells[junction.wallCell], b = state.floor.cells[junction.floorCell];
    const amount = (a.moisture - b.moisture) * junction.conductance * dt;
    a.moisture = clamp(a.moisture - amount, 8, 100); b.moisture = clamp(b.moisture + amount, 8, 100);
    floorInflow += Math.max(0, amount / dt); b.flowY += amount / dt;
  }
  state.metrics.floorInflow = floorInflow + updateFloorWaterTests(state, dt);
  if (state.slab) for (const junction of state.junctions) {
    const a = state.slab.cells[junction.slabCell], b = state.wall.cells[junction.wallCell];
    const flow = (a.moisture - b.moisture) * junction.conductance;
    a.moisture = clamp(a.moisture - flow * dt, 8, 100);
    b.moisture = clamp(b.moisture + flow * dt, 8, 100);
    a.flowY += flow; b.flowY += flow;
  }
  for (const pipe of state.pipes) pipe.pressure = pipe.service === 'supply' && state.environment.pipeValveOpen && !pipe.isolated ? state.environment.pipePressure : 0;
  for (const source of state.waterSources) {
    const grid = state[source.domain];
    if (!grid) continue;
    if (source.kind === 'area') {
      const input = source.enabled ? state.environment.bathroomUse : 0;
      for (const i of source.footprint) {
        const surface = grid.cells[i];
        surface.moisture = Math.min(100, surface.moisture + input * 12 * (1 - surface.surfaceCoating * .85) * dt);
      }
      source.flow = slabFlux?.flow ?? 0;
      source.unsealedFlow = slabFlux?.reference ?? 0;
    } else if (source.kind === 'pipe') {
      const pipe = state.pipes.find(p => p.id === source.pipeId);
      source.unsealedFlow = source.enabled && pipe?.service === 'supply' && state.environment.pipeValveOpen ? state.environment.pipePressure / .4 : 0;
      source.flow = pipe?.leaking && !pipe.isolated ? source.unsealedFlow : 0;
      grid.cells[source.cell].moisture = Math.min(100, grid.cells[source.cell].moisture + source.flow * 160 * dt);
    } else if (source.kind === 'drain') {
      const pipe = state.pipes.find(p => p.id === source.pipeId);
      source.unsealedFlow = source.enabled && state.environment.drainUse > 0 ? state.environment.drainUse : 0;
      source.flow = pipe?.leaking && !pipe.isolated ? source.unsealedFlow * (pipe.service === 'drain' ? 1 : 0) : 0;
      grid.cells[source.cell].moisture = Math.min(100, grid.cells[source.cell].moisture + source.flow * 125 * dt);
    } else if (source.kind === 'groundwater') {
      const barrier = grid.cells[source.cell];
      source.unsealedFlow = source.enabled ? state.environment.groundwaterPressure : 0;
      source.flow = source.unsealedFlow * permeability(barrier) * .86;
      grid.cells[source.cell].moisture = Math.min(100, barrier.moisture + source.flow * 125 * dt);
    } else {
      const resistance = state.cracks.length ? state.cracks.reduce((total, i) => total + 2.8 / permeability(grid.cells[i]), 0) / state.cracks.length : Infinity;
      source.unsealedFlow = source.enabled ? state.environment.rain * (1 + state.environment.wind * .4) : 0;
      source.flow = source.unsealedFlow / resistance;
      grid.cells[source.cell].moisture = Math.min(100, grid.cells[source.cell].moisture + source.flow * 160 * dt);
    }
  }
  const pressure = state.scenarioId === 'crack' ? state.environment.rain * (1 + state.environment.wind * .4)
    : state.scenarioId === 'hotpipe' ? Math.max(0, ...state.pipes.filter(p => p.leaking).map(p => p.pressure))
      : state.scenarioId === 'basement' ? state.environment.groundwaterPressure
        : Math.max(state.environment.bathroomUse, state.environment.drainUse, state.environment.pipeValveOpen ? state.environment.pipePressure : 0) * .1;
  for (const grid of [state.wall, state.slab, state.floor]) if (grid) for (const cell of grid.cells) cell.waterPressure = (cell.moisture - 8) / 92 * pressure;
}
