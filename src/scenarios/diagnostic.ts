import { createExteriorCrack } from './exteriorCrack';
import { floorWallJunctions } from '../simulation/floorModel';
import { buildEdges, cellIndex, createWall, pointIndex } from '../simulation/wallModel';
import type { Point, ScenarioId, SimulationState } from '../simulation/types';

type ExtendedScenarioId = Extract<ScenarioId, 'drain' | 'multi' | 'basement'>;

function resetScenario(id: ExtendedScenarioId): SimulationState {
  const state = createExteriorCrack();
  state.scenarioId = id;
  state.wall = createWall();
  state.slab = null;
  state.junctions = [];
  state.floorJunctions = floorWallJunctions(state.wall, state.floor);
  state.waterSources = [];
  state.cracks = [];
  state.pipes = [];
  state.repairs = { ports: [], activePortId: null, pressure: 0, nextId: 1, job: null, waterproofRepaired: false, bypassInstalled: false, drainRepaired: false, surfacePatchCount: 0 };
  state.environment.rain = 0;
  state.environment.wind = 0;
  state.environment.bathroomUse = 0;
  state.environment.drainUse = id === 'drain' || id === 'multi' ? 1 : 0;
  state.environment.groundwaterPressure = id === 'basement' ? .42 : 0;
  return state;
}

function addDrainPipe(state: SimulationState, id: string, startX: number, startY: number): void {
  const wall = state.wall;
  const path: number[] = [];
  const pipeCells: number[] = [];
  for (let y = startY; y >= 2; y--) {
    const crack = cellIndex(wall, startX, y, 3);
    path.push(crack); pipeCells.push(crack); wall.cells[crack].crackLevel = .48;
  }
  for (let x = startX - 1; x >= startX - 6; x--) {
    const crack = cellIndex(wall, x, 2, 3);
    path.push(crack); wall.cells[crack].crackLevel = .48;
  }
  for (let layer = 2; layer >= 0; layer--) {
    const crack = cellIndex(wall, startX - 6, 2, layer);
    path.push(crack); wall.cells[crack].crackLevel = .38;
  }
  state.cracks.push(...path);
  const position = { x: (startX + .5) * wall.width / wall.cols - wall.width / 2, y: (startY + .5) * wall.height / wall.rows };
  const route: Point[] = [
    { x: position.x, y: .45 },
    { x: position.x, y: position.y },
    { x: position.x - 1.35, y: position.y },
  ];
  state.pipes.push({ id, cells: pipeCells, route, leaking: true, isolated: false, exposed: false, pressure: 0, service: 'drain', waterTemperatureC: state.environment.ambientTemperatureC });
  state.waterSources.push({ kind: 'drain', domain: 'wall', pipeId: id, cell: pointIndex(wall, position, 3), position, enabled: true, flow: 0, unsealedFlow: 0, footprint: [], defects: [] });
}

function addBathroomMembraneFailure(state: SimulationState): void {
  const slab = createWall();
  const footprint: number[] = [], defects: number[] = [];
  for (let y = 10; y <= 23; y++) for (let x = 12; x <= 26; x++) {
    footprint.push(cellIndex(slab, x, y, 5));
    if ((x >= 17 && x <= 20 && y >= 13 && y <= 16) || (x >= 12 && x <= 19 && y >= 22)) {
      const membraneCell = cellIndex(slab, x, y, 4);
      slab.cells[membraneCell].waterproofLevel = .04;
      defects.push(membraneCell);
    }
  }
  buildEdges(slab, []);
  state.slab = slab;
  for (let x = 12; x <= 19; x++) state.junctions.push({ slabCell: cellIndex(slab, x, 23, 3), wallCell: cellIndex(state.wall, x, 1, 2), conductance: .8 });
  state.waterSources.push({ kind: 'area', domain: 'slab', cell: footprint[0], footprint, defects, position: { x: -.5, y: 4 }, enabled: true, flow: 0, unsealedFlow: 0 });
}

function addBasementPressurePath(state: SimulationState): void {
  const wall = state.wall;
  const entryX = 10, entryY = 4;
  const entry = cellIndex(wall, entryX, entryY, 4);
  wall.cells[entry].waterproofLevel = .03;
  const path = [entry];
  let x = entryX, y = entryY;
  while (y > 2) {
    y--; const i = cellIndex(wall, x, y, 3); wall.cells[i].crackLevel = .34; path.push(i);
  }
  while (x > 6) {
    x--; const i = cellIndex(wall, x, y, 3); wall.cells[i].crackLevel = .34; path.push(i);
  }
  for (let layer = 2; layer >= 0; layer--) {
    const i = cellIndex(wall, x, y, layer); wall.cells[i].crackLevel = .28; path.push(i);
  }
  state.cracks.push(...path);
  const position = { x: (entryX + .5) * wall.width / wall.cols - wall.width / 2, y: (entryY + .5) * wall.height / wall.rows };
  state.waterSources.push({ kind: 'groundwater', domain: 'wall', cell: entry, position, enabled: true, flow: 0, unsealedFlow: 0, footprint: [], defects: [entry] });
}

export function createDiagnosticScenario(id: ExtendedScenarioId): SimulationState {
  const state = resetScenario(id);
  if (id === 'drain') {
    addDrainPipe(state, 'leaking-drain', 31, 17);
  } else if (id === 'multi') {
    state.environment.bathroomUse = 1;
    addBathroomMembraneFailure(state);
    addDrainPipe(state, 'leaking-drain', 31, 17);
  } else {
    addBasementPressurePath(state);
  }
  buildEdges(state.wall, state.cracks);
  return state;
}
