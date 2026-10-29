import { updateFloorWaterTests } from './floorModel';
import type { SimulationState, WallCell, WallModel } from './types';
import { clamp, conductivity } from './wallModel';

export function permeability(cell: WallCell): number {
  const base = cell.crackLevel > 0 ? 2.8 : cell.material === 'waterproof' ? .0001 + (1 - cell.waterproofLevel) * .8 : conductivity[cell.material];
  return base * cell.permeabilityScale
    * (1 - clamp(cell.expansion * 1.9, 0, .985))
    * (1 - clamp(cell.epoxyBond * .92, 0, .92))
    * (1 - clamp(cell.gelSeal * .82, 0, .82))
    * (1 - clamp(cell.negativeSideSeal * .72, 0, .72))
    * (1 - cell.surfaceCoating * .85);
}
const harmonic = (a: number, b: number): number => 2 * a * b / Math.max(.00001, a + b);
// Permeability is a cell property for the duration of one transport step. Each
// cell participates in several edges, so memoize the derived value in a reusable
// scratch buffer instead of recalculating its material/repair factors per edge.
// The buffer is deliberately external to SimulationState and refreshed every
// tick, after repairs have updated the cells.
const permeabilityBuffers = new WeakMap<WallModel, Float64Array>();
function cellPermeabilities(grid: WallModel): Float64Array {
  let values = permeabilityBuffers.get(grid);
  if (!values || values.length !== grid.cells.length) {
    values = new Float64Array(grid.cells.length);
    permeabilityBuffers.set(grid, values);
  }
  for (let i = 0; i < grid.cells.length; i++) values[i] = permeability(grid.cells[i]);
  return values;
}
type FluxLimitBuffers = { outgoing: Float64Array; incoming: Float64Array; outScale: Float64Array; inScale: Float64Array };
const fluxLimitBuffers = new WeakMap<WallModel, FluxLimitBuffers>();
function getFluxLimitBuffers(grid: WallModel): FluxLimitBuffers {
  let buffers = fluxLimitBuffers.get(grid);
  if (!buffers || buffers.outgoing.length !== grid.cells.length) {
    buffers = {
      outgoing: new Float64Array(grid.cells.length),
      incoming: new Float64Array(grid.cells.length),
      outScale: new Float64Array(grid.cells.length),
      inScale: new Float64Array(grid.cells.length),
    };
    fluxLimitBuffers.set(grid, buffers);
  }
  return buffers;
}
function rawEdgeFlow(cells: WallCell[], cellK: Float64Array, edge: WallModel['edges'][number], gravity: -1 | 0 | 1): number {
  const { a, b, axis, channel, direction } = edge;
  const ca = cells[a], cb = cells[b], k = harmonic(cellK[a], cellK[b]);
  let flow = (ca.moisture - cb.moisture) * k;
  if (channel) {
    const up = direction > 0 ? ca : cb, down = direction > 0 ? cb : ca;
    flow += direction * Math.min(up.moisture - 8, 100 - down.moisture) * k * 2;
  }
  if (gravity && axis === 'z') {
    const gravityDrive = gravity < 0 ? Math.min(cb.moisture - 8, 100 - ca.moisture) : Math.min(ca.moisture - 8, 100 - cb.moisture);
    flow += gravity * gravityDrive * 1.5 * k;
  }
  return flow;
}
export function transportGrid(grid: WallModel, dt: number, delta: Float64Array, defects: Set<number>, gravity: -1 | 0 | 1 = 0, dryingRates?: number[]): { flow: number; reference: number } {
  const { cells, edges, cols, rows } = grid;
  const cellK = cellPermeabilities(grid);
  delta.fill(0);
  let infiltration = 0, reference = 0;
  for (const cell of cells) cell.flowX = cell.flowY = cell.flowZ = 0;
  for (const { a, b, axis, channel, direction } of edges) {
    const ca = cells[a], cb = cells[b];
    const k = harmonic(cellK[a], cellK[b]);
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
      const referenceK = defects.has(b) ? harmonic(cellK[a], .0001 + .96 * .8) : k;
      reference += Math.max(0, (cb.moisture - ca.moisture + gravityDrive) * referenceK);
    }
  }
  // Keep the ordinary path fast, but if a teaching coefficient would push a
  // cell outside its [8, 100] range, limit all edge fluxes together. Limiting
  // outgoing and incoming budgets before applying them avoids water appearing
  // or disappearing through per-cell clamps at extreme permeability values.
  let needsFluxLimit = false;
  for (let i = 0; i < cells.length; i++) {
    const projected = cells[i].moisture + delta[i];
    if (projected < 8 || projected > 100) { needsFluxLimit = true; break; }
  }
  if (needsFluxLimit) {
    const buffers = getFluxLimitBuffers(grid);
    buffers.outgoing.fill(0); buffers.incoming.fill(0);
    for (const edge of edges) {
      const flow = rawEdgeFlow(cells, cellK, edge, gravity), amount = Math.abs(flow * dt);
      if (flow >= 0) { buffers.outgoing[edge.a] += amount; buffers.incoming[edge.b] += amount; }
      else { buffers.outgoing[edge.b] += amount; buffers.incoming[edge.a] += amount; }
    }
    for (let i = 0; i < cells.length; i++) {
      const available = Math.max(0, cells[i].moisture - 8), capacity = Math.max(0, 100 - cells[i].moisture);
      buffers.outScale[i] = buffers.outgoing[i] > 0 ? Math.min(1, available / buffers.outgoing[i]) : 1;
      buffers.inScale[i] = buffers.incoming[i] > 0 ? Math.min(1, capacity / buffers.incoming[i]) : 1;
    }
    delta.fill(0); infiltration = 0;
    for (const cell of cells) cell.flowX = cell.flowY = cell.flowZ = 0;
    for (const edge of edges) {
      const { a, b, axis } = edge;
      const rawFlow = rawEdgeFlow(cells, cellK, edge, gravity);
      const source = rawFlow >= 0 ? a : b, destination = rawFlow >= 0 ? b : a;
      const flow = rawFlow * Math.min(buffers.outScale[source], buffers.inScale[destination]);
      delta[a] -= flow * dt; delta[b] += flow * dt;
      const ca = cells[a], cb = cells[b], key = axis === 'x' ? 'flowX' : axis === 'y' ? 'flowY' : 'flowZ';
      ca[key] += flow; cb[key] += flow;
      if (axis === 'z' && ca.material === 'rc' && cb.material === 'waterproof') infiltration += Math.max(0, -flow);
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
  transportGrid(state.wall, dt, delta, new Set());
  const areaSource = state.waterSources.find(s => s.kind === 'area');
  const slabFlux = state.slab ? transportGrid(state.slab, dt, slabDelta, new Set(areaSource?.defects), -1) : null;
  transportGrid(state.floor, dt, floorDelta, new Set(), 1, [.022, .006, .002]);
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
      const branchTest = state.diagnostics.activeDrainTest;
      const branchSelected = !branchTest || branchTest.pipeId === source.pipeId;
      source.unsealedFlow = source.enabled && branchSelected && state.environment.drainUse > 0 ? state.environment.drainUse : 0;
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
