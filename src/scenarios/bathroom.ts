import { createExteriorCrack } from './exteriorCrack';
import { buildEdges, cellIndex, createWall, pointIndex } from '../simulation/wallModel';
import type { ScenarioId, SimulationState } from '../simulation/types';

export const isCellularScenario = (id: string): id is ScenarioId => ['crack', 'bathroom', 'hotpipe', 'drain', 'multi', 'basement'].includes(id);
export const isBathroomScenario = (id: string): boolean => id === 'bathroom' || id === 'hotpipe';

/** Two observation domains: adjacent-room wall and downstairs ceiling of the same wet floor. */
export function createBathroom(id: 'bathroom' | 'hotpipe'): SimulationState {
  const s = createExteriorCrack();
  s.scenarioId = id;
  s.wall = createWall(); s.cracks = []; s.waterSources = [];
  if (id === 'bathroom') {
    s.slab = createWall();
    const slab = s.slab;
    const footprint: number[] = [], defects: number[] = [];
    // A wet-area boundary covers multiple tiles. Water still has to cross the membrane.
    for (let y = 10; y <= 23; y++) for (let x = 12; x <= 26; x++) {
      footprint.push(cellIndex(slab, x, y, 5));
      if ((x >= 17 && x <= 20 && y >= 13 && y <= 16) || (x >= 12 && x <= 19 && y >= 22)) {
        const index = cellIndex(slab, x, y, 4);
        slab.cells[index].waterproofLevel = .04;
        defects.push(index);
      }
    }
    buildEdges(slab, []);
    // The floor/wall construction junction is shared hydraulically, with local coordinates
    // displayed separately for the adjacent room and the downstairs room.
    for (let x = 12; x <= 19; x++) {
      s.junctions.push({ slabCell: cellIndex(slab, x, 23, 3), wallCell: cellIndex(s.wall, x, 1, 2), conductance: .8 });
    }
    s.waterSources.push({ kind: 'area', domain: 'slab', cell: footprint[0], footprint, defects, position: { x: -.5, y: 4 }, enabled: true, flow: 0, unsealedFlow: 0 });
  } else {
    // Pressurized concealed hot-water pipe bypasses the waterproofing layer completely.
    const route = [{ x: 3.625, y: .625 }, { x: 3.625, y: 3.375 }, { x: .625, y: 3.375 }];
    const pipeCells = [];
    for (let x = 23; x <= 35; x++) pipeCells.push(cellIndex(s.wall, x, 13, 3));
    s.pipes.push({ id: 'old-hot', route, cells: pipeCells, leaking: true, isolated: false, exposed: false, pressure: .4, service: 'supply', waterTemperatureC: 48 });
    const sourcePosition = { x: 1.625, y: 3.375 };
    // Leakage follows a mortar chase downwards, then diffuses to the finish.
    for (let y = 13; y >= 2; y--) {
      const index = cellIndex(s.wall, 27, y, 3);
      s.wall.cells[index].crackLevel = .4; s.cracks.push(index);
    }
    for (let l = 2; l >= 0; l--) {
      const index = cellIndex(s.wall, 27, 2, l);
      s.wall.cells[index].crackLevel = .4; s.cracks.push(index);
    }
    s.waterSources.push({ kind: 'pipe', domain: 'wall', pipeId: 'old-hot', cell: pointIndex(s.wall, sourcePosition, 3), position: sourcePosition, footprint: [], defects: [], enabled: true, flow: 0, unsealedFlow: 0 });
  }
  buildEdges(s.wall, s.cracks);
  return s;
}
